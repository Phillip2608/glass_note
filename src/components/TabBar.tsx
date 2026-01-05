import { useState } from 'react';
import type { Note } from '../types';

interface TabBarProps {
    notes: Note[];
    activeNoteId: string;
    setActiveNoteId: (id: string) => void;
    addTab: () => void;
    closeTab: (e: React.MouseEvent, id: string) => void;
    updateNoteTitle: (id: string, title: string) => void;
}

export const TabBar = ({ notes, activeNoteId, setActiveNoteId, addTab, closeTab, updateNoteTitle }: TabBarProps) => {
    const [editingTitleId, setEditingTitleId] = useState<string | null>(null);

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        if (e.key === 'Enter') {
            setEditingTitleId(null);
        }
    };

    return (
        <div className="tab-bar">
            {notes.map((n) => (
                <div
                    key={n.id}
                    className={`tab ${activeNoteId === n.id ? 'active' : ''}`}
                    onClick={() => setActiveNoteId(n.id)}
                    onMouseDown={(e) => {
                        if (e.button === 1) { // Middle Click
                            e.preventDefault();
                            closeTab(e, n.id);
                        }
                    }}
                    onDoubleClick={() => setEditingTitleId(n.id)}
                >
                    {editingTitleId === n.id ? (
                        <input
                            autoFocus
                            className="tab-input"
                            value={n.title}
                            onChange={(e) => updateNoteTitle(n.id, e.target.value)}
                            onBlur={() => setEditingTitleId(null)}
                            onKeyDown={(e) => handleKeyDown(e)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="tab-title">{n.title}</span>
                    )}
                    <span className="tab-close" onClick={(e) => closeTab(e, n.id)}>&times;</span>
                </div>
            ))}
            <button className="add-tab-btn" onClick={addTab}>+</button>
        </div>
    );
};
