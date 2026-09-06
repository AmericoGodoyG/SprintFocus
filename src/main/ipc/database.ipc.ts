import { ipcMain } from 'electron'
import * as sessionsRepo from '../database/repositories/sessions.repo'

export function registerDatabaseIPC(): void {
  // === Sessions ===
  ipcMain.handle('db:sessions:create', (_, data) => sessionsRepo.createSession(data))
  ipcMain.handle('db:sessions:finish', (_, id: number, finishedAt: string, actualMinutes: number, status: string) =>
    sessionsRepo.finishSession(id, finishedAt, actualMinutes, status)
  )
  ipcMain.handle('db:sessions:getByDateRange', (_, start: string, end: string) => sessionsRepo.getSessionsByDateRange(start, end))
  ipcMain.handle('db:sessions:getStats', (_, start: string, end: string) => sessionsRepo.getSessionStats(start, end))
  ipcMain.handle('db:sessions:getDailyData', (_, start: string, end: string) => sessionsRepo.getDailyStudyData(start, end))
  ipcMain.handle('db:sessions:getStreak', () => sessionsRepo.getStudyStreak())
}
