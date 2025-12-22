const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron')
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
            }
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
                const iconPath = path.join(__dirname, isDev ? '../public/vite.svg' : '../dist/vite.svg')
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

app.whenReady().then(() => {
    log("App Ready")
    createWindow()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
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
