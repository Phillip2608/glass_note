import { useState, useEffect } from 'react';
import type { Note } from '../types';

export const useNotes = () => {
    const [notes, setNotes] = useState<Note[]>(() => {
        const saved = localStorage.getItem('glass-note-data');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (e) { console.error(e); }
        }
        const oldContent = localStorage.getItem('glass-note-html');
        return oldContent ? [{ id: '1', title: 'Note 1', content: oldContent }] : [{ id: '1', title: 'Note 1', content: '' }];
    });

    const [activeNoteId, setActiveNoteId] = useState<string>(() => {
        const saved = localStorage.getItem('glass-note-data');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
            } catch (e) { }
        }
        return '1';
    });

    // Sync Storage
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'glass-note-data' && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue!);
                    setNotes(parsed);
                } catch (e) { }
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    useEffect(() => {
        localStorage.setItem('glass-note-data', JSON.stringify(notes));
    }, [notes]);

    const addTab = () => {
        const newId = Date.now().toString();
        setNotes([...notes, { id: newId, title: `Note ${notes.length + 1}`, content: '' }]);
        setActiveNoteId(newId);
    };

    const closeTab = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        // Safety Check
        const noteToClose = notes.find(n => n.id === id);
        if (noteToClose && noteToClose.content && noteToClose.content.trim() !== '' && noteToClose.content !== '<br>') {
            if (!confirm(`Are you sure you want to close "${noteToClose.title}"? Unsaved changes will be lost.`)) {
                return;
            }
        }

        const newNotes = notes.filter(n => n.id !== id);
        if (newNotes.length === 0) {
            const newId = Date.now().toString();
            setNotes([{ id: newId, title: 'Note 1', content: '' }]);
            setActiveNoteId(newId);
        } else {
            setNotes(newNotes);
            if (activeNoteId === id) {
                setActiveNoteId(newNotes[newNotes.length - 1].id);
            }
        }
    };

    const updateNoteContent = (id: string, content: string) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, content } : n));
    };

    const updateNoteTitle = (id: string, title: string) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, title } : n));
    }

    const saveNote = async (id: string, content: string | undefined) => {
        const activeNote = notes.find(n => n.id === id);
        if (activeNote) {
            const noteContent = content || activeNote.content || '';
            // @ts-ignore
            if (window.electron && window.electron.saveNote) {
                // @ts-ignore
                await window.electron.saveNote({ title: activeNote.title, content: noteContent });
            }
        }
    };

    return {
        notes,
        activeNoteId,
        setActiveNoteId,
        addTab,
        closeTab,
        updateNoteContent,
        updateNoteTitle,
        saveNote
    };
};
