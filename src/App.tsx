import { useState, useEffect } from 'react';
// Force Update Trigger
import './App.css';
import { Scissors, Copy, Clipboard, RotateCcw, RotateCw, Send, Plus } from 'lucide-react';
import { TitleBar } from './components/TitleBar';
import { TabBar } from './components/TabBar';
import { Editor } from './components/Editor';
import { SettingsPanel } from './components/SettingsPanel';
import { useSettings } from './hooks/useSettings';
import { useNotes } from './hooks/useNotes';
import { useWindow } from './hooks/useWindow';
import { useResize } from './hooks/useResize';
import { useSnippets } from './hooks/useSnippets';
import { useHelpers } from './hooks/useHelpers';
import { useToast } from './context/ToastContext';
import { PdfManager } from './components/PdfManager';

function App() {
  const { settings, updateSetting, showSettings, setShowSettings } = useSettings();
  const { notes, activeNoteId, setActiveNoteId, addTab, closeTab, updateNoteContent, updateNoteTitle, saveNote } = useNotes();
  const { isMaximized, toggleMaximize, handleMinimize, handleClose } = useWindow();
  const { handleResizeStart } = useResize();
  const { snippets, addSnippet, removeSnippet } = useSnippets();
  const { hexToRgba } = useHelpers();

  // Local UI State
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, selectedText: string } | null>(null);
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [newShortcutTrigger, setNewShortcutTrigger] = useState('');
  const [shortcutContent, setShortcutContent] = useState('');

  // Check if we are in Settings Window mode
  const isSettingsWindow = window.location.hash === '#settings';

  // Global Keyboard Shortcuts (Tab Navigation & Font Size)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Tab') {
        const currentIndex = notes.findIndex(n => n.id === activeNoteId);
        if (currentIndex === -1) return;
        if (e.shiftKey) {
          const prevIndex = (currentIndex - 1 + notes.length) % notes.length;
          setActiveNoteId(notes[prevIndex].id);
        } else {
          const nextIndex = (currentIndex + 1) % notes.length;
          setActiveNoteId(notes[nextIndex].id);
        }
        e.preventDefault();
      }
      if (e.ctrlKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        addTab();
      }

      // Font Size Shortcuts (Ctrl + / Ctrl -)
      if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        const currentSize = parseInt(settings.fontSize);
        if (currentSize < 64) {
          updateSetting('fontSize', `${currentSize + 2}px`);
        }
      }
      if (e.ctrlKey && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        const currentSize = parseInt(settings.fontSize);
        if (currentSize > 8) {
          updateSetting('fontSize', `${currentSize - 2}px`);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [notes, activeNoteId, setActiveNoteId, addTab, settings.fontSize, updateSetting]);

  // Context Menu Logic
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection();
    const text = selection ? selection.toString() : '';
    // Always show menu on right click, even if no text selected (for paste/undo/redo properties if needed, though typically browser handles input context. 
    // But user requested specific items. Let's show it always at click position)

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      selectedText: text
    });
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const handleCreateSnippetClick = () => {
    if (contextMenu && contextMenu.selectedText) {
      setShortcutContent(contextMenu.selectedText);
      setNewShortcutTrigger('');
      setShowShortcutModal(true);
      setContextMenu(null);
    }
  };

  const handleSaveSnippet = () => {
    if (!newShortcutTrigger.trim()) return;
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(newShortcutTrigger)) {
      alert("Shortcut identifier must start with a letter and contain no spaces/special characters.");
      return;
    }
    const success = addSnippet(newShortcutTrigger, shortcutContent, false);
    if (!success) {
      if (!confirm(`Shortcut '/${newShortcutTrigger}' already exists. Overwrite?`)) return;
      // Overwrite mode
      addSnippet(newShortcutTrigger, shortcutContent, true);
    }
    setShowShortcutModal(false);
  };

  // --- Automation Logic ---



  const { showToast } = useToast();

  const handleEmissao = async (isVerification = false, targetChatId?: string) => {
    // Check for Bridge Settings
    if (!contextMenu || !settings.telegramApiId || !settings.telegramApiHash || !settings.telegramPhoneNumber) {
      showToast("Please ensure API ID, Hash, and Phone are set in Settings > Telegram.", 'error');
      return;
    }

    let text = contextMenu.selectedText.trim();

    // Validation Removed per User Request.
    // Only check if text is empty.
    if (!text) {
      showToast("Please select some text to send.", 'error');
      return;
    }

    // Logic for Verification
    if (isVerification) {
      text = `${text}\n\nVERIFICACAO`;
    }

    setContextMenu(null); // Close menu immediately

    const bridgeUrl = settings.telegramBridgeUrl || 'http://localhost:5000';

    // Determine Chat ID Override
    // If targetChatId is provided (from contacts), use it.
    // If isVerification, use settings.verificationChatId OR Hardcoded Fallback

    // USER REQUEST: Verification Chat ID "directly in code"
    // Replace the string below with your specific group ID if you prefer hardcoding.
    const HARDCODED_VERIFICATION_ID = "-4526089140";

    let chatIdToUse = targetChatId;
    if (isVerification) {
      chatIdToUse = HARDCODED_VERIFICATION_ID || settings.verificationChatId;

      if (!chatIdToUse) {
        showToast("Verification Chat ID not found. Please set it in Settings > Telegram or hardcode it in App.tsx.", 'error');
        return;
      }
    }

    try {
      const response = await fetch(`${bridgeUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_id: settings.telegramApiId,
          api_hash: settings.telegramApiHash,
          phone: settings.telegramPhoneNumber,
          text: text, // Removed AUTOMATION_TRIGGER prefix
          chat_id: chatIdToUse // Sending chat_id if available
        })
      });

      const data = await response.json();
      if (data.success) {
        showToast('Mensagem enviada!', 'success');
      } else {
        showToast('Bridge Error: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(`Failed to connect to Python Bridge at ${bridgeUrl}. Is it running?`, 'error');
    }
  };



  const backdropStyle = {
    backdropFilter: settings.blurEnabled ? `blur(${settings.blurAmount})` : 'none',
    WebkitBackdropFilter: settings.blurEnabled ? `blur(${settings.blurAmount})` : 'none',
    background: settings.backgroundType === 'gradient'
      ? `linear-gradient(${settings.gradientAngle}deg, ${hexToRgba(settings.gradientStart, settings.opacity)}, ${hexToRgba(settings.gradientEnd, settings.opacity)})`
      : hexToRgba(settings.gradientStart, settings.opacity)
  };

  if (isSettingsWindow) {
    return (
      <div className="note-container settings-window" style={{ ...backdropStyle, overflow: 'hidden' }}>
        <div className="title-bar" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="drag-region"><span>Settings</span></div>
          <div className="window-controls">
            <button onClick={handleClose} className="control-btn close-btn" title="Close">&times;</button>
          </div>
        </div>
        <SettingsPanel
          settings={settings}
          updateSetting={updateSetting}
          snippets={snippets}
          deleteSnippet={removeSnippet}
          onEditSnippet={(trigger, content) => {
            // In detached mode, we can't easily open the modal in the main window without IPC.
            // For now, we might need a simple prompt or alert, OR just rely on the main window.
            // Given the architecture, let's just use window.opener if available or a simple prompt fallback?
            // Actually, Settings Window is same React App. We can just use the modal state locally!
            setNewShortcutTrigger(trigger);
            setShortcutContent(content);
            setShowShortcutModal(true);
          }}
          onClose={handleClose}
        />
      </div>
    );
  }

  const activeNote = notes.find(n => n.id === activeNoteId);

  return (
    <div className="note-container" style={backdropStyle}>
      <TitleBar
        onMinimize={handleMinimize}
        onMaximize={toggleMaximize}
        onClose={handleClose}
        onSave={() => saveNote(activeNoteId, undefined)}
        onUndo={() => document.execCommand('undo')}
        onRedo={() => document.execCommand('redo')}
        onCut={() => document.execCommand('cut')}
        onCopy={() => document.execCommand('copy')}
        onPaste={() => document.execCommand('paste')}
        onSettingsClick={() => {
          // @ts-ignore
          if (window.electron && window.electron.openSettings) {
            // @ts-ignore
            window.electron.openSettings();
          } else {
            setShowSettings(!showSettings);
          }
        }}
        isMaximized={isMaximized}
      />

      {!showSettings && (
        <TabBar
          notes={notes}
          activeNoteId={activeNoteId}
          setActiveNoteId={setActiveNoteId}
          addTab={addTab}
          closeTab={closeTab}
          updateNoteTitle={updateNoteTitle}
        />
      )}

      {showSettings ? (
        <SettingsPanel
          settings={settings}
          updateSetting={updateSetting}
          snippets={snippets}
          deleteSnippet={removeSnippet}
          onEditSnippet={(trigger, content) => {
            setNewShortcutTrigger(trigger);
            setShortcutContent(content);
            setShowShortcutModal(true);
          }}
          onClose={() => setShowSettings(false)}
        />
      ) : (
        <Editor
          activeNote={activeNote}
          settings={settings}
          snippets={snippets}
          onContentChange={(content) => updateNoteContent(activeNoteId, content)}
          onSave={() => saveNote(activeNoteId, undefined)}
          onContextMenu={handleContextMenu}
        />
      )}

      {/* Context Menu */}
      {contextMenu && contextMenu.visible && (
        <div className="custom-context-menu"
          style={{
            top: contextMenu.y > window.innerHeight - 300 ? 'auto' : contextMenu.y,
            bottom: contextMenu.y > window.innerHeight - 300 ? window.innerHeight - contextMenu.y : 'auto',
            left: contextMenu.x
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Edit Actions */}
          <div className="context-menu-item" onClick={() => { document.execCommand('undo'); setContextMenu(null); }}>
            <RotateCcw size={14} style={{ marginRight: 8 }} /> Undo
          </div>
          <div className="context-menu-item" onClick={() => { document.execCommand('redo'); setContextMenu(null); }}>
            <RotateCw size={14} style={{ marginRight: 8 }} /> Redo
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }}></div>
          <div className="context-menu-item" onClick={() => { document.execCommand('cut'); setContextMenu(null); }}>
            <Scissors size={14} style={{ marginRight: 8 }} /> Cut
          </div>
          <div className="context-menu-item" onClick={() => { document.execCommand('copy'); setContextMenu(null); }}>
            <Copy size={14} style={{ marginRight: 8 }} /> Copy
          </div>
          <div className="context-menu-item" onClick={() => { document.execCommand('paste'); setContextMenu(null); }}>
            <Clipboard size={14} style={{ marginRight: 8 }} /> Paste
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }}></div>

          {/* Special Actions */}
          {contextMenu.selectedText && (
            <>
              <div className="context-menu-item" onClick={() => handleEmissao(false)}>
                <Send size={14} style={{ marginRight: 8 }} /> Emissão
              </div>

              {/* Verification Option - Always Visible */}
              <div className="context-menu-item" onClick={() => handleEmissao(true)}>
                <Send size={14} style={{ marginRight: 8, color: '#fdd835' }} /> Verificar
              </div>

              {/* Contacts Submenu (Quick & Dirty visualization: just list them if not too many, or separate section) */}
              {(settings.contacts && settings.contacts.length > 0) && (
                <>
                  <div style={{ padding: '4px 8px', fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Enviar para -&gt;</div>
                  {settings.contacts.map(contact => (
                    <div key={contact.id} className="context-menu-item" onClick={() => handleEmissao(false, contact.chatId)}>
                      <Send size={14} style={{ marginRight: 8 }} /> {contact.name}
                    </div>
                  ))}
                </>
              )}

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }}></div>

              <div className="context-menu-item" onClick={handleCreateSnippetClick}>
                <Plus size={14} style={{ marginRight: 8 }} /> Create Shortcut
              </div>
            </>
          )}
        </div>
      )}

      {/* Shortcut Creator Modal */}
      {showShortcutModal && (
        <div className="modal-overlay">
          <div className="shortcut-modal">
            <h3>Create Shortcut</h3>
            <div className="modal-field">
              <label>Selected Text:</label>
              <div className="preview-text">{shortcutContent}</div>
            </div>
            <div className="modal-field">
              <label>Shortcut Trigger (without slash):</label>
              <div className="input-prefix-group">
                <span>/</span>
                <input
                  autoFocus
                  value={newShortcutTrigger}
                  onChange={(e) => setNewShortcutTrigger(e.target.value)}
                  placeholder="e.g. email"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSnippet() }}
                />
              </div>
              <small>Start with a letter, no spaces.</small>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowShortcutModal(false)} className="cancel-btn">Cancel</button>
              <button onClick={handleSaveSnippet} className="save-btn">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Resize Handles */}
      {!isMaximized && (
        <>
          <div className="resize-handle left" onMouseDown={(e) => handleResizeStart(e, 'left')} />
          <div className="resize-handle right" onMouseDown={(e) => handleResizeStart(e, 'right')} />
          <div className="resize-handle bottom" onMouseDown={(e) => handleResizeStart(e, 'bottom')} />
          <div className="resize-handle corner" onMouseDown={(e) => handleResizeStart(e, 'bottom-right')} />
        </>
      )}

      {/* PDF Manager (Only visible in Editor mode) */}
      {!showSettings && <PdfManager />}
    </div>
  );
}

export default App;
