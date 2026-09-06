import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // === Sessions ===
  createSession: (data: unknown) => ipcRenderer.invoke('db:sessions:create', data),
  finishSession: (id: number, finishedAt: string, actualMinutes: number, status: string) =>
    ipcRenderer.invoke('db:sessions:finish', id, finishedAt, actualMinutes, status),
  getSessionsByDateRange: (start: string, end: string) => ipcRenderer.invoke('db:sessions:getByDateRange', start, end),
  getSessionStats: (start: string, end: string) => ipcRenderer.invoke('db:sessions:getStats', start, end),
  getDailyStudyData: (start: string, end: string) => ipcRenderer.invoke('db:sessions:getDailyData', start, end),
  getStudyStreak: () => ipcRenderer.invoke('db:sessions:getStreak'),

  // === Settings ===
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),

  // === Notifications ===
  showNotification: (title: string, body: string) => ipcRenderer.invoke('notification:show', title, body)
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
