from telethon import TelegramClient, events
from quart import Quart, request, jsonify
from quart_cors import cors
import asyncio
import os
import sys

# Windows Encoding Fix
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# --- CONFIGURATION ---
TARGET_CHAT_ID = -5285453194

app = Quart(__name__)
app = cors(app, allow_origin="*")

# Global Cache
# { "phone": client_instance }
# We use phone number as key during login flow
active_clients = {}
pending_auths = {} # { "phone": { "client": client, "phone_hash": hash } }

async def get_client(api_id, api_hash, phone):
    """
    Get or create a client.
    """
    session_file = f"session_{phone.replace('+', '')}"
    
    if phone in active_clients:
        client = active_clients[phone]
        if not client.is_connected():
            await client.connect()
        return client

    client = TelegramClient(session_file, api_id, api_hash)
    await client.connect()
    active_clients[phone] = client
    return client

# --- AUTH ENDPOINTS ---

@app.route('/login', methods=['POST'])
async def login_request():
    data = await request.get_json()
    api_id = data.get('api_id')
    api_hash = data.get('api_hash')
    phone = data.get('phone')

    if not api_id or not api_hash or not phone:
        return jsonify({"success": False, "error": "Missing api_id, api_hash, or phone"}), 400

    try:
        client = await get_client(api_id, api_hash, phone)
        
        if await client.is_user_authorized():
            return jsonify({"success": True, "status": "authorized", "message": "Already logged in!"})
        
        # Request Code
        sent = await client.send_code_request(phone)
        pending_auths[phone] = { "client": client, "phone_code_hash": sent.phone_code_hash }
        
        return jsonify({"success": True, "status": "code_sent", "message": "OTP Sent to Telegram app."})

    except Exception as e:
        print(f"Login Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/submit_code', methods=['POST'])
async def submit_code():
    data = await request.get_json()
    phone = data.get('phone')
    code = data.get('code')
    # password = data.get('password') # Future: 2FA support

    if not phone or not code:
        return jsonify({"success": False, "error": "Missing phone or code"}), 400

    if phone not in pending_auths:
        return jsonify({"success": False, "error": "No pending login for this phone. Restart login."}), 400

    try:
        auth_data = pending_auths[phone]
        client = auth_data['client']
        phone_hash = auth_data['phone_code_hash']
        
        await client.sign_in(phone=phone, code=code, phone_code_hash=phone_hash)
        
        # Cleanup pending
        del pending_auths[phone]
        
        return jsonify({"success": True, "message": "Successfully Logged In!"})

    except Exception as e:
        print(f"Submit Code Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# --- SEND ENDPOINT ---
@app.route('/send', methods=['POST'])
async def send_message():
    data = await request.get_json()
    api_id = data.get('api_id')
    api_hash = data.get('api_hash')
    phone = data.get('phone') # Now required to identify session
    text = data.get('text')

    if not api_id or not api_hash or not phone or not text:
        return jsonify({"success": False, "error": "Missing params"}), 400

    try:
        client = await get_client(api_id, api_hash, phone)
        
        if not await client.is_user_authorized():
            return jsonify({"success": False, "error": "Not Authorized. Please Login first."}), 401
        
        # Resolve Entity (Fix for "Invalid Peer")
        try:
            # Try to get entity from cache or network
            entity = await client.get_entity(TARGET_CHAT_ID)
        except Exception:
            # If failed (e.g. not in cache), sync dialogs to populate cache
            print("⚠️ Entity not found. Syncing dialogs...")
            await client.get_dialogs()
            try:
                entity = await client.get_entity(TARGET_CHAT_ID)
            except Exception as e:
                # If still fails, maybe the ID is wrong or user is not in group
                print(f"❌ Could not resolve chat: {e}")
                return jsonify({"success": False, "error": f"Could not find Chat {TARGET_CHAT_ID}. Make sure you are a member."}), 400

        await client.send_message(entity, text)
        print(f"✅ Message sent to {TARGET_CHAT_ID} via {phone}")
        
        return jsonify({"success": True})

    except Exception as e:
        print(f"Send Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.before_serving
async def startup():
    print("--------------------------------------------------")
    print("   GLASS NOTE - ENHANCED USER BRIDGE")
    print("--------------------------------------------------")
    print(f"Target Chat ID: {TARGET_CHAT_ID}")
    print("Listening on http://localhost:5000...")

if __name__ == '__main__':
    app.run(port=5000)
