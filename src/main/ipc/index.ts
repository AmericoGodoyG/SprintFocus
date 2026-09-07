import { BrowserWindow } from 'electron'
import { registerDatabaseIPC } from './database.ipc'
import { registerSettingsIPC } from './settings.ipc'
import { registerNotificationIPC } from './notification.ipc'
import { registerWindowIPC } from './window.ipc'

export function registerAllIPC(mainWindow?: BrowserWindow): void {
  registerDatabaseIPC()
  registerSettingsIPC()
  registerNotificationIPC()
  registerWindowIPC(mainWindow)
}

