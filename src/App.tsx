import { useState, useEffect, useRef } from 'react'
import './App.css'

interface Note {
  id: string
  title: string
  content: string
}

interface Snippet {
  trigger: string
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
    blurAmount: '20px',
    backgroundType: 'solid', // 'solid' | 'gradient'
    gradientStart: '#282828',
    gradientEnd: '#000000',
    gradientAngle: 135
  })

  // Window State
  const [isMaximized, setIsMaximized] = useState(false)

  // Notes State (Tab System)
  const [notes, setNotes] = useState<Note[]>([{ id: '1', title: 'Note 1', content: '' }])
  const [activeNoteId, setActiveNoteId] = useState<string>('1')
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)

  // Snippets/Shortcuts State
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, selectedText: string } | null>(null)
  const [showShortcutModal, setShowShortcutModal] = useState(false)
  const [newShortcutTrigger, setNewShortcutTrigger] = useState('')
  const [shortcutContent, setShortcutContent] = useState('')
  const [suggestion, setSuggestion] = useState<{ visible: boolean, x: number, y: number, match: Snippet, partial: string } | null>(null)

  // Ref for the editable div
  const editorRef = useRef<HTMLDivElement>(null)

  // Load settings and notes
  useEffect(() => {
    const savedSettings = localStorage.getItem('glass-note-settings')
    if (savedSettings) {
      setSettings((prev) => ({ ...prev, ...JSON.parse(savedSettings) }))
    }

    const savedSnippets = localStorage.getItem('glass-note-snippets')
    if (savedSnippets) {
      try {
        setSnippets(JSON.parse(savedSnippets))
      } catch (e) {
        console.error("Failed to load snippets", e)
      }
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
        setNotes([{ id: '1', title: 'Note 1', content: oldContent }])
      }
    }
  }, [])

  // Save notes whenever they change
  useEffect(() => {
    localStorage.setItem('glass-note-data', JSON.stringify(notes))
  }, [notes])

  useEffect(() => {
    localStorage.setItem('glass-note-snippets', JSON.stringify(snippets))
  }, [snippets])

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

  // Window State Listeners
  useEffect(() => {
    // @ts-ignore
    if (window.electron) {
      // Checked initial state
      // @ts-ignore
      window.electron.isMaximized().then(setIsMaximized)

      // Listen for events
      // @ts-ignore
      window.electron.onMaximized(() => setIsMaximized(true))
      // @ts-ignore
      window.electron.onUnmaximized(() => setIsMaximized(false))
    }
  }, [])

  const toggleMaximize = () => {
    // @ts-ignore
    if (window.electron) {
      if (isMaximized) {
        // @ts-ignore
        window.electron.unmaximize()
      } else {
        // @ts-ignore
        window.electron.maximize()
      }
    }
  }

  // Global Keyboard Shortcuts (Tab Navigation)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Prev/Next Tab: Ctrl + Arrows
      if (e.ctrlKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const currentIndex = notes.findIndex(n => n.id === activeNoteId);
        if (currentIndex === -1) return;

        if (e.key === 'ArrowRight') {
          const nextIndex = (currentIndex + 1) % notes.length;
          setActiveNoteId(notes[nextIndex].id);
        } else {
          const prevIndex = (currentIndex - 1 + notes.length) % notes.length;
          setActiveNoteId(notes[prevIndex].id);
        }
      }

      // New Tab: Ctrl + N
      if (e.ctrlKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault(); // Prevent new window in some browsers
        addTab();
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [notes, activeNoteId])

  const handleClose = () => {
    // @ts-ignore
    if (window.electron) window.electron.close()
  }

  // Update content active note content when typing
  const updateSuggestion = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current) {
      setSuggestion(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      const textBeforeCaret = node.textContent.slice(0, range.startOffset);
      const match = textBeforeCaret.match(/\/([a-zA-Z0-9]+)$/); // Match partial trigger

      if (match) {
        const partial = match[1];
        // Find matching snippet
        const found = snippets.find(s => s.trigger.startsWith(partial));

        if (found) {
          const rect = range.getBoundingClientRect();
          setSuggestion({
            visible: true,
            x: rect.left,
            y: rect.bottom + window.scrollY,
            match: found,
            partial: partial
          });
          return;
        }
      }
    }
    setSuggestion(null);
  }

  // Handle caret moves (click, arrow keys) to hide or update suggestion
  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      updateSuggestion();
    }
  }

  const completeSuggestion = () => {
    if (!suggestion) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      const textNode = node as Text;
      const partialLen = suggestion.partial.length + 1; // +1 for slash
      const startDel = range.startOffset - partialLen;

      if (startDel >= 0) {
        const newText = textNode.textContent!.slice(0, startDel) + suggestion.match.content + textNode.textContent!.slice(range.startOffset);
        textNode.textContent = newText;

        const newCursorPos = startDel + suggestion.match.content.length;
        const newRange = document.createRange();
        newRange.setStart(textNode, newCursorPos);
        newRange.setEnd(textNode, newCursorPos);
        selection.removeAllRanges();
        selection.addRange(newRange);

        setSuggestion(null);
        handleInput();
      }
    }
  }

  const handleInput = () => {
    if (editorRef.current) {
      updateSuggestion(); // Check for suggestions on input

      const newContent = editorRef.current.innerHTML
      setNotes((prevNotes) =>
        prevNotes.map(n => n.id === activeNoteId ? { ...n, content: newContent } : n)
      )
    }
  }

  const checkSnippetExpansion = (e: React.KeyboardEvent) => {
    // Trigger on Space or Enter
    if ((e.key === ' ' || e.key === 'Enter') && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const node = range.startContainer;

      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const textBeforeCaret = node.textContent.slice(0, range.startOffset);
        // Regex: match strict slash commands at the end of the string e.g., "Hello /test"
        // Capture group 1 is the trigger name
        const match = textBeforeCaret.match(/\/([a-zA-Z][a-zA-Z0-9]*)$/);

        if (match) {
          const trigger = match[1];
          const snippet = snippets.find(s => s.trigger === trigger);

          if (snippet) {
            e.preventDefault(); // Stop the space/enter

            // Delete the trigger text including slash
            const triggerLength = match[0].length;
            const textNode = node as Text;

            // We need to remove 'triggerLength' characters before the caret
            const startDel = range.startOffset - triggerLength;

            // Manipulate text node directly
            const newText = textNode.textContent!.slice(0, startDel) + snippet.content + textNode.textContent!.slice(range.startOffset);
            textNode.textContent = newText;

            // Restore cursor position after the inserted snippet
            const newCursorPos = startDel + snippet.content.length;

            // Create new range to set cursor
            const newRange = document.createRange();
            newRange.setStart(textNode, newCursorPos);
            newRange.setEnd(textNode, newCursorPos);
            selection.removeAllRanges();
            selection.addRange(newRange);

            handleInput(); // Persist changes
          }
        }
      }
    }
  }

  // Context Menu Logic
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection();
    const text = selection ? selection.toString() : '';

    if (text.trim().length > 0) {
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        selectedText: text
      })
    } else {
      setContextMenu(null)
    }
  }

  // Close context menu on click elsewhere
  useEffect(() => {
    const closeMenu = () => setContextMenu(null)
    document.addEventListener('click', closeMenu)
    return () => document.removeEventListener('click', closeMenu)
  }, [])

  const handleCreateSnippetClick = () => {
    if (contextMenu) {
      setShortcutContent(contextMenu.selectedText)
      setNewShortcutTrigger('')
      setShowShortcutModal(true)
      setContextMenu(null) // Hide menu
    }
  }

  const saveSnippet = () => {
    if (!newShortcutTrigger.trim()) return;
    // Validate: No spaces, starts with letter (regex check or simple check)
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(newShortcutTrigger)) {
      alert("Shortcut identifier must start with a letter and contain no spaces/special characters.");
      return;
    }

    // Check duplicate
    if (snippets.some(s => s.trigger === newShortcutTrigger)) {
      if (!confirm(`Shortcut '/${newShortcutTrigger}' already exists. Overwrite?`)) return;
    }

    const newSnippets = snippets.filter(s => s.trigger !== newShortcutTrigger);
    setSnippets([...newSnippets, { trigger: newShortcutTrigger, content: shortcutContent }]);
    setShowShortcutModal(false);
  }

  const deleteSnippet = (trigger: string) => {
    if (confirm(`Remove shortcut '/${trigger}'?`)) {
      setSnippets(snippets.filter(s => s.trigger !== trigger))
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
    setNotes([...notes, { id: newId, title: `Note ${notes.length + 1}`, content: '' }])
    setActiveNoteId(newId)
  }

  const handleRename = (id: string, newTitle: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, title: newTitle } : n))
  }

  const saveNote = async () => {
    const activeNote = notes.find(n => n.id === activeNoteId)
    if (activeNote) {
      // @ts-ignore
      if (window.electron && window.electron.saveNote) {
        // @ts-ignore
        await window.electron.saveNote({ title: activeNote.title, content: activeNote.content || editorRef.current?.innerText || '' })
      }
    }
  }

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const newNotes = notes.filter(n => n.id !== id)
    if (newNotes.length === 0) {
      const newId = Date.now().toString()
      setNotes([{ id: newId, title: 'Note 1', content: '' }])
      setActiveNoteId(newId)
    } else {
      setNotes(newNotes)
      if (activeNoteId === id) {
        setActiveNoteId(newNotes[newNotes.length - 1].id)
      }
    }
  }

  // Helper to get the current block node (usually a div or the text node's parent)
  const getBlockNode = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    let node = selection.anchorNode;
    while (node && node.parentElement !== editorRef.current && node !== editorRef.current) {
      node = node.parentElement;
    }
    return node;
  }

  const handleShortcutAction = (action: 'duplicate' | 'move-up' | 'move-down' | 'delete') => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    let block = getBlockNode() as HTMLElement

    // Enforce Block Structure if we are at root
    if (!block || !editorRef.current?.contains(block) || block === editorRef.current) {
      document.execCommand('formatBlock', false, 'div')
      block = getBlockNode() as HTMLElement
      if (!block || block === editorRef.current) return
    }

    // Preserve selection offset relative to the block
    const range = selection.getRangeAt(0)
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(block)
    preCaretRange.setEnd(range.endContainer, range.endOffset)
    const caretOffset = preCaretRange.toString().length

    if (action === 'delete') {
      const next = block.nextSibling || block.previousSibling
      block.parentNode?.removeChild(block)
      if (next) {
        const newRange = document.createRange()
        newRange.collapse(true)
        // simplified focus for delete
      }
    } else if (action === 'duplicate') {
      const clone = block.cloneNode(true) as HTMLElement
      block.parentNode?.insertBefore(clone, block.nextSibling)
      // Move cursor to duplicate? Usually VS Code keeps cursor on original or moves to duplicate.
      // Let's keep cursor on original for now, or move to duplicate if that's preferred.
      // VS Code: Shift+Alt+Down -> Duplicates DOWN, cursor stays on ORIGINAL.
      // VS Code: Shift+Alt+Up -> Duplicates UP, cursor stays on ORIGINAL (which is now lower).
    } else if (action === 'move-up') {
      const prev = block.previousSibling
      if (prev) {
        block.parentNode?.insertBefore(block, prev)
        restoreCursor(block, caretOffset)
      }
    } else if (action === 'move-down') {
      const next = block.nextSibling
      if (next) {
        // Insert before next's next sibling (effectively moving down past next)
        block.parentNode?.insertBefore(block, next.nextSibling)
        restoreCursor(block, caretOffset)
      }
    }
    handleInput()
  }

  const restoreCursor = (node: Node, offset: number) => {
    const selection = window.getSelection()
    const range = document.createRange()
    // We need to find the text node and offset within it.
    // Simplify: set to end of block or try to find robust position.
    // For now, let's just collapse to end to ensure we are inside.
    // To be perfect, we walk the tree.

    let currentLength = 0
    const alignCursor = (n: Node): boolean => {
      if (n.nodeType === Node.TEXT_NODE) {
        const len = n.textContent?.length || 0;
        if (currentLength + len >= offset) {
          range.setStart(n, offset - currentLength)
          range.collapse(true)
          return true
        }
        currentLength += len
      } else {
        for (let i = 0; i < n.childNodes.length; i++) {
          if (alignCursor(n.childNodes[i])) return true
        }
      }
      return false
    }

    alignCursor(node)
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Autocomplete Handling
    if (suggestion && suggestion.visible) {
      if (e.key === 'Tab') {
        e.preventDefault();
        completeSuggestion();
        return;
      }
      if (e.key === 'Escape') {
        setSuggestion(null);
        return;
      }
    }

    // Snippet Expansion
    checkSnippetExpansion(e)

    // VS Code Shortcuts
    if (e.shiftKey && e.altKey && e.key === 'ArrowDown') {
      e.preventDefault(); handleShortcutAction('duplicate'); return;
    }
    if (e.shiftKey && e.altKey && e.key === 'ArrowUp') {
      e.preventDefault(); handleShortcutAction('duplicate'); return;
    }
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault(); handleShortcutAction('move-up'); return;
    }
    if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault(); handleShortcutAction('move-down'); return;
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault(); handleShortcutAction('delete'); return;
    }

    // Existing Formatting
    if (e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); document.execCommand('bold'); break;
        case 'i': e.preventDefault(); document.execCommand('italic'); break;
        case 'u': e.preventDefault(); document.execCommand('underline'); break;
        case 's': e.preventDefault(); saveNote(); break;
      }
    }
  }

  // Resize Logic
  const handleResizeStart = (e: React.MouseEvent, direction: 'right' | 'bottom' | 'bottom-right' | 'left') => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.screenX // Use screen coordinates for absolute movement
    const startY = e.screenY
    const startWidth = document.body.clientWidth
    const startHeight = document.body.clientHeight
    const startWindowX = window.screenX

    const onMouseMove = (moveEvent: MouseEvent) => {
      // @ts-ignore
      if (window.electron && window.electron.resize) {
        const currentX = moveEvent.screenX
        const currentY = moveEvent.screenY

        let newBounds: any = {}

        if (direction === 'right' || direction === 'bottom-right') {
          newBounds.width = startWidth + (currentX - startX)
        }
        if (direction === 'bottom' || direction === 'bottom-right') {
          newBounds.height = startHeight + (currentY - startY)
        }
        if (direction === 'left') {
          const delta = currentX - startX
          newBounds.width = startWidth - delta
          newBounds.x = startWindowX + delta
        }

        // Ensure we don't send undefined if not changing
        if (!newBounds.width && direction !== 'bottom') newBounds.width = startWidth
        if (!newBounds.height && direction === 'left') newBounds.height = startHeight

        // @ts-ignore
        window.electron.resize(newBounds)
      }
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // Helper to convert hex to rgba
  const hexToRgba = (hex: string, alpha: string) => {
    let r = 0, g = 0, b = 0
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16)
      g = parseInt(hex[2] + hex[2], 16)
      b = parseInt(hex[3] + hex[3], 16)
    } else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16)
      g = parseInt(hex.slice(3, 5), 16)
      b = parseInt(hex.slice(5, 7), 16)
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const getBackgroundStyle = () => {
    const alpha = settings.opacity
    if (settings.backgroundType === 'gradient') {
      const start = hexToRgba(settings.gradientStart, alpha)
      const end = hexToRgba(settings.gradientEnd, alpha)
      return `linear-gradient(${settings.gradientAngle}deg, ${start}, ${end})`
    }
    return hexToRgba(settings.color === '#ffffff' ? '#282828' : settings.color, alpha) // Default dark bg if text is white, else use color? Actually let's use a specific bg color setting or just reuse the 'solid' logic which was previously hardcoded.
    // Previous logic was: background: `rgba(40, 40, 40, ${settings.opacity})` constants.
    // Let's change 'color' setting to be Text Color, and add a BG Color picker if 'solid' is selected?
    // The current settings.color IS the text color.
    // Let's use gradientStart as the solid color source for simplicity or add a new one.
    // Let's use gradientStart as the primary BG color for solid mode too.
  }

  const backdropStyle = {
    backdropFilter: settings.blurEnabled ? `blur(${settings.blurAmount})` : 'none',
    WebkitBackdropFilter: settings.blurEnabled ? `blur(${settings.blurAmount})` : 'none',
    background: settings.backgroundType === 'gradient'
      ? `linear-gradient(${settings.gradientAngle}deg, ${hexToRgba(settings.gradientStart, settings.opacity)}, ${hexToRgba(settings.gradientEnd, settings.opacity)})`
      : hexToRgba(settings.gradientStart, settings.opacity)
  }

  return (
    <div className="note-container" style={backdropStyle}>
      <div className="title-bar">
        <div className="drag-region">
          <span>Glass Note</span>
        </div>
        <div className="window-controls">
          <button onClick={saveNote} className="control-btn" title="Save to Text File">&#128190;</button>
          <button onClick={() => setShowSettings(!showSettings)} className="control-btn settings-btn" title="Settings">&#9881;</button>
          <button onClick={toggleMaximize} className="control-btn maximize-btn" title={isMaximized ? "Restore" : "Maximize"}>
            {isMaximized ? '❐' : '□'}
          </button>
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
              onDoubleClick={() => setEditingTitleId(n.id)}
            >
              {editingTitleId === n.id ? (
                <input
                  autoFocus
                  className="tab-input"
                  value={n.title}
                  onChange={(e) => handleRename(n.id, e.target.value)}
                  onBlur={() => setEditingTitleId(null)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setEditingTitleId(null) }}
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
      )}

      {showSettings && (
        <div className="settings-panel full-cover">
          <div className="settings-sidebar">
            <h2>Settings</h2>
            <button className="settings-nav-btn active">General</button>
            {/* Future: Add more tabs if needed like 'About' */}
            <div className="spacer"></div>
            <button onClick={() => setShowSettings(false)} className="close-settings-btn-sidebar">Close</button>
          </div>

          <div className="settings-content">
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
                <input
                  type="color"
                  value={settings.gradientStart}
                  onChange={(e) => updateSetting('gradientStart', e.target.value)}
                />
              </div>

              {settings.backgroundType === 'gradient' && (
                <>
                  <div className="setting-row">
                    <label>End Color</label>
                    <input
                      type="color"
                      value={settings.gradientEnd}
                      onChange={(e) => updateSetting('gradientEnd', e.target.value)}
                    />
                  </div>
                  <div className="setting-row">
                    <label>Angle ({settings.gradientAngle}°)</label>
                    <input
                      type="range" min="0" max="360"
                      className="styled-slider"
                      value={settings.gradientAngle}
                      onChange={(e) => updateSetting('gradientAngle', parseInt(e.target.value))}
                    />
                  </div>
                </>
              )}

              <div className="setting-row">
                <label>Opacity ({Math.round(parseFloat(settings.opacity) * 100)}%)</label>
                <input
                  type="range" min="0" max="100"
                  className="styled-slider"
                  value={parseFloat(settings.opacity) * 100}
                  onChange={(e) => updateSetting('opacity', (parseInt(e.target.value) / 100).toString())}
                />
              </div>

              <div className="setting-row">
                <label>Blur Effect</label>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.blurEnabled}
                    onChange={(e) => updateSetting('blurEnabled', e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {settings.blurEnabled && (
                <div className="setting-row">
                  <label>Blur Intensity</label>
                  <input
                    type="range" min="0" max="50"
                    className="styled-slider"
                    value={parseInt(settings.blurAmount)}
                    onChange={(e) => updateSetting('blurAmount', `${e.target.value}px`)}
                  />
                </div>
              )}
            </div>

            <div className="setting-section">
              <h3>Typography</h3>
              <div className="setting-row">
                <label>Font</label>
                <select className="styled-select" value={settings.fontFamily} onChange={(e) => updateSetting('fontFamily', e.target.value)}>
                  <option value="'Segoe UI', sans-serif">Segoe UI</option>
                  <option value="'Courier New', monospace">Courier New</option>
                  <option value="'Roboto', sans-serif">Roboto</option>
                </select>
              </div>
              <div className="setting-row">
                <label>Size ({parseInt(settings.fontSize)}px)</label>
                <input type="range" min="12" max="48" className="styled-slider" value={parseInt(settings.fontSize)} onChange={(e) => updateSetting('fontSize', `${e.target.value}px`)} />
              </div>
              <div className="setting-row">
                <label>Text Color</label>
                <input type="color" value={settings.color} onChange={(e) => updateSetting('color', e.target.value)} />
              </div>
            </div>

            <div className="setting-section">
              <h3>Shortcuts Manager</h3>
              <div className="snippets-table-container">
                {snippets.length === 0 ? (
                  <div className="empty-state">No shortcuts created yet. select text + right click to create.</div>
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
                          <td className="content-cell">{s.content}</td>
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
        </div>
      )}

      <div
        ref={editorRef}
        className="note-content editable-div"
        contentEditable
        onInput={handleInput}
        onKeyUp={handleKeyUp}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        onClick={updateSuggestion} // Update/Hide on click too
        spellCheck={false}
        style={{
          fontFamily: settings.fontFamily,
          fontSize: settings.fontSize,
          color: settings.color,
          display: showSettings ? 'none' : 'block'
        }}
      />

      {/* Context Menu */}
      {contextMenu && contextMenu.visible && (
        <div
          className="custom-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()} // Prevent closing immediately when clicking inside? Actually we want click on item to work.
        >
          <div className="context-menu-item" onClick={handleCreateSnippetClick}>
            Create Shortcut
          </div>
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
                  onKeyDown={(e) => { if (e.key === 'Enter') saveSnippet() }}
                />
              </div>
              <small>Start with a letter, no spaces.</small>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowShortcutModal(false)} className="cancel-btn">Cancel</button>
              <button onClick={saveSnippet} className="save-btn">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Autocomplete Suggestion UI */}
      {suggestion && suggestion.visible && (
        <div
          className="suggestion-popup"
          style={{ top: suggestion.y, left: suggestion.x }}
        >
          <span className="suggestion-match">/{suggestion.match.trigger}</span>
          <span className="suggestion-hint">Tab to complete</span>
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
    </div>
  )
}

export default App
