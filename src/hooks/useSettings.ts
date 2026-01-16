import { useState, useEffect } from 'react';
import type { Settings } from '../types';

export const useSettings = () => {
    const [showSettings, setShowSettings] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'snippets'>('general');

    const [settings, setSettings] = useState<Settings>(() => {
        const saved = localStorage.getItem('glass-note-settings');
        const defaultSettings: Settings = {
            fontFamily: "'Segoe UI', sans-serif",
            fontSize: '18px',
            color: '#ffffff',
            opacity: '0.4',
            blurEnabled: false,
            blurAmount: '20px',
            backgroundType: 'solid',
            gradientStart: '#282828',
            gradientEnd: '#000000',
            gradientAngle: 135,
            telegramApiId: '',
            telegramApiHash: '',
            telegramPhoneNumber: '',
            telegramBridgeUrl: 'http://localhost:5000',
            accountingData: '',
            verificationChatId: '',
            contacts: []
        };
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    });

    // Sync with localStorage and cross-window updates
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'glass-note-settings' && e.newValue) {
                setSettings((prev) => ({ ...prev, ...JSON.parse(e.newValue!) }));
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const updateSetting = (key: keyof Settings, value: any) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        localStorage.setItem('glass-note-settings', JSON.stringify(newSettings));

        // IPC call for Blur
        if (key === 'blurEnabled') {
            // @ts-ignore
            if (window.electron && window.electron.setBlur) {
                // @ts-ignore
                window.electron.setBlur(value);
            }
        }
    };

    // Initial Sync for Blur
    useEffect(() => {
        // @ts-ignore
        if (window.electron && window.electron.setBlur) {
            // @ts-ignore
            window.electron.setBlur(settings.blurEnabled);
        }
    }, [settings.blurEnabled]);

    return {
        settings,
        updateSetting,
        showSettings,
        setShowSettings,
        activeTab,
        setActiveTab
    };
};
