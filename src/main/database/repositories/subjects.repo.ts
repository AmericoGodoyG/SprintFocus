import { getDatabase } from '../connection'

export interface Subject {
  id: number
  name: string
  color: string
  created_at: string
}

export function getAllSubjects(): Subject[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM subjects ORDER BY name').all() as Subject[]
}

export function getSubjectById(id: number): Subject | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) as Subject | undefined
}

export function getSubjectByName(name: string): Subject | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM subjects WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(name) as Subject | undefined
}

export function createSubject(name: string, color: string = '#6641ff'): Subject {
  const db = getDatabase()
  const cleanName = name.trim()
  if (!cleanName) {
    throw new Error('O nome da disciplina não pode ser vazio.')
  }
  const existing = getSubjectByName(cleanName)
  if (existing) {
    return existing
  }
  const result = db.prepare('INSERT INTO subjects (name, color) VALUES (?, ?)').run(cleanName, color)
  const newId = Number(result.lastInsertRowid)
  const created = getSubjectById(newId)
  if (!created) {
    throw new Error('Falha ao recuperar disciplina criada')
  }
  return created
}

export function updateSubject(id: number, name: string, color: string): Subject | undefined {
  const db = getDatabase()
  const cleanName = name.trim()
  if (!cleanName) {
    throw new Error('O nome da disciplina não pode ser vazio.')
  }
  const existing = db.prepare('SELECT * FROM subjects WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND id != ?').get(cleanName, id) as Subject | undefined
  if (existing) {
    throw new Error('Já existe outra disciplina com este nome.')
  }
  db.prepare('UPDATE subjects SET name = ?, color = ? WHERE id = ?').run(cleanName, color, id)
  return getSubjectById(id)
}

export function deleteSubject(id: number): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM subjects WHERE id = ?').run(id)
  return result.changes > 0
}
