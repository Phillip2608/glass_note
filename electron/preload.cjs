const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
    setBlur: (enabled) => ipcRenderer.invoke('set-blur', enabled),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    unmaximize: () => ipcRenderer.invoke('window-unmaximize'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
    close: () => ipcRenderer.invoke('app-close'),
    onMaximized: (callback) => ipcRenderer.on('window-maximized', callback),
    onUnmaximized: (callback) => ipcRenderer.on('window-unmaximized', callback),
    resize: (size) => ipcRenderer.invoke('window-resize', size),
    saveNote: (data) => ipcRenderer.invoke('save-note', data)
})
