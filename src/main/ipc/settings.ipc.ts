import { ipcMain } from 'electron'
import * as settingsRepo from '../database/repositories/settings.repo'

export function registerSettingsIPC(): void {
  ipcMain.handle('settings:getAll', () => settingsRepo.getAllSettings())
  ipcMain.handle('settings:get', (_, key: string) => settingsRepo.getSetting(key))
  ipcMain.handle('settings:set', (_, key: string, value: string) => settingsRepo.setSetting(key, value))
  ipcMain.handle('settings:setMany', (_, settings: Record<string, string>) => settingsRepo.setSettings(settings))
}
