import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // === Subjects ===
  getSubjects: () => ipcRenderer.invoke('db:subjects:getAll'),
  getSubjectById: (id: number) => ipcRenderer.invoke('db:subjects:getById', id),
  createSubject: (name: string, color: string) => ipcRenderer.invoke('db:subjects:create', name, color),
  updateSubject: (id: number, name: string, color: string) => ipcRenderer.invoke('db:subjects:update', id, name, color),
  deleteSubject: (id: number) => ipcRenderer.invoke('db:subjects:delete', id),

  // === Topics ===
  getTopics: () => ipcRenderer.invoke('db:topics:getAll'),
  getTopicsBySubject: (subjectId: number) => ipcRenderer.invoke('db:topics:getBySubject', subjectId),
  createTopic: (subjectId: number, name: string) => ipcRenderer.invoke('db:topics:create', subjectId, name),
  updateTopic: (id: number, name: string) => ipcRenderer.invoke('db:topics:update', id, name),
  deleteTopic: (id: number) => ipcRenderer.invoke('db:topics:delete', id),

  // === Sessions ===
  createSession: (data: unknown) => ipcRenderer.invoke('db:sessions:create', data),
  finishSession: (id: number, finishedAt: string, actualMinutes: number, status: string) =>
    ipcRenderer.invoke('db:sessions:finish', id, finishedAt, actualMinutes, status),
  getSessions: (limit?: number, offset?: number) => ipcRenderer.invoke('db:sessions:getAll', limit, offset),
  getSessionsByDateRange: (start: string, end: string) => ipcRenderer.invoke('db:sessions:getByDateRange', start, end),
  getSessionStats: (start: string, end: string) => ipcRenderer.invoke('db:sessions:getStats', start, end),
  getSessionsBySubject: (start: string, end: string) => ipcRenderer.invoke('db:sessions:getBySubject', start, end),
  getDailyStudyData: (start: string, end: string) => ipcRenderer.invoke('db:sessions:getDailyData', start, end),
  getStudyStreak: () => ipcRenderer.invoke('db:sessions:getStreak'),
  updateSession: (id: number, data: unknown) => ipcRenderer.invoke('db:sessions:update', id, data),
  deleteSession: (id: number) => ipcRenderer.invoke('db:sessions:delete', id),

  // === Flashcards ===
  createFlashcard: (data: unknown) => ipcRenderer.invoke('db:flashcards:create', data),
  createFlashcardsBatch: (cards: unknown[]) => ipcRenderer.invoke('db:flashcards:createBatch', cards),
  getFlashcards: (subjectId?: number, topicId?: number, search?: string) =>
    ipcRenderer.invoke('db:flashcards:getAll', subjectId, topicId, search),
  getFlashcardsForReview: (limit?: number, subjectId?: number) =>
    ipcRenderer.invoke('db:flashcards:getForReview', limit, subjectId),
  updateFlashcard: (id: number, data: unknown) => ipcRenderer.invoke('db:flashcards:update', id, data),
  deleteFlashcard: (id: number) => ipcRenderer.invoke('db:flashcards:delete', id),
  addFlashcardReview: (flashcardId: number, result: string, difficulty: string, responseTime?: number) =>
    ipcRenderer.invoke('db:flashcards:addReview', flashcardId, result, difficulty, responseTime),
  getFlashcardStats: () => ipcRenderer.invoke('db:flashcards:getStats'),
  getFlashcardReviewsCount: (start: string, end: string) => ipcRenderer.invoke('db:flashcards:getReviewsCount', start, end),

  // === PDFs ===
  selectPdfFile: () => ipcRenderer.invoke('pdf:selectFile'),
  extractPdfText: (filepath: string) => ipcRenderer.invoke('pdf:extractText', filepath),
  getPdfs: () => ipcRenderer.invoke('db:pdfs:getAll'),
  getPdfById: (id: number) => ipcRenderer.invoke('db:pdfs:getById', id),
  createPdf: (data: unknown) => ipcRenderer.invoke('db:pdfs:create', data),
  updatePdfSummary: (id: number, summary: string) => ipcRenderer.invoke('db:pdfs:updateSummary', id, summary),
  deletePdf: (id: number) => ipcRenderer.invoke('db:pdfs:delete', id),

  // === Settings ===
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  setSettings: (settings: Record<string, string>) => ipcRenderer.invoke('settings:setMany', settings),

  // === Notifications ===
  showNotification: (title: string, body: string) => ipcRenderer.invoke('notification:show', title, body),

  // === Backup ===
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  getDatabasePath: () => ipcRenderer.invoke('backup:getDatabasePath')
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
