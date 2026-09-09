import { app, BrowserWindow, shell, nativeImage, type NativeImage } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { initDatabase } from './database/connection'
import { registerAllIPC } from './ipc'

const isDev = !app.isPackaged || process.env.NODE_ENV === 'development'

function getAppIcon(): NativeImage {
  const icoPath = join(__dirname, '../../build/icon.ico')
  if (existsSync(icoPath)) {
    return nativeImage.createFromPath(icoPath)
  }
  const pngPath = join(__dirname, '../../build/icon.png')
  if (existsSync(pngPath)) {
    return nativeImage.createFromPath(pngPath)
  }
  return nativeImage.createFromPath(join(process.resourcesPath, 'build/icon.ico'))
}

function createWindow(): BrowserWindow {
  const icon = getAppIcon()
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 420,
    minHeight: 520,
    show: false,
    frame: false,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })

  mainWindow.setIcon(icon)

  mainWindow.on('ready-to-show', () => {
    mainWindow.setIcon(icon)
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    const baseUrl = process.env['ELECTRON_RENDERER_URL'].replace(/\/$/, '')
    mainWindow.loadURL(`${baseUrl}/#/pomodoro`)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/pomodoro' })
  }

  return mainWindow
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.sprintfocus.app')

  // Initialize database
  initDatabase()

  const mainWindow = createWindow()

  // Register IPC handlers
  registerAllIPC(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const win = createWindow()
      registerAllIPC(win)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
