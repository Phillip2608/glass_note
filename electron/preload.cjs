const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
    setBlur: (enabled) => ipcRenderer.invoke('set-blur', enabled)
})
