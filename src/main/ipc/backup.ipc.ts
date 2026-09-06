import { ipcMain, dialog, app } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getDatabase } from '../database/connection'

export function registerBackupIPC(): void {
  ipcMain.handle('backup:export', async () => {
    const result = await dialog.showSaveDialog({
      defaultPath: `study-backup-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (result.canceled || !result.filePath) return { success: false }

    try {
      const db = getDatabase()
      const data = {
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        subjects: db.prepare('SELECT * FROM subjects').all(),
        topics: db.prepare('SELECT * FROM topics').all(),
        study_sessions: db.prepare('SELECT * FROM study_sessions').all(),
        flashcards: db.prepare('SELECT * FROM flashcards').all(),
        flashcard_reviews: db.prepare('SELECT * FROM flashcard_reviews').all(),
        pdf_documents: db.prepare('SELECT id, filename, summary, page_count, file_size, subject_id, topic_id, created_at FROM pdf_documents').all(),
        settings: db.prepare('SELECT * FROM app_settings WHERE key NOT LIKE \'api_key_%\'').all()
      }

      writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
      return { success: true, path: result.filePath }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
  })

  ipcMain.handle('backup:import', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) return { success: false }

    try {
      const content = readFileSync(result.filePaths[0], 'utf-8')
      const data = JSON.parse(content)

      if (!data.version || !data.subjects) {
        return { success: false, error: 'Arquivo de backup inválido.' }
      }

      const db = getDatabase()

      db.transaction(() => {
        // Clear existing data
        db.prepare('DELETE FROM flashcard_reviews').run()
        db.prepare('DELETE FROM flashcards').run()
        db.prepare('DELETE FROM study_sessions').run()
        db.prepare('DELETE FROM pdf_documents').run()
        db.prepare('DELETE FROM topics').run()
        db.prepare('DELETE FROM subjects').run()

        // Restore subjects
        const subjectStmt = db.prepare('INSERT INTO subjects (id, name, color, created_at) VALUES (?, ?, ?, ?)')
        for (const s of data.subjects) {
          subjectStmt.run(s.id, s.name, s.color, s.created_at)
        }

        // Restore topics
        const topicStmt = db.prepare('INSERT INTO topics (id, subject_id, name, created_at) VALUES (?, ?, ?, ?)')
        for (const t of data.topics) {
          topicStmt.run(t.id, t.subject_id, t.name, t.created_at)
        }

        // Restore sessions
        const sessionStmt = db.prepare(`
          INSERT INTO study_sessions (id, subject_id, topic_id, started_at, finished_at, planned_minutes, actual_minutes, session_type, cycle_number, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        for (const s of data.study_sessions) {
          sessionStmt.run(s.id, s.subject_id, s.topic_id, s.started_at, s.finished_at, s.planned_minutes, s.actual_minutes, s.session_type, s.cycle_number, s.status, s.notes)
        }

        // Restore PDFs (without extracted_text to save space)
        if (data.pdf_documents) {
          const pdfStmt = db.prepare(`
            INSERT INTO pdf_documents (id, filename, filepath, summary, page_count, file_size, subject_id, topic_id, created_at)
            VALUES (?, ?, '', ?, ?, ?, ?, ?, ?)
          `)
          for (const p of data.pdf_documents) {
            pdfStmt.run(p.id, p.filename, p.summary, p.page_count, p.file_size, p.subject_id, p.topic_id, p.created_at)
          }
        }

        // Restore flashcards
        const flashcardStmt = db.prepare(`
          INSERT INTO flashcards (id, pdf_id, subject_id, topic_id, question, answer, difficulty, source, review_count, next_review, ease_factor, interval_days, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        for (const f of data.flashcards) {
          flashcardStmt.run(f.id, f.pdf_id, f.subject_id, f.topic_id, f.question, f.answer, f.difficulty, f.source, f.review_count, f.next_review, f.ease_factor, f.interval_days, f.created_at, f.updated_at)
        }

        // Restore reviews
        if (data.flashcard_reviews) {
          const reviewStmt = db.prepare(`
            INSERT INTO flashcard_reviews (id, flashcard_id, reviewed_at, result, difficulty_rating, response_time_ms)
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          for (const r of data.flashcard_reviews) {
            reviewStmt.run(r.id, r.flashcard_id, r.reviewed_at, r.result, r.difficulty_rating, r.response_time_ms)
          }
        }

        // Restore settings (excluding API keys)
        if (data.settings) {
          const settingStmt = db.prepare(`
            INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
          `)
          for (const s of data.settings) {
            settingStmt.run(s.key, s.value)
          }
        }
      })()

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao importar backup' }
    }
  })

  ipcMain.handle('backup:getDatabasePath', () => {
    return join(app.getPath('userData'), 'sprintfocus.db')
  })
}
