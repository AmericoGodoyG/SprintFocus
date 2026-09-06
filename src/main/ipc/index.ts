import { registerDatabaseIPC } from './database.ipc'
import { registerSettingsIPC } from './settings.ipc'
import { registerPdfIPC } from './pdf.ipc'
import { registerBackupIPC } from './backup.ipc'
import { registerNotificationIPC } from './notification.ipc'

export function registerAllIPC(): void {
  registerDatabaseIPC()
  registerSettingsIPC()
  registerPdfIPC()
  registerBackupIPC()
  registerNotificationIPC()
}
