const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs') // Imported for debugging

const logPath = path.join(app.getPath('userData'), 'glass_note_debug.log')

function log(message) {
    try {
        fs.appendFileSync(logPath, `${new Date().toISOString()} - ${message}\n`)
    } catch (e) {
        console.error("Log failed", e)
    }
}

log("App Starting...")

let tray = null
let mainWindow = null
let isQuitting = false

function createWindow() {
    log("createWindow called")
    try {
        mainWindow = new BrowserWindow({
            width: 400,
            height: 600,
            frame: false,
            transparent: true,
            hasShadow: true,
            resizable: true,
            minWidth: 200,
            minHeight: 200,
            backgroundMaterial: 'none',
            webPreferences: {
                preload: path.join(__dirname, 'preload.cjs'),
                nodeIntegration: false,
                contextIsolation: true
            },
            icon: path.join(__dirname, process.env.VITE_DEV_SERVER_URL ? '../public/notepad_17560496.ico' : '../dist/notepad_17560496.ico')
        })
        log("BrowserWindow created")

        const isDev = !app.isPackaged
        const startUrl = isDev
            ? (process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173')
            : `file://${path.join(__dirname, '../dist/index.html')}`

        mainWindow.loadURL(startUrl)
        log(`Loading URL: ${startUrl}`)

        // Tray Setup
        if (!tray) {
            try {
                const iconPath = path.join(__dirname, isDev ? '../public/notepad_17560496.ico' : '../dist/notepad_17560496.ico')
                log(`Icon Path: ${iconPath}`)
                const icon = nativeImage.createFromPath(iconPath)

                tray = new Tray(icon)

                const contextMenu = Menu.buildFromTemplate([
                    { label: 'Show Glass Note', click: () => { log("Tray Show clicked"); mainWindow?.show() } },
                    {
                        label: 'Quit', click: () => {
                            log("Tray Quit clicked")
                            isQuitting = true
                            app.quit()
                        }
                    }
                ])

                tray.setToolTip('Glass Note')
                tray.setContextMenu(contextMenu)

                tray.on('double-click', () => { log("Tray Double Click"); mainWindow?.show() })
                log("Tray created successfully")
            } catch (e) {
                log(`Tray Error: ${e.message}`)
            }
        }

        mainWindow.on('close', (event) => {
            log(`Close event. isQuitting=${isQuitting}`)
            if (!isQuitting) {
                event.preventDefault()
                mainWindow.hide()
                log("Window hidden (prevented close)")
                return false
            }
            log("Window closing (quitting)")
        })

        mainWindow.on('maximize', () => {
            mainWindow.webContents.send('window-maximized')
        })

        mainWindow.on('unmaximize', () => {
            mainWindow.webContents.send('window-unmaximized')
        })

        return mainWindow
    } catch (e) {
        log(`Create Window Critical Error: ${e.message}`)
        throw e
    }
}

ipcMain.handle('set-blur', (event, enabled) => {
    log(`IPC set-blur: ${enabled}`)
    if (!mainWindow) {
        log("IPC Error: mainWindow is null")
        return
    }
    if (enabled) {
        mainWindow.setBackgroundMaterial('acrylic')
    } else {
        mainWindow.setBackgroundMaterial('none')
        mainWindow.setBackgroundColor('#00000000')
    }
})

ipcMain.handle('window-maximize', () => {
    if (mainWindow && !mainWindow.isMaximized()) {
        mainWindow.maximize()
    }
})

ipcMain.handle('window-unmaximize', () => {
    if (mainWindow && mainWindow.isMaximized()) {
        mainWindow.unmaximize()
    }
})

ipcMain.handle('window-is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false
})

ipcMain.handle('app-close', () => {
    if (mainWindow) mainWindow.close()
})

app.whenReady().then(() => {
    log("App Ready")
    createWindow()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

ipcMain.handle('window-resize', (event, bounds) => {
    if (mainWindow) {
        // bounds can contain width, height, x, y
        // Ensure integers
        const newBounds = {}
        if (bounds.width) newBounds.width = Math.round(bounds.width)
        if (bounds.height) newBounds.height = Math.round(bounds.height)
        if (bounds.x !== undefined) newBounds.x = Math.round(bounds.x)
        if (bounds.y !== undefined) newBounds.y = Math.round(bounds.y)

        mainWindow.setBounds(newBounds)
    }
})

ipcMain.handle('save-note', async (event, { title, content }) => {
    if (!mainWindow) return { success: false, error: 'Window not found' }

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Note',
        defaultPath: (title || 'Untitled') + '.txt',
        filters: [
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    })

    if (canceled || !filePath) {
        return { success: false, canceled: true }
    }

    try {
        fs.writeFileSync(filePath, content, 'utf-8')
        return { success: true, filePath }
    } catch (e) {
        log(`Save Error: ${e.message}`)
        return { success: false, error: e.message }
    }
})

app.on('window-all-closed', () => {
    log("Window All Closed event")
    if (process.platform !== 'darwin') {
        // app.quit() // We do not quit here.
    }
})

process.on('uncaughtException', (error) => {
    log(`UNCAUGHT EXCEPTION: ${error.message}\n${error.stack}`)
})
