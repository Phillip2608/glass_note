import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastProps {
    toast: ToastMessage;
    onClose: (id: string) => void;
}

export const Toast = ({ toast, onClose }: ToastProps) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(toast.id);
        }, 3000); // Auto close after 3s

        return () => clearTimeout(timer);
    }, [toast.id, onClose]);

    const getIcon = () => {
        switch (toast.type) {
            case 'success': return <CheckCircle size={20} color="#4caf50" />;
            case 'error': return <AlertCircle size={20} color="#f44336" />;
            case 'info': return <Info size={20} color="#2196f3" />;
        }
    };

    const getBorderColor = () => {
        switch (toast.type) {
            case 'success': return 'rgba(76, 175, 80, 0.5)';
            case 'error': return 'rgba(244, 67, 54, 0.5)';
            case 'info': return 'rgba(33, 150, 243, 0.5)';
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(30, 30, 30, 0.85)',
            backdropFilter: 'blur(10px)',
            borderLeft: `4px solid ${getBorderColor()}`,
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            minWidth: '300px',
            maxWidth: '400px',
            color: '#fff',
            marginBottom: '10px',
            animation: 'slideIn 0.3s ease-out',
            pointerEvents: 'auto'
        }}>
            {getIcon()}
            <span style={{ flex: 1, fontSize: '14px', lineHeight: '1.4' }}>{toast.message}</span>
            <button
                onClick={() => onClose(toast.id)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    padding: '4px'
                }}
            >
                <X size={16} />
            </button>
        </div>
    );
};
