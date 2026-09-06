import { getDatabase } from '../connection'

export interface Topic {
  id: number
  subject_id: number
  name: string
  created_at: string
}

export function getTopicsBySubject(subjectId: number): Topic[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM topics WHERE subject_id = ? ORDER BY name').all(subjectId) as Topic[]
}

export function getAllTopics(): Topic[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM topics ORDER BY name').all() as Topic[]
}

export function getTopicById(id: number): Topic | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as Topic | undefined
}

export function createTopic(subjectId: number, name: string): Topic {
  const db = getDatabase()
  const cleanName = name.trim()
  if (!cleanName) {
    throw new Error('O nome do assunto não pode ser vazio.')
  }
  const existing = db.prepare('SELECT * FROM topics WHERE subject_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?))').get(subjectId, cleanName) as Topic | undefined
  if (existing) {
    return existing
  }
  const result = db.prepare('INSERT INTO topics (subject_id, name) VALUES (?, ?)').run(subjectId, cleanName)
  const newId = Number(result.lastInsertRowid)
  const created = getTopicById(newId)
  if (!created) {
    throw new Error('Falha ao recuperar assunto criado')
  }
  return created
}

export function updateTopic(id: number, name: string): Topic | undefined {
  const db = getDatabase()
  const cleanName = name.trim()
  if (!cleanName) {
    throw new Error('O nome do assunto não pode ser vazio.')
  }
  db.prepare('UPDATE topics SET name = ? WHERE id = ?').run(cleanName, id)
  return getTopicById(id)
}

export function deleteTopic(id: number): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM topics WHERE id = ?').run(id)
  return result.changes > 0
}
