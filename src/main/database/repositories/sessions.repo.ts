import { getDatabase } from '../connection'

export interface StudySession {
  id: number
  subject_id: number | null
  topic_id: number | null
  started_at: string
  finished_at: string | null
  planned_minutes: number
  actual_minutes: number
  session_type: string
  cycle_number: number
  status: string
  notes: string | null
  // Joined fields
  subject_name?: string
  topic_name?: string
}

export interface CreateSessionData {
  subject_id?: number | null
  topic_id?: number | null
  started_at: string
  planned_minutes: number
  session_type: string
  cycle_number: number
}

export function createSession(data: CreateSessionData): StudySession {
  const db = getDatabase()
  const result = db.prepare(`
    INSERT INTO study_sessions (subject_id, topic_id, started_at, planned_minutes, session_type, cycle_number)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    data.subject_id ?? null,
    data.topic_id ?? null,
    data.started_at,
    data.planned_minutes,
    data.session_type,
    data.cycle_number
  )
  return getSessionById(result.lastInsertRowid as number) as StudySession
}

export function finishSession(id: number, finishedAt: string, actualMinutes: number, status: string = 'completed'): StudySession | undefined {
  const db = getDatabase()
  db.prepare(`
    UPDATE study_sessions SET finished_at = ?, actual_minutes = ?, status = ? WHERE id = ?
  `).run(finishedAt, actualMinutes, status, id)
  return getSessionById(id)
}

export function getSessionById(id: number): StudySession | undefined {
  const db = getDatabase()
  return db.prepare(`
    SELECT ss.*, s.name as subject_name, t.name as topic_name
    FROM study_sessions ss
    LEFT JOIN subjects s ON ss.subject_id = s.id
    LEFT JOIN topics t ON ss.topic_id = t.id
    WHERE ss.id = ?
  `).get(id) as StudySession | undefined
}

export function getSessionsByDateRange(startDate: string, endDate: string): StudySession[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT ss.*, s.name as subject_name, t.name as topic_name
    FROM study_sessions ss
    LEFT JOIN subjects s ON ss.subject_id = s.id
    LEFT JOIN topics t ON ss.topic_id = t.id
    WHERE ss.started_at >= ? AND ss.started_at <= ?
    ORDER BY ss.started_at DESC
  `).all(startDate, endDate) as StudySession[]
}

export function getSessionStats(startDate: string, endDate: string) {
  const db = getDatabase()
  return db.prepare(`
    SELECT
      COUNT(*) as total_sessions,
      COALESCE(SUM(actual_minutes), 0) as total_minutes,
      COALESCE(AVG(actual_minutes), 0) as avg_minutes,
      COALESCE(MAX(actual_minutes), 0) as max_minutes
    FROM study_sessions
    WHERE started_at >= ? AND started_at <= ? AND status = 'completed'
  `).get(startDate, endDate)
}

export function getDailyStudyData(startDate: string, endDate: string) {
  const db = getDatabase()
  return db.prepare(`
    SELECT DATE(started_at) as date, COALESCE(SUM(actual_minutes), 0) as total_minutes, COUNT(*) as session_count
    FROM study_sessions
    WHERE started_at >= ? AND started_at <= ? AND status = 'completed'
    GROUP BY DATE(started_at)
    ORDER BY date
  `).all(startDate, endDate)
}

export function getStudyStreak(): { current: number; best: number } {
  const db = getDatabase()
  const days = db.prepare(`
    SELECT DISTINCT DATE(started_at) as date
    FROM study_sessions
    WHERE status = 'completed'
    ORDER BY date DESC
  `).all() as { date: string }[]

  if (days.length === 0) return { current: 0, best: 0 }

  let current = 0
  let best = 0
  let streak = 1
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // Check if the latest study day is today or yesterday
  if (days[0].date === today || days[0].date === yesterday) {
    current = 1
  }

  for (let i = 1; i < days.length; i++) {
    const prevDate = new Date(days[i - 1].date)
    const currDate = new Date(days[i].date)
    const diffDays = (prevDate.getTime() - currDate.getTime()) / 86400000

    if (diffDays === 1) {
      streak++
      if (i <= current || current > 0) current = streak
    } else {
      best = Math.max(best, streak)
      streak = 1
      if (current > 0 && i > current) break
    }
  }
  best = Math.max(best, streak)
  if (days[0].date === today || days[0].date === yesterday) {
    current = Math.min(current, streak)
  }

  return { current, best: Math.max(best, current) }
}
