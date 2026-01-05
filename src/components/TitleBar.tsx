import { MenuBar } from './MenuBar';

interface TitleBarProps {
    onMinimize: () => void;
    onMaximize: () => void;
    onClose: () => void;
    onSave: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onCut: () => void;
    onCopy: () => void;
    onPaste: () => void;
    onSettingsClick: () => void;
    isMaximized: boolean;
}

export const TitleBar = ({ onMinimize, onMaximize, onClose, onSave, onUndo, onRedo, onCut, onCopy, onPaste, onSettingsClick, isMaximized }: TitleBarProps) => {
    return (
        <div className="title-bar">
            <div className="drag-region" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ marginRight: '10px' }}>Glass Note</span>
                <MenuBar
                    onSave={onSave}
                    onUndo={onUndo}
                    onRedo={onRedo}
                    onCut={onCut}
                    onCopy={onCopy}
                    onPaste={onPaste}
                    onMinimize={onMinimize}
                    onMaximize={onMaximize}
                    onClose={onClose}
                />
            </div>
            <div className="window-controls">
                <button onClick={onSettingsClick} className="control-btn settings-btn" title="Settings">&#9881;</button>
                <button onClick={onMinimize} className="control-btn minimize-btn" title="Minimize">&minus;</button>
                <button onClick={onMaximize} className="control-btn maximize-btn" title={isMaximized ? "Restore" : "Maximize"}>
                    {isMaximized ? '❐' : '□'}
                </button>
                <button onClick={onClose} className="control-btn close-btn" title="Close">&times;</button>
            </div>
        </div>
    );
};
