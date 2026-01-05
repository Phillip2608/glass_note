import { useState, useEffect } from 'react';

interface MenuBarProps {
    onSave: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onCut: () => void;
    onCopy: () => void;
    onPaste: () => void;
    onMinimize: () => void;
    onMaximize: () => void;
    onClose: () => void;
}

export const MenuBar = ({ onSave, onUndo, onRedo, onCut, onCopy, onPaste, onMinimize, onMaximize, onClose }: MenuBarProps) => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [isCompactMenu, setIsCompactMenu] = useState(window.innerWidth < 480);

    useEffect(() => {
        const handleResize = () => setIsCompactMenu(window.innerWidth < 480);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.menu-bar-item')) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleMenu = (menuName: string) => {
        setActiveMenu(activeMenu === menuName ? null : menuName);
    };

    return (
        <div className="menu-bar" style={{ display: 'flex', gap: '5px', ...({ WebkitAppRegion: 'no-drag' } as any) }}>
            {/* Persistent Undo/Redo Buttons (Always Visible) */}
            <button onClick={onUndo} title="Undo (Ctrl+Z)" style={{ background: 'transparent', border: 'none', color: '#ddd', fontSize: '15px', cursor: 'pointer', opacity: 0.9, padding: '0 4px' }}>&#8617;</button>
            <button onClick={onRedo} title="Redo (Ctrl+Y)" style={{ background: 'transparent', border: 'none', color: '#ddd', fontSize: '15px', cursor: 'pointer', opacity: 0.9, padding: '0 4px' }}>&#8618;</button>

            <div className="menu-separator" style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.2)', margin: 'auto 5px' }}></div>

            {!isCompactMenu ? (
                <>
                    <div className="menu-bar-item" style={{ position: 'relative' }}>
                        <button onClick={() => toggleMenu('file')} style={{ background: 'transparent', border: 'none', color: '#ddd', fontSize: '13px', cursor: 'pointer', opacity: 0.8 }}>File</button>
                        {activeMenu === 'file' && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, background: '#282828', border: '1px solid #444', borderRadius: '4px', padding: '5px 0', minWidth: '120px', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.5)' }}>
                                <div className="menu-item" onClick={() => { onSave(); setActiveMenu(null); }} style={{ padding: '5px 15px', cursor: 'pointer', fontSize: '13px' }}>Save</div>
                                <div className="menu-item" onClick={() => { onClose(); setActiveMenu(null); }} style={{ padding: '5px 15px', cursor: 'pointer', fontSize: '13px', borderTop: '1px solid #333' }}>Exit</div>
                            </div>
                        )}
                    </div>

                    <div className="menu-bar-item" style={{ position: 'relative' }}>
                        <button onClick={() => toggleMenu('edit')} style={{ background: 'transparent', border: 'none', color: '#ddd', fontSize: '13px', cursor: 'pointer', opacity: 0.8 }}>Edit</button>
                        {activeMenu === 'edit' && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, background: '#282828', border: '1px solid #444', borderRadius: '4px', padding: '5px 0', minWidth: '120px', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.5)' }}>
                                <div className="menu-item" onClick={() => { onUndo(); setActiveMenu(null); }} style={{ padding: '5px 15px', cursor: 'pointer', fontSize: '13px' }}>Undo <span style={{ opacity: 0.5, fontSize: '10px', float: 'right' }}>Ctrl+Z</span></div>
                                <div className="menu-item" onClick={() => { onRedo(); setActiveMenu(null); }} style={{ padding: '5px 15px', cursor: 'pointer', fontSize: '13px' }}>Redo <span style={{ opacity: 0.5, fontSize: '10px', float: 'right' }}>Ctrl+Y</span></div>
                                <div style={{ borderTop: '1px solid #444', margin: '4px 0' }}></div>
                                <div className="menu-item" onClick={() => { onCut(); setActiveMenu(null); }} style={{ padding: '5px 15px', cursor: 'pointer', fontSize: '13px' }}>Cut</div>
                                <div className="menu-item" onClick={() => { onCopy(); setActiveMenu(null); }} style={{ padding: '5px 15px', cursor: 'pointer', fontSize: '13px' }}>Copy</div>
                                <div className="menu-item" onClick={() => { onPaste(); setActiveMenu(null); }} style={{ padding: '5px 15px', cursor: 'pointer', fontSize: '13px' }}>Paste</div>
                            </div>
                        )}
                    </div>

                    <div className="menu-bar-item" style={{ position: 'relative' }}>
                        <button onClick={() => toggleMenu('window')} style={{ background: 'transparent', border: 'none', color: '#ddd', fontSize: '13px', cursor: 'pointer', opacity: 0.8 }}>Window</button>
                        {activeMenu === 'window' && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, background: '#282828', border: '1px solid #444', borderRadius: '4px', padding: '5px 0', minWidth: '120px', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.5)' }}>
                                <div className="menu-item" onClick={() => { onMinimize(); setActiveMenu(null); }} style={{ padding: '5px 15px', cursor: 'pointer', fontSize: '13px' }}>Minimize</div>
                                <div className="menu-item" onClick={() => { onMaximize(); setActiveMenu(null); }} style={{ padding: '5px 15px', cursor: 'pointer', fontSize: '13px' }}>Maximize/Restore</div>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="menu-bar-item" style={{ position: 'relative' }}>
                    <button onClick={() => toggleMenu('overflow')} style={{ background: 'transparent', border: 'none', color: '#ddd', fontSize: '18px', cursor: 'pointer', opacity: 0.8, lineHeight: '10px', marginTop: '-4px' }} title="Menu">&#8942;</button>
                    {activeMenu === 'overflow' && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, background: '#282828', border: '1px solid #444', borderRadius: '4px', padding: '5px 0', minWidth: '140px', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.5)' }}>
                            <div className="menu-item" onClick={() => { onSave(); setActiveMenu(null); }} style={{ padding: '8px 15px', cursor: 'pointer', fontSize: '13px', color: '#fff' }}>Save</div>

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }}></div>

                            <div className="menu-item" onClick={() => { onUndo(); setActiveMenu(null); }} style={{ padding: '8px 15px', cursor: 'pointer', fontSize: '13px', color: '#ddd' }}>Undo</div>
                            <div className="menu-item" onClick={() => { onRedo(); setActiveMenu(null); }} style={{ padding: '8px 15px', cursor: 'pointer', fontSize: '13px', color: '#ddd' }}>Redo</div>
                            <div className="menu-item" onClick={() => { onCut(); setActiveMenu(null); }} style={{ padding: '8px 15px', cursor: 'pointer', fontSize: '13px', color: '#ddd' }}>Cut</div>
                            <div className="menu-item" onClick={() => { onCopy(); setActiveMenu(null); }} style={{ padding: '8px 15px', cursor: 'pointer', fontSize: '13px', color: '#ddd' }}>Copy</div>
                            <div className="menu-item" onClick={() => { onPaste(); setActiveMenu(null); }} style={{ padding: '8px 15px', cursor: 'pointer', fontSize: '13px', color: '#ddd' }}>Paste</div>

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }}></div>

                            <div className="menu-item" onClick={() => { onMinimize(); setActiveMenu(null); }} style={{ padding: '8px 15px', cursor: 'pointer', fontSize: '13px', color: '#ddd' }}>Minimize</div>
                            <div className="menu-item" onClick={() => { onMaximize(); setActiveMenu(null); }} style={{ padding: '8px 15px', cursor: 'pointer', fontSize: '13px', color: '#ddd' }}>Maximize</div>

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }}></div>

                            <div className="menu-item" onClick={() => { onClose(); setActiveMenu(null); }} style={{ padding: '8px 15px', cursor: 'pointer', fontSize: '13px', color: '#ff6b6b' }}>Exit</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
