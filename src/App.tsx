import { useState, useEffect, useRef } from 'react'
import './App.css'

interface Note {
  id: string
  content: string
}

function App() {
  // Settings state
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState({
    fontFamily: "'Segoe UI', sans-serif",
    fontSize: '18px',
    color: '#ffffff',
    opacity: '0.4',
    blurEnabled: false,
    blurAmount: '20px'
  })

  // Notes State (Tab System)
  const [notes, setNotes] = useState<Note[]>([{ id: '1', content: '' }])
  const [activeNoteId, setActiveNoteId] = useState<string>('1')

  // Ref for the editable div
  const editorRef = useRef<HTMLDivElement>(null)

  // Load settings and notes
  useEffect(() => {
    const savedSettings = localStorage.getItem('glass-note-settings')
    if (savedSettings) {
      setSettings((prev) => ({ ...prev, ...JSON.parse(savedSettings) }))
    }

    const savedNotes = localStorage.getItem('glass-note-data')
    if (savedNotes) {
      try {
        const parsed = JSON.parse(savedNotes)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotes(parsed)
          setActiveNoteId(parsed[0].id)
        }
      } catch (e) {
        console.error("Failed to load notes", e)
      }
    } else {
      // Migration from old single note
      const oldContent = localStorage.getItem('glass-note-html')
      if (oldContent) {
        setNotes([{ id: '1', content: oldContent }])
      }
    }
  }, [])

  // Save notes whenever they change
  useEffect(() => {
    localStorage.setItem('glass-note-data', JSON.stringify(notes))
  }, [notes])

  // Save settings
  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('glass-note-settings', JSON.stringify(newSettings))

    // IPC call for Blur
    if (key === 'blurEnabled') {
      // @ts-ignore
      if (window.electron && window.electron.setBlur) {
        // @ts-ignore
        window.electron.setBlur(value)
      }
    }
  }

  // Sync initial blur state on load
  useEffect(() => {
    // @ts-ignore
    if (window.electron && window.electron.setBlur) {
      // @ts-ignore
      window.electron.setBlur(settings.blurEnabled)
    }
  }, [settings.blurEnabled])

  // Update content active note content when typing
  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML
      setNotes((prevNotes) =>
        prevNotes.map(n => n.id === activeNoteId ? { ...n, content: newContent } : n)
      )
    }
  }

  // Sync editor content when switching tabs
  useEffect(() => {
    if (editorRef.current) {
      const activeNote = notes.find(n => n.id === activeNoteId)
      if (activeNote) {
        editorRef.current.innerHTML = activeNote.content || ''
      } else {
        // Fallback
        if (notes.length > 0) setActiveNoteId(notes[0].id)
      }
    }
  }, [activeNoteId])

  // Tab Actions
  const addTab = () => {
    const newId = Date.now().toString()
    setNotes([...notes, { id: newId, content: '' }])
    setActiveNoteId(newId)
  }

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const newNotes = notes.filter(n => n.id !== id)
    if (newNotes.length === 0) {
      const newId = Date.now().toString()
      setNotes([{ id: newId, content: '' }])
      setActiveNoteId(newId)
    } else {
      setNotes(newNotes)
      if (activeNoteId === id) {
        setActiveNoteId(newNotes[newNotes.length - 1].id)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); document.execCommand('bold'); break;
        case 'i': e.preventDefault(); document.execCommand('italic'); break;
        case 'u': e.preventDefault(); document.execCommand('underline'); break;
        case 'd': e.preventDefault(); duplicateLine(); break;
      }
    }
    if (e.altKey) {
      if (e.key === 'ArrowUp') { e.preventDefault(); moveLine('up'); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); moveLine('down'); }
    }
  }

  const getBlockNode = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    let node = selection.anchorNode;
    while (node && node.parentElement !== editorRef.current && node !== editorRef.current) {
      node = node.parentElement;
    }
    return node;
  }
  const duplicateLine = () => {
    const block = getBlockNode();
    if (block && editorRef.current?.contains(block)) {
      const clone = block.cloneNode(true);
      if (block.nextSibling) editorRef.current.insertBefore(clone, block.nextSibling);
      else editorRef.current.appendChild(clone);
      handleInput();
    } else {
      document.execCommand('insertHTML', false, window.getSelection()?.toString() || '');
    }
  }
  const moveLine = (direction: 'up' | 'down') => {
    const block = getBlockNode();
    if (block && editorRef.current?.contains(block)) {
      if (direction === 'up' && block.previousSibling) {
        editorRef.current.insertBefore(block, block.previousSibling);
        handleInput();
      } else if (direction === 'down' && block.nextSibling) {
        editorRef.current.insertBefore(block.nextSibling, block);
        handleInput();
      }
    }
  }

  const handleClose = () => window.close()

  const backdropStyle = settings.blurEnabled
    ? {
      backdropFilter: `blur(${settings.blurAmount})`,
      WebkitBackdropFilter: `blur(${settings.blurAmount})`,
      background: `rgba(40, 40, 40, ${settings.opacity})`
    }
    : {
      background: `rgba(40, 40, 40, ${settings.opacity})`
    }

  return (
    <div className="note-container" style={backdropStyle}>
      <div className="title-bar">
        <div className="drag-region">
          <span>Glass Note</span>
        </div>
        <div className="window-controls">
          <button onClick={() => setShowSettings(!showSettings)} className="control-btn settings-btn" title="Settings">&#9881;</button>
          <button onClick={handleClose} className="control-btn close-btn" title="Close">&times;</button>
        </div>
      </div>

      {!showSettings && (
        <div className="tab-bar">
          {notes.map((n, index) => (
            <div
              key={n.id}
              className={`tab ${activeNoteId === n.id ? 'active' : ''}`}
              onClick={() => setActiveNoteId(n.id)}
            >
              <span className="tab-title">Note {index + 1}</span>
              <span className="tab-close" onClick={(e) => closeTab(e, n.id)}>&times;</span>
            </div>
          ))}
          <button className="add-tab-btn" onClick={addTab}>+</button>
        </div>
      )}

      {showSettings && (
        <div className="settings-panel full-cover">
          <div className="settings-header">
            <h2>Preferences</h2>
            <button onClick={() => setShowSettings(false)} className="close-settings-btn">Close</button>
          </div>

          <div className="setting-group">
            <h3>Appearance</h3>
            <div className="setting-item">
              <label>Opacity</label>
              <input
                type="range" min="0" max="100"
                value={parseFloat(settings.opacity) * 100}
                onChange={(e) => updateSetting('opacity', (parseInt(e.target.value) / 100).toString())}
              />
            </div>
            <div className="setting-item">
              <label>Blur Effect</label>
              <input
                type="checkbox"
                checked={settings.blurEnabled}
                onChange={(e) => updateSetting('blurEnabled', e.target.checked)}
              />
            </div>
            {settings.blurEnabled && (
              <div className="setting-item">
                <label>Blur Level</label>
                <input
                  type="range" min="0" max="50"
                  value={parseInt(settings.blurAmount)}
                  onChange={(e) => updateSetting('blurAmount', `${e.target.value}px`)}
                />
              </div>
            )}
          </div>

          <div className="setting-group">
            <h3>Typography</h3>
            <div className="setting-item">
              <label>Font</label>
              <select value={settings.fontFamily} onChange={(e) => updateSetting('fontFamily', e.target.value)}>
                <option value="'Segoe UI', sans-serif">Segoe UI</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="'Roboto', sans-serif">Roboto</option>
              </select>
            </div>
            <div className="setting-item">
              <label>Size</label>
              <input type="range" min="12" max="48" value={parseInt(settings.fontSize)} onChange={(e) => updateSetting('fontSize', `${e.target.value}px`)} />
              <span>{settings.fontSize}</span>
            </div>
            <div className="setting-item">
              <label>Color</label>
              <input type="color" value={settings.color} onChange={(e) => updateSetting('color', e.target.value)} />
            </div>
          </div>

          <div className="shortcuts-guide">
            <h4>Shortcuts</h4>
            <ul>
              <li><b>Ctrl + B/I/U</b>: Format Text</li>
              <li><b>Ctrl + D</b>: Duplicate Line</li>
              <li><b>Alt + &#8593;/&#8595;</b>: Move Line</li>
            </ul>
          </div>
        </div>
      )}

      <div
        ref={editorRef}
        className="note-content editable-div"
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        style={{
          fontFamily: settings.fontFamily,
          fontSize: settings.fontSize,
          color: settings.color,
          display: showSettings ? 'none' : 'block'
        }}
      />
    </div>
  )
}

export default App
