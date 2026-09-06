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

      if (!data.version || !data.study_sessions) {
        return { success: false, error: 'Arquivo de backup inválido.' }
      }

      const db = getDatabase()

      db.transaction(() => {
        // Clear existing data
        db.prepare('DELETE FROM study_sessions').run()
        db.prepare('DELETE FROM topics').run()
        db.prepare('DELETE FROM subjects').run()

        // Restore subjects
        if (data.subjects) {
          const subjectStmt = db.prepare('INSERT INTO subjects (id, name, color, created_at) VALUES (?, ?, ?, ?)')
          for (const s of data.subjects) {
            subjectStmt.run(s.id, s.name, s.color, s.created_at)
          }
        }

        // Restore topics
        if (data.topics) {
          const topicStmt = db.prepare('INSERT INTO topics (id, subject_id, name, created_at) VALUES (?, ?, ?, ?)')
          for (const t of data.topics) {
            topicStmt.run(t.id, t.subject_id, t.name, t.created_at)
          }
        }

        // Restore sessions
        const sessionStmt = db.prepare(`
          INSERT INTO study_sessions (id, subject_id, topic_id, started_at, finished_at, planned_minutes, actual_minutes, session_type, cycle_number, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        for (const s of data.study_sessions) {
          sessionStmt.run(s.id, s.subject_id, s.topic_id, s.started_at, s.finished_at, s.planned_minutes, s.actual_minutes, s.session_type, s.cycle_number, s.status, s.notes)
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
