import { ipcMain, safeStorage } from 'electron'
import * as settingsRepo from '../database/repositories/settings.repo'

export function registerSettingsIPC(): void {
  ipcMain.handle('settings:getAll', () => settingsRepo.getAllSettings())
  ipcMain.handle('settings:get', (_, key: string) => settingsRepo.getSetting(key))
  ipcMain.handle('settings:set', (_, key: string, value: string) => settingsRepo.setSetting(key, value))
  ipcMain.handle('settings:setMany', (_, settings: Record<string, string>) => settingsRepo.setSettings(settings))

  // Secure API key storage using OS-level encryption
  ipcMain.handle('settings:setApiKey', (_, provider: string, key: string) => {
    if (!safeStorage.isEncryptionAvailable()) {
      // Fallback: store in settings (less secure but functional)
      settingsRepo.setSetting(`api_key_${provider}`, key)
      return true
    }
    const encrypted = safeStorage.encryptString(key)
    settingsRepo.setSetting(`api_key_${provider}`, encrypted.toString('base64'))
    settingsRepo.setSetting(`api_key_${provider}_encrypted`, 'true')
    return true
  })

  ipcMain.handle('settings:getApiKey', (_, provider: string) => {
    const isEncrypted = settingsRepo.getSetting(`api_key_${provider}_encrypted`)
    const stored = settingsRepo.getSetting(`api_key_${provider}`)
    if (!stored) return null

    if (isEncrypted === 'true' && safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = Buffer.from(stored, 'base64')
        return safeStorage.decryptString(buffer)
      } catch {
        return null
      }
    }
    return stored
  })

  ipcMain.handle('settings:hasApiKey', (_, provider: string) => {
    const key = settingsRepo.getSetting(`api_key_${provider}`)
    return !!key && key.length > 0
  })
}
