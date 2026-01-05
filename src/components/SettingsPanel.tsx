import { useState } from 'react';
import type { Settings, Snippet } from '../types';
import { useToast } from '../context/ToastContext';

interface SettingsPanelProps {
    settings: Settings;
    updateSetting: (key: keyof Settings, value: any) => void;
    snippets: Snippet[];
    deleteSnippet: (trigger: string) => void;
    onClose: () => void;
}

export const SettingsPanel = ({ settings, updateSetting, snippets, deleteSnippet, onClose }: SettingsPanelProps) => {
    const [activeTab, setActiveTab] = useState<'general' | 'snippets' | 'automation' | 'data'>('general');


    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [loginStatus, setLoginStatus] = useState<'idle' | 'loading'>('idle');
    const { showToast } = useToast();
    const [statusMessage, setStatusMessage] = useState('');

    const handleConnectTelegram = async () => {
        if (!settings.telegramApiId || !settings.telegramApiHash || !settings.telegramPhoneNumber) {
            showToast("Please fill in API ID, Hash, and Phone Number.", 'error');
            return;
        }

        setLoginStatus('loading');
        setStatusMessage('Requesting login code...');

        const bridgeUrl = settings.telegramBridgeUrl || 'http://localhost:5000';
        try {
            const response = await fetch(`${bridgeUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_id: settings.telegramApiId,
                    api_hash: settings.telegramApiHash,
                    phone: settings.telegramPhoneNumber
                })
            });
            const data = await response.json();

            if (data.success) {
                if (data.status === 'authorized') {
                    setLoginStatus('idle');
                    setStatusMessage('Already Connected! ✅');
                    showToast('Already Connected! ✅', 'success');
                } else {
                    setLoginStatus('idle');
                    setStatusMessage('Code sent to Telegram App 📩');
                    setShowOtpModal(true);
                    showToast('Code sent to Telegram App 📩', 'info');
                }
            } else {
                setLoginStatus('idle');
                setStatusMessage('Error: ' + data.error);
                showToast('Error: ' + data.error, 'error');
            }
        } catch (err) {
            setLoginStatus('idle');
            setStatusMessage('Failed to connect to Bridge.');
            showToast('Failed to connect to Bridge.', 'error');
        }
    };

    const handleSubmitCode = async () => {
        if (!otpCode) return;
        const bridgeUrl = settings.telegramBridgeUrl || 'http://localhost:5000';

        try {
            const response = await fetch(`${bridgeUrl}/submit_code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: settings.telegramPhoneNumber,
                    code: otpCode
                })
            });
            const data = await response.json();

            if (data.success) {
                setShowOtpModal(false);
                setStatusMessage('Successfully Connected! 🎉');
                showToast('Successfully Connected! 🎉', 'success');
            } else {
                showToast('Login Failed: ' + data.error, 'error');
            }
        } catch (err) {
            showToast('Error submitting code.', 'error');
        }
    };


    return (
        <div className="settings-panel">
            {/* Sidebar */}
            <div className="settings-sidebar">
                <div className="sidebar-header">
                    <h2>Settings</h2>
                </div>

                <nav className="sidebar-nav">
                    <button
                        className={`sidebar-btn ${activeTab === 'general' ? 'active' : ''}`}
                        onClick={() => setActiveTab('general')}
                    >
                        General
                    </button>
                    <button
                        className={`sidebar-btn ${activeTab === 'snippets' ? 'active' : ''}`}
                        onClick={() => setActiveTab('snippets')}
                    >
                        Shortcuts
                    </button>
                    <button
                        className={`sidebar-btn ${activeTab === 'automation' ? 'active' : ''}`}
                        onClick={() => setActiveTab('automation')}
                    >
                        Telegram
                    </button>
                    <button
                        className={`sidebar-btn ${activeTab === 'data' ? 'active' : ''}`}
                        onClick={() => setActiveTab('data')}
                    >
                        Data / Contabilidades
                    </button>
                </nav>

                <div className="spacer"></div>
                <button onClick={onClose} className="sidebar-close-btn">Close</button>
            </div>

            {/* Content Area */}
            <div className="settings-content">
                {activeTab === 'general' ? (
                    <div className="general-settings">
                        {/* ... Existing General Settings ... */}
                        <div className="setting-section">
                            <h3>Typography</h3>
                            <div className="setting-row">
                                <label>Font Family</label>
                                <select className="styled-select" value={settings.fontFamily} onChange={(e) => updateSetting('fontFamily', e.target.value)}>
                                    <option value="'Segoe UI', sans-serif">Segoe UI</option>
                                    <option value="'Courier New', monospace">Courier New</option>
                                    <option value="'Roboto', sans-serif">Roboto</option>
                                    <option value="'Inter', sans-serif">Inter</option>
                                    <option value="'Georgia', serif">Georgia</option>
                                </select>
                            </div>
                            <div className="setting-row">
                                <label>Font Size ({parseInt(settings.fontSize)}px)</label>
                                <input type="range" min="12" max="32" className="styled-slider" value={parseInt(settings.fontSize)} onChange={(e) => updateSetting('fontSize', `${e.target.value}px`)} />
                            </div>
                            <div className="setting-row">
                                <label>Text Color</label>
                                <input type="color" value={settings.color} onChange={(e) => updateSetting('color', e.target.value)} />
                            </div>
                        </div>

                        <div className="setting-section">
                            <h3>Appearance</h3>
                            <div className="setting-row">
                                <label>Background Style</label>
                                <div className="button-group">
                                    <button
                                        className={`choice-btn ${settings.backgroundType === 'solid' ? 'active' : ''}`}
                                        onClick={() => updateSetting('backgroundType', 'solid')}
                                    >Solid</button>
                                    <button
                                        className={`choice-btn ${settings.backgroundType === 'gradient' ? 'active' : ''}`}
                                        onClick={() => updateSetting('backgroundType', 'gradient')}
                                    >Gradient</button>
                                </div>
                            </div>
                            <div className="setting-row">
                                <label>{settings.backgroundType === 'gradient' ? 'Start Color' : 'Background Color'}</label>
                                <input type="color" value={settings.gradientStart} onChange={(e) => updateSetting('gradientStart', e.target.value)} />
                            </div>
                            {settings.backgroundType === 'gradient' && (
                                <>
                                    <div className="setting-row">
                                        <label>End Color</label>
                                        <input type="color" value={settings.gradientEnd} onChange={(e) => updateSetting('gradientEnd', e.target.value)} />
                                    </div>
                                    <div className="setting-row">
                                        <label>Angle ({settings.gradientAngle}°)</label>
                                        <input type="range" min="0" max="360" className="styled-slider" value={settings.gradientAngle} onChange={(e) => updateSetting('gradientAngle', parseInt(e.target.value))} />
                                    </div>
                                </>
                            )}
                            <div className="setting-row">
                                <label>Opacity ({Math.round(parseFloat(settings.opacity) * 100)}%)</label>
                                <input type="range" min="0" max="100" className="styled-slider" value={parseFloat(settings.opacity) * 100} onChange={(e) => updateSetting('opacity', (parseInt(e.target.value) / 100).toString())} />
                            </div>
                            <div className="setting-row">
                                <label>Blur Effect</label>
                                <label className="switch">
                                    <input type="checkbox" checked={settings.blurEnabled} onChange={(e) => updateSetting('blurEnabled', e.target.checked)} />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                            {settings.blurEnabled && (
                                <div className="setting-row">
                                    <label>Blur Intensity</label>
                                    <input type="range" min="0" max="50" className="styled-slider" value={parseInt(settings.blurAmount)} onChange={(e) => updateSetting('blurAmount', `${e.target.value}px`)} />
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'snippets' ? (
                    <div className="snippets-settings">
                        <div className="setting-section">
                            <h3>Saved Shortcuts</h3>
                            <div className="snippets-table-container">
                                {snippets.length === 0 ? (
                                    <div className="empty-state">No shortcuts created yet. Select text + right click to create.</div>
                                ) : (
                                    <table className="snippets-table">
                                        <thead>
                                            <tr>
                                                <th>Trigger</th>
                                                <th>Content</th>
                                                <th style={{ width: '40px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {snippets.map(s => (
                                                <tr key={s.trigger}>
                                                    <td className="trigger-cell">/{s.trigger}</td>
                                                    <td className="content-cell" title={s.content}>
                                                        {s.content.length > 50 ? s.content.substring(0, 50) + '...' : s.content}
                                                    </td>
                                                    <td>
                                                        <button onClick={() => deleteSnippet(s.trigger)} className="table-delete-btn" title="Delete">&times;</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'automation' ? (
                    <div className="automation-settings">
                        <div className="setting-section">
                            <h3>Telegram Configuration</h3>
                            <p className="setting-description" style={{ marginBottom: '15px' }}>
                                Connect to the Bridge to send messages.
                            </p>

                            <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                                <label>API ID</label>
                                <input type="text" className="styled-select" style={{ width: '100%' }} value={settings.telegramApiId} onChange={(e) => updateSetting('telegramApiId', e.target.value)} placeholder="12345678" />
                            </div>
                            <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginTop: '10px' }}>
                                <label>API Hash</label>
                                <input type="text" className="styled-select" style={{ width: '100%' }} value={settings.telegramApiHash} onChange={(e) => updateSetting('telegramApiHash', e.target.value)} placeholder="abcdef..." />
                            </div>
                            <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginTop: '10px' }}>
                                <label>Phone Number</label>
                                <input type="text" className="styled-select" style={{ width: '100%' }} value={settings.telegramPhoneNumber} onChange={(e) => updateSetting('telegramPhoneNumber', e.target.value)} placeholder="+55..." />
                            </div>

                            <div className="setting-row" style={{ marginTop: '20px', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: loginStatus === 'success' ? '#4caf50' : '#888' }}>
                                    {statusMessage}
                                </span>
                                <button className="choice-btn active" onClick={handleConnectTelegram} disabled={loginStatus === 'loading'}>
                                    {loginStatus === 'loading' ? 'Checking...' : 'Connect / Login'}
                                </button>
                            </div>


                        </div>
                    </div>
                ) : (
                    <div className="data-settings">
                        <div className="setting-section">
                            <h3>Accounting Data</h3>
                            <p className="setting-description" style={{ marginBottom: '15px' }}>
                                Paste your Excel data here. Format: <b>Name</b> (Tab) <b>Email</b>.
                                <br />We will automatically generate shortcuts like <code>/email_name</code>.
                            </p>
                            <textarea
                                className="styled-select"
                                style={{
                                    width: '100%',
                                    height: '300px',
                                    fontFamily: 'monospace',
                                    fontSize: '12px',
                                    resize: 'none',
                                    whiteSpace: 'pre'
                                }}
                                value={settings.accountingData || ''}
                                onChange={(e) => updateSetting('accountingData', e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Tab') {
                                        e.preventDefault();
                                        const target = e.target as HTMLTextAreaElement;
                                        const start = target.selectionStart;
                                        const end = target.selectionEnd;
                                        const value = target.value;
                                        const newValue = value.substring(0, start) + '\t' + value.substring(end);
                                        updateSetting('accountingData', newValue);
                                        // Need to defer cursor move to wait for React render or use ref?
                                        // Simple hack: setImmediate or setTimeout 0
                                        setTimeout(() => {
                                            target.selectionStart = target.selectionEnd = start + 1;
                                        }, 0);
                                    }
                                }}
                                placeholder={`Example:\nCONSTRUMOURA\tti@construmoura.com.br\nCONTAMAR\tfiscal@contabilidadecontamar.com.br`}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* OTP Modal */}
            {showOtpModal && (
                <div className="modal-overlay">
                    <div className="shortcut-modal" style={{ maxWidth: '300px' }}>
                        <h3>Enter Telegram Code</h3>
                        <p style={{ fontSize: '13px', color: '#ccc', marginBottom: '15px' }}>
                            Please enter the code sent to your Telegram app.
                        </p>
                        <div className="modal-field">
                            <input
                                autoFocus
                                type="text"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                placeholder="12345"
                                style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '2px' }}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitCode() }}
                            />
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => setShowOtpModal(false)} className="cancel-btn">Cancel</button>
                            <button onClick={handleSubmitCode} className="save-btn">Verify</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
