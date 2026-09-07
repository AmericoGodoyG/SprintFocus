import { ipcMain, BrowserWindow } from 'electron'

export function registerWindowIPC(mainWindow?: BrowserWindow): void {
  const getWindow = () => mainWindow || BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]

  ipcMain.handle('window:minimize', () => {
    const win = getWindow()
    if (win) {
      win.minimize()
    }
  })

  ipcMain.handle('window:maximize', () => {
    const win = getWindow()
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
      return win.isMaximized()
    }
    return false
  })

  ipcMain.handle('window:close', () => {
    const win = getWindow()
    if (win) {
      win.close()
    }
  })

  ipcMain.handle('window:isMaximized', () => {
    const win = getWindow()
    return win ? win.isMaximized() : false
  })

  if (mainWindow) {
    mainWindow.on('maximize', () => {
      mainWindow.webContents.send('window:maximized-change', true)
    })
    mainWindow.on('unmaximize', () => {
      mainWindow.webContents.send('window:maximized-change', false)
    })
  }
}
