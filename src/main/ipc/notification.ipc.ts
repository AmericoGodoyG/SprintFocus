import { ipcMain, Notification } from 'electron'

export function registerNotificationIPC(): void {
  ipcMain.handle('notification:show', (_, title: string, body: string) => {
    if (Notification.isSupported()) {
      const notification = new Notification({ title, body })
      notification.show()
      return true
    }
    return false
  })
}
