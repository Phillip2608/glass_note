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

const { spawn } = require('child_process');

let pythonProcess = null;

function startPythonBridge() {
    log("Starting Python Bridge...");
    const isDev = !app.isPackaged;

    // In Dev: telegram_bridge.py is in the root (cwd)
    // In Prod: It should be in resources or bundled.
    // Simplifying: we assume it's next to the app or we resolve it.

    // For this context: We assume the user has sources.
    // Adjust path based on your setup.
    let scriptPath = path.join(__dirname, '../telegram_bridge.py');

    if (!isDev) {
        // In production, resources directory is typical
        scriptPath = path.join(process.resourcesPath, 'telegram_bridge.py');
    }

    log(`Target Script: ${scriptPath}`);

    if (fs.existsSync(scriptPath)) {
        pythonProcess = spawn('python', [scriptPath]);

        pythonProcess.stdout.on('data', (data) => {
            log(`[Bridge]: ${data}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            log(`[Bridge Err]: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            log(`Bridge exited with code ${code}`);
        });
    } else {
        log("telegram_bridge.py not found!");
    }
}

function stopPythonBridge() {
    if (pythonProcess) {
        log("Stopping Python Bridge...");
        pythonProcess.kill();
        pythonProcess = null;
    }
}

// Set App User Model ID for Windows Taskbar Grouping
if (process.platform === 'win32') {
    app.setAppUserModelId('com.glassnote.app')
}

log("App Starting...")

let tray = null
let mainWindow = null
let isQuitting = false

function createWindow() {
    log("createWindow called")
    try {
        mainWindow = new BrowserWindow({
            width: 500,
            height: 700,
            frame: false,
            transparent: true,
            hasShadow: true,
            resizable: true,
            minWidth: 200,
            minHeight: 200,
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
                            log("Tray Quit clicked")
                            isQuitting = true
                            stopPythonBridge()
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

ipcMain.handle('window-minimize', () => {
    if (mainWindow) {
        mainWindow.minimize()
    }
})

let settingsWindow = null

ipcMain.handle('open-settings', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.focus()
        return
    }

    settingsWindow = new BrowserWindow({
        width: 700,
        height: 600,
        frame: false,
        transparent: true,
        resizable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true
        },
        icon: path.join(__dirname, process.env.VITE_DEV_SERVER_URL ? '../public/notepad_17560496.ico' : '../dist/notepad_17560496.ico')
    })

    const isDev = !app.isPackaged
    const startUrl = isDev
        ? (process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173')
        : `file://${path.join(__dirname, '../dist/index.html')}`

    settingsWindow.loadURL(`${startUrl}#settings`)

    // Optional: add some "glass" material if desired, or rely on CSS
    // settingsWindow.setBackgroundMaterial('acrylic') 
})

ipcMain.handle('app-close', () => {
    // If we have a settings win, close it too? Or just the sender?
    const senderWin = BrowserWindow.getFocusedWindow()
    if (senderWin === settingsWindow) {
        settingsWindow.close()
    } else {
        // Main Window close logic (minimize to tray)
        if (mainWindow) mainWindow.close()
    }
})

ipcMain.handle('window-is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false
})


app.whenReady().then(() => {
    log("App Ready")
    startPythonBridge();
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
