import { registerDatabaseIPC } from './database.ipc'
import { registerSettingsIPC } from './settings.ipc'
import { registerNotificationIPC } from './notification.ipc'

export function registerAllIPC(): void {
  registerDatabaseIPC()
  registerSettingsIPC()
  registerNotificationIPC()
}
