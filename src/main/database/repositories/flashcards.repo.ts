import { getDatabase } from '../connection'

export interface Flashcard {
  id: number
  pdf_id: number | null
  subject_id: number | null
  topic_id: number | null
  question: string
  answer: string
  difficulty: string
  source: string
  review_count: number
  next_review: string | null
  ease_factor: number
  interval_days: number
  created_at: string
  updated_at: string
  // Joined fields
  subject_name?: string
  topic_name?: string
}

export interface CreateFlashcardData {
  pdf_id?: number | null
  subject_id?: number | null
  topic_id?: number | null
  question: string
  answer: string
  difficulty?: string
  source?: string
}

export interface FlashcardReview {
  id: number
  flashcard_id: number
  reviewed_at: string
  result: string
  difficulty_rating: string
  response_time_ms: number
}

export function createFlashcard(data: CreateFlashcardData): Flashcard {
  const db = getDatabase()
  const result = db.prepare(`
    INSERT INTO flashcards (pdf_id, subject_id, topic_id, question, answer, difficulty, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.pdf_id ?? null,
    data.subject_id ?? null,
    data.topic_id ?? null,
    data.question,
    data.answer,
    data.difficulty ?? 'medium',
    data.source ?? 'manual'
  )
  return getFlashcardById(result.lastInsertRowid as number) as Flashcard
}

export function createFlashcardsBatch(cards: CreateFlashcardData[]): Flashcard[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO flashcards (pdf_id, subject_id, topic_id, question, answer, difficulty, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = db.transaction((cards: CreateFlashcardData[]) => {
    const ids: number[] = []
    for (const card of cards) {
      const result = stmt.run(
        card.pdf_id ?? null,
        card.subject_id ?? null,
        card.topic_id ?? null,
        card.question,
        card.answer,
        card.difficulty ?? 'medium',
        card.source ?? 'ai'
      )
      ids.push(result.lastInsertRowid as number)
    }
    return ids
  })

  const ids = insertMany(cards)
  return ids.map(id => getFlashcardById(id) as Flashcard)
}

export function getFlashcardById(id: number): Flashcard | undefined {
  const db = getDatabase()
  return db.prepare(`
    SELECT f.*, s.name as subject_name, t.name as topic_name
    FROM flashcards f
    LEFT JOIN subjects s ON f.subject_id = s.id
    LEFT JOIN topics t ON f.topic_id = t.id
    WHERE f.id = ?
  `).get(id) as Flashcard | undefined
}

export function getAllFlashcards(subjectId?: number, topicId?: number, search?: string): Flashcard[] {
  const db = getDatabase()
  let query = `
    SELECT f.*, s.name as subject_name, t.name as topic_name
    FROM flashcards f
    LEFT JOIN subjects s ON f.subject_id = s.id
    LEFT JOIN topics t ON f.topic_id = t.id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (subjectId) { query += ' AND f.subject_id = ?'; params.push(subjectId) }
  if (topicId) { query += ' AND f.topic_id = ?'; params.push(topicId) }
  if (search) { query += ' AND (f.question LIKE ? OR f.answer LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }

  query += ' ORDER BY f.created_at DESC'
  return db.prepare(query).all(...params) as Flashcard[]
}

export function getFlashcardsForReview(limit: number = 20, subjectId?: number): Flashcard[] {
  const db = getDatabase()
  let query = `
    SELECT f.*, s.name as subject_name, t.name as topic_name
    FROM flashcards f
    LEFT JOIN subjects s ON f.subject_id = s.id
    LEFT JOIN topics t ON f.topic_id = t.id
    WHERE (f.next_review IS NULL OR f.next_review <= datetime('now'))
  `
  const params: unknown[] = []

  if (subjectId) { query += ' AND f.subject_id = ?'; params.push(subjectId) }

  query += ' ORDER BY f.next_review ASC, f.review_count ASC LIMIT ?'
  params.push(limit)

  return db.prepare(query).all(...params) as Flashcard[]
}

export function updateFlashcard(id: number, data: Partial<CreateFlashcardData>): Flashcard | undefined {
  const db = getDatabase()
  const fields: string[] = ['updated_at = CURRENT_TIMESTAMP']
  const values: unknown[] = []

  if (data.question !== undefined) { fields.push('question = ?'); values.push(data.question) }
  if (data.answer !== undefined) { fields.push('answer = ?'); values.push(data.answer) }
  if (data.difficulty !== undefined) { fields.push('difficulty = ?'); values.push(data.difficulty) }
  if (data.subject_id !== undefined) { fields.push('subject_id = ?'); values.push(data.subject_id) }
  if (data.topic_id !== undefined) { fields.push('topic_id = ?'); values.push(data.topic_id) }

  values.push(id)
  db.prepare(`UPDATE flashcards SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getFlashcardById(id)
}

export function deleteFlashcard(id: number): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM flashcards WHERE id = ?').run(id)
  return result.changes > 0
}

export function addReview(flashcardId: number, result: string, difficultyRating: string, responseTimeMs: number = 0): void {
  const db = getDatabase()

  db.prepare(`
    INSERT INTO flashcard_reviews (flashcard_id, result, difficulty_rating, response_time_ms)
    VALUES (?, ?, ?, ?)
  `).run(flashcardId, result, difficultyRating, responseTimeMs)

  // Update flashcard review count and next review date
  const daysMap: Record<string, number> = { easy: 7, medium: 3, hard: 1 }
  const days = daysMap[difficultyRating] || 3

  db.prepare(`
    UPDATE flashcards SET
      review_count = review_count + 1,
      difficulty = ?,
      next_review = datetime('now', '+' || ? || ' days'),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(difficultyRating, days, flashcardId)
}

export function getFlashcardStats() {
  const db = getDatabase()
  return db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN difficulty = 'easy' THEN 1 ELSE 0 END) as easy,
      SUM(CASE WHEN difficulty = 'medium' THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN difficulty = 'hard' THEN 1 ELSE 0 END) as hard,
      SUM(CASE WHEN next_review IS NULL OR next_review <= datetime('now') THEN 1 ELSE 0 END) as due
    FROM flashcards
  `).get()
}

export function getReviewsCount(startDate: string, endDate: string): number {
  const db = getDatabase()
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM flashcard_reviews
    WHERE reviewed_at >= ? AND reviewed_at <= ?
  `).get(startDate, endDate) as { count: number }
  return result.count
}
