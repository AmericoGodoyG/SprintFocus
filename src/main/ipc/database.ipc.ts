import { ipcMain } from 'electron'
import * as subjectsRepo from '../database/repositories/subjects.repo'
import * as topicsRepo from '../database/repositories/topics.repo'
import * as sessionsRepo from '../database/repositories/sessions.repo'
import * as flashcardsRepo from '../database/repositories/flashcards.repo'
import * as pdfsRepo from '../database/repositories/pdfs.repo'

export function registerDatabaseIPC(): void {
  // === Subjects ===
  ipcMain.handle('db:subjects:getAll', () => subjectsRepo.getAllSubjects())
  ipcMain.handle('db:subjects:getById', (_, id: number) => subjectsRepo.getSubjectById(id))
  ipcMain.handle('db:subjects:create', (_, name: string, color: string) => {
    try {
      return subjectsRepo.createSubject(name, color)
    } catch (err) {
      console.error('Erro ao criar disciplina no IPC:', err)
      throw err
    }
  })
  ipcMain.handle('db:subjects:update', (_, id: number, name: string, color: string) => subjectsRepo.updateSubject(id, name, color))
  ipcMain.handle('db:subjects:delete', (_, id: number) => subjectsRepo.deleteSubject(id))

  // === Topics ===
  ipcMain.handle('db:topics:getAll', () => topicsRepo.getAllTopics())
  ipcMain.handle('db:topics:getBySubject', (_, subjectId: number) => topicsRepo.getTopicsBySubject(subjectId))
  ipcMain.handle('db:topics:create', (_, subjectId: number, name: string) => {
    try {
      return topicsRepo.createTopic(subjectId, name)
    } catch (err) {
      console.error('Erro ao criar assunto no IPC:', err)
      throw err
    }
  })
  ipcMain.handle('db:topics:update', (_, id: number, name: string) => topicsRepo.updateTopic(id, name))
  ipcMain.handle('db:topics:delete', (_, id: number) => topicsRepo.deleteTopic(id))

  // === Sessions ===
  ipcMain.handle('db:sessions:create', (_, data) => sessionsRepo.createSession(data))
  ipcMain.handle('db:sessions:finish', (_, id: number, finishedAt: string, actualMinutes: number, status: string) =>
    sessionsRepo.finishSession(id, finishedAt, actualMinutes, status)
  )
  ipcMain.handle('db:sessions:getAll', (_, limit?: number, offset?: number) => sessionsRepo.getAllSessions(limit, offset))
  ipcMain.handle('db:sessions:getByDateRange', (_, start: string, end: string) => sessionsRepo.getSessionsByDateRange(start, end))
  ipcMain.handle('db:sessions:getStats', (_, start: string, end: string) => sessionsRepo.getSessionStats(start, end))
  ipcMain.handle('db:sessions:getBySubject', (_, start: string, end: string) => sessionsRepo.getSessionsBySubject(start, end))
  ipcMain.handle('db:sessions:getDailyData', (_, start: string, end: string) => sessionsRepo.getDailyStudyData(start, end))
  ipcMain.handle('db:sessions:getStreak', () => sessionsRepo.getStudyStreak())
  ipcMain.handle('db:sessions:update', (_, id: number, data) => sessionsRepo.updateSession(id, data))
  ipcMain.handle('db:sessions:delete', (_, id: number) => sessionsRepo.deleteSession(id))

  // === Flashcards ===
  ipcMain.handle('db:flashcards:create', (_, data) => flashcardsRepo.createFlashcard(data))
  ipcMain.handle('db:flashcards:createBatch', (_, cards) => flashcardsRepo.createFlashcardsBatch(cards))
  ipcMain.handle('db:flashcards:getAll', (_, subjectId?: number, topicId?: number, search?: string) =>
    flashcardsRepo.getAllFlashcards(subjectId, topicId, search)
  )
  ipcMain.handle('db:flashcards:getForReview', (_, limit?: number, subjectId?: number) =>
    flashcardsRepo.getFlashcardsForReview(limit, subjectId)
  )
  ipcMain.handle('db:flashcards:update', (_, id: number, data) => flashcardsRepo.updateFlashcard(id, data))
  ipcMain.handle('db:flashcards:delete', (_, id: number) => flashcardsRepo.deleteFlashcard(id))
  ipcMain.handle('db:flashcards:addReview', (_, flashcardId: number, result: string, difficulty: string, responseTime?: number) =>
    flashcardsRepo.addReview(flashcardId, result, difficulty, responseTime)
  )
  ipcMain.handle('db:flashcards:getStats', () => flashcardsRepo.getFlashcardStats())
  ipcMain.handle('db:flashcards:getReviewsCount', (_, start: string, end: string) => flashcardsRepo.getReviewsCount(start, end))

  // === PDFs ===
  ipcMain.handle('db:pdfs:getAll', () => pdfsRepo.getAllPdfs())
  ipcMain.handle('db:pdfs:getById', (_, id: number) => pdfsRepo.getPdfById(id))
  ipcMain.handle('db:pdfs:create', (_, data) => pdfsRepo.createPdfDocument(data))
  ipcMain.handle('db:pdfs:updateSummary', (_, id: number, summary: string) => pdfsRepo.updatePdfSummary(id, summary))
  ipcMain.handle('db:pdfs:delete', (_, id: number) => pdfsRepo.deletePdf(id))
}
