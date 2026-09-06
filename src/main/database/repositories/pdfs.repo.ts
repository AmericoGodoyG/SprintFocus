import { getDatabase } from '../connection'

export interface PdfDocument {
  id: number
  subject_id: number | null
  topic_id: number | null
  filename: string
  filepath: string
  extracted_text: string | null
  summary: string | null
  page_count: number
  file_size: number
  created_at: string
  subject_name?: string
  topic_name?: string
}

export function createPdfDocument(data: {
  filename: string
  filepath: string
  extracted_text?: string
  page_count?: number
  file_size?: number
  subject_id?: number | null
  topic_id?: number | null
}): PdfDocument {
  const db = getDatabase()
  const result = db.prepare(`
    INSERT INTO pdf_documents (filename, filepath, extracted_text, page_count, file_size, subject_id, topic_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.filename,
    data.filepath,
    data.extracted_text ?? null,
    data.page_count ?? 0,
    data.file_size ?? 0,
    data.subject_id ?? null,
    data.topic_id ?? null
  )
  return getPdfById(result.lastInsertRowid as number) as PdfDocument
}

export function getPdfById(id: number): PdfDocument | undefined {
  const db = getDatabase()
  return db.prepare(`
    SELECT p.*, s.name as subject_name, t.name as topic_name
    FROM pdf_documents p
    LEFT JOIN subjects s ON p.subject_id = s.id
    LEFT JOIN topics t ON p.topic_id = t.id
    WHERE p.id = ?
  `).get(id) as PdfDocument | undefined
}

export function getAllPdfs(): PdfDocument[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT p.*, s.name as subject_name, t.name as topic_name
    FROM pdf_documents p
    LEFT JOIN subjects s ON p.subject_id = s.id
    LEFT JOIN topics t ON p.topic_id = t.id
    ORDER BY p.created_at DESC
  `).all() as PdfDocument[]
}

export function updatePdfSummary(id: number, summary: string): PdfDocument | undefined {
  const db = getDatabase()
  db.prepare('UPDATE pdf_documents SET summary = ? WHERE id = ?').run(summary, id)
  return getPdfById(id)
}

export function updatePdfSubject(id: number, subjectId: number | null, topicId: number | null): PdfDocument | undefined {
  const db = getDatabase()
  db.prepare('UPDATE pdf_documents SET subject_id = ?, topic_id = ? WHERE id = ?').run(subjectId, topicId, id)
  return getPdfById(id)
}

export function deletePdf(id: number): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM pdf_documents WHERE id = ?').run(id)
  return result.changes > 0
}
