// Browser fallback adapter for window.api when running outside Electron (e.g. in Google Chrome / Edge)

interface Subject {
  id: number
  name: string
  color: string
  created_at?: string
}

interface Topic {
  id: number
  subject_id: number
  name: string
  created_at?: string
}

interface Flashcard {
  id: number
  pdf_id: number | null
  subject_id: number | null
  topic_id: number | null
  question: string
  answer: string
  difficulty: string
  source: string
  review_count: number
  next_review?: string
  ease_factor?: number
  interval_days?: number
}

const DEFAULT_SUBJECTS: Subject[] = [
  { id: 1, name: 'Matemática', color: '#6641ff', created_at: new Date().toISOString() },
  { id: 2, name: 'História', color: '#3b82f6', created_at: new Date().toISOString() },
  { id: 3, name: 'Biologia', color: '#10b981', created_at: new Date().toISOString() }
]

const DEFAULT_SETTINGS: Record<string, string> = {
  pomodoro_study_minutes: '50',
  pomodoro_short_break: '10',
  pomodoro_long_break: '30',
  pomodoro_cycles: '4',
  pomodoro_sound: 'true',
  pomodoro_notifications: 'true',
  theme: 'dark'
}

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('Erro ao salvar no localStorage:', e)
  }
}

export function initBrowserApiFallback(): void {
  if (typeof window === 'undefined') return
  if (window.api) return // Native Electron API already present

  console.info('%c[StudyFlow] Inicializando API de compatibilidade para Navegador Web (Armazenamento Local)', 'color: #6641ff; font-weight: bold;')

  // Seed default subjects if empty
  if (!localStorage.getItem('studyflow_subjects')) {
    setItem('studyflow_subjects', DEFAULT_SUBJECTS)
  }

  // Seed default settings if empty
  if (!localStorage.getItem('studyflow_settings')) {
    setItem('studyflow_settings', DEFAULT_SETTINGS)
  }

  const browserApi = {
    // === Subjects ===
    getSubjects: async (): Promise<Subject[]> => {
      return getItem<Subject[]>('studyflow_subjects', DEFAULT_SUBJECTS)
    },
    getSubjectById: async (id: number): Promise<Subject | undefined> => {
      const list = getItem<Subject[]>('studyflow_subjects', DEFAULT_SUBJECTS)
      return list.find(s => s.id === id)
    },
    createSubject: async (name: string, color: string): Promise<Subject> => {
      const list = getItem<Subject[]>('studyflow_subjects', DEFAULT_SUBJECTS)
      const cleanName = name.trim()
      if (!cleanName) throw new Error('O nome da disciplina não pode ser vazio.')

      const existing = list.find(s => s.name.toLowerCase().trim() === cleanName.toLowerCase())
      if (existing) return existing

      const newSubject: Subject = {
        id: Date.now(),
        name: cleanName,
        color: color || '#6641ff',
        created_at: new Date().toISOString()
      }
      const updated = [...list, newSubject]
      setItem('studyflow_subjects', updated)
      return newSubject
    },
    updateSubject: async (id: number, name: string, color: string): Promise<Subject | undefined> => {
      const list = getItem<Subject[]>('studyflow_subjects', DEFAULT_SUBJECTS)
      const cleanName = name.trim()
      const index = list.findIndex(s => s.id === id)
      if (index === -1) return undefined

      const updatedItem = { ...list[index], name: cleanName, color }
      list[index] = updatedItem
      setItem('studyflow_subjects', list)
      return updatedItem
    },
    deleteSubject: async (id: number): Promise<boolean> => {
      const list = getItem<Subject[]>('studyflow_subjects', DEFAULT_SUBJECTS)
      const filtered = list.filter(s => s.id !== id)
      setItem('studyflow_subjects', filtered)

      // Also clean up topics
      const topics = getItem<Topic[]>('studyflow_topics', [])
      setItem('studyflow_topics', topics.filter(t => t.subject_id !== id))
      return true
    },

    // === Topics ===
    getTopics: async (): Promise<Topic[]> => {
      return getItem<Topic[]>('studyflow_topics', [])
    },
    getTopicsBySubject: async (subjectId: number): Promise<Topic[]> => {
      const topics = getItem<Topic[]>('studyflow_topics', [])
      return topics.filter(t => t.subject_id === subjectId)
    },
    createTopic: async (subjectId: number, name: string): Promise<Topic> => {
      const topics = getItem<Topic[]>('studyflow_topics', [])
      const cleanName = name.trim()
      if (!cleanName) throw new Error('O nome do assunto não pode ser vazio.')

      const existing = topics.find(t => t.subject_id === subjectId && t.name.toLowerCase().trim() === cleanName.toLowerCase())
      if (existing) return existing

      const newTopic: Topic = {
        id: Date.now(),
        subject_id: subjectId,
        name: cleanName,
        created_at: new Date().toISOString()
      }
      setItem('studyflow_topics', [...topics, newTopic])
      return newTopic
    },
    updateTopic: async (id: number, name: string): Promise<Topic | undefined> => {
      const topics = getItem<Topic[]>('studyflow_topics', [])
      const index = topics.findIndex(t => t.id === id)
      if (index === -1) return undefined
      topics[index] = { ...topics[index], name: name.trim() }
      setItem('studyflow_topics', topics)
      return topics[index]
    },
    deleteTopic: async (id: number): Promise<boolean> => {
      const topics = getItem<Topic[]>('studyflow_topics', [])
      setItem('studyflow_topics', topics.filter(t => t.id !== id))
      return true
    },

    // === Sessions ===
    createSession: async (data: any): Promise<{ id: number }> => {
      const sessions = getItem<any[]>('studyflow_sessions', [])
      const id = Date.now()
      const newSession = { id, ...data, created_at: new Date().toISOString() }
      setItem('studyflow_sessions', [newSession, ...sessions])
      return { id }
    },
    finishSession: async (id: number, finishedAt: string, actualMinutes: number, status: string): Promise<any> => {
      const sessions = getItem<any[]>('studyflow_sessions', [])
      const index = sessions.findIndex(s => s.id === id)
      if (index !== -1) {
        sessions[index] = { ...sessions[index], finished_at: finishedAt, actual_minutes: actualMinutes, status }
        setItem('studyflow_sessions', sessions)
      }
      return true
    },
    getSessions: async (): Promise<any[]> => {
      return getItem<any[]>('studyflow_sessions', [])
    },
    getSessionsByDateRange: async (): Promise<any[]> => {
      return getItem<any[]>('studyflow_sessions', [])
    },
    getSessionStats: async (start?: string, end?: string): Promise<any> => {
      const sessions = getItem<any[]>('studyflow_sessions', [])
      const filtered = sessions.filter(s => {
        if (s.status !== 'completed' && s.actual_minutes === undefined) return false
        if (start && s.started_at && s.started_at < start) return false
        if (end && s.started_at && s.started_at > end) return false
        return true
      })
      const totalMinutes = filtered.reduce((sum, s) => sum + (Number(s.actual_minutes) || 0), 0)
      const avgMinutes = filtered.length > 0 ? Math.round(totalMinutes / filtered.length) : 0
      const maxMinutes = filtered.length > 0 ? Math.max(...filtered.map(s => Number(s.actual_minutes) || 0)) : 0
      return { total_minutes: totalMinutes, total_sessions: filtered.length, avg_minutes: avgMinutes, max_minutes: maxMinutes }
    },
    getSessionsBySubject: async (): Promise<any[]> => {
      return []
    },
    getDailyStudyData: async (start?: string, end?: string): Promise<any[]> => {
      const sessions = getItem<any[]>('studyflow_sessions', [])
      const dayMap: Record<string, { total_minutes: number; session_count: number }> = {}
      sessions.forEach(s => {
        if (!s.started_at) return
        const date = s.started_at.slice(0, 10)
        if (start && s.started_at < start) return
        if (end && s.started_at > end) return
        const mins = Number(s.actual_minutes) || 0
        if (!dayMap[date]) {
          dayMap[date] = { total_minutes: 0, session_count: 0 }
        }
        dayMap[date].total_minutes += mins
        dayMap[date].session_count += 1
      })
      return Object.keys(dayMap).sort().map(date => ({
        date,
        total_minutes: dayMap[date].total_minutes,
        session_count: dayMap[date].session_count
      }))
    },
    getStudyStreak: async (): Promise<{ current: number; best: number }> => {
      return { current: 1, best: 3 }
    },
    updateSession: async (id: number, data: any): Promise<any> => {
      const sessions = getItem<any[]>('studyflow_sessions', [])
      const index = sessions.findIndex(s => s.id === id)
      if (index !== -1) {
        sessions[index] = { ...sessions[index], ...data }
        setItem('studyflow_sessions', sessions)
      }
      return true
    },
    deleteSession: async (id: number): Promise<boolean> => {
      const sessions = getItem<any[]>('studyflow_sessions', [])
      setItem('studyflow_sessions', sessions.filter(s => s.id !== id))
      return true
    },

    // === Flashcards ===
    createFlashcard: async (data: any): Promise<Flashcard> => {
      const cards = getItem<Flashcard[]>('studyflow_flashcards', [])
      const newCard: Flashcard = {
        id: Date.now(),
        pdf_id: data.pdf_id || null,
        subject_id: data.subject_id || null,
        topic_id: data.topic_id || null,
        question: data.question,
        answer: data.answer,
        difficulty: data.difficulty || 'medium',
        source: data.source || 'manual',
        review_count: 0
      }
      setItem('studyflow_flashcards', [newCard, ...cards])
      return newCard
    },
    createFlashcardsBatch: async (cards: any[]): Promise<any> => {
      const existing = getItem<Flashcard[]>('studyflow_flashcards', [])
      const mapped = cards.map((c, idx) => ({ id: Date.now() + idx, ...c, review_count: 0 }))
      setItem('studyflow_flashcards', [...mapped, ...existing])
      return mapped
    },
    getFlashcards: async (subjectId?: number, topicId?: number, search?: string): Promise<Flashcard[]> => {
      let cards = getItem<Flashcard[]>('studyflow_flashcards', [])
      if (subjectId) cards = cards.filter(c => c.subject_id === subjectId)
      if (topicId) cards = cards.filter(c => c.topic_id === topicId)
      if (search) {
        const q = search.toLowerCase()
        cards = cards.filter(c => c.question.toLowerCase().includes(q) || c.answer.toLowerCase().includes(q))
      }
      return cards
    },
    getFlashcardsForReview: async (limit = 20, subjectId?: number): Promise<Flashcard[]> => {
      let cards = getItem<Flashcard[]>('studyflow_flashcards', [])
      if (subjectId) cards = cards.filter(c => c.subject_id === subjectId)
      return cards.slice(0, limit)
    },
    updateFlashcard: async (id: number, data: any): Promise<any> => {
      const cards = getItem<Flashcard[]>('studyflow_flashcards', [])
      const index = cards.findIndex(c => c.id === id)
      if (index !== -1) {
        cards[index] = { ...cards[index], ...data }
        setItem('studyflow_flashcards', cards)
        return cards[index]
      }
      return null
    },
    deleteFlashcard: async (id: number): Promise<boolean> => {
      const cards = getItem<Flashcard[]>('studyflow_flashcards', [])
      setItem('studyflow_flashcards', cards.filter(c => c.id !== id))
      return true
    },
    addFlashcardReview: async (flashcardId: number, result: string, difficulty: string): Promise<any> => {
      const cards = getItem<Flashcard[]>('studyflow_flashcards', [])
      const index = cards.findIndex(c => c.id === flashcardId)
      if (index !== -1) {
        cards[index].review_count = (cards[index].review_count || 0) + 1
        cards[index].difficulty = difficulty
        setItem('studyflow_flashcards', cards)
      }
      return true
    },
    getFlashcardStats: async (): Promise<any> => {
      const cards = getItem<Flashcard[]>('studyflow_flashcards', [])
      return { total: cards.length, reviewed: cards.filter(c => c.review_count > 0).length }
    },
    getFlashcardReviewsCount: async (): Promise<any[]> => {
      return []
    },

    // === PDFs ===
    selectPdfFile: async (): Promise<string | null> => {
      alert('Seleção nativa de arquivos disponível no aplicativo Desktop.')
      return null
    },
    extractPdfText: async (): Promise<string> => '',
    getPdfs: async (): Promise<any[]> => getItem<any[]>('studyflow_pdfs', []),
    getPdfById: async (id: number): Promise<any> => {
      const list = getItem<any[]>('studyflow_pdfs', [])
      return list.find(p => p.id === id)
    },
    createPdf: async (data: any): Promise<any> => {
      const list = getItem<any[]>('studyflow_pdfs', [])
      const newPdf = { id: Date.now(), ...data }
      setItem('studyflow_pdfs', [...list, newPdf])
      return newPdf
    },
    updatePdfSummary: async (id: number, summary: string): Promise<any> => {
      const list = getItem<any[]>('studyflow_pdfs', [])
      const index = list.findIndex(p => p.id === id)
      if (index !== -1) {
        list[index].summary = summary
        setItem('studyflow_pdfs', list)
      }
      return true
    },
    deletePdf: async (id: number): Promise<boolean> => {
      const list = getItem<any[]>('studyflow_pdfs', [])
      setItem('studyflow_pdfs', list.filter(p => p.id !== id))
      return true
    },

    // === AI ===
    generateSummary: async (): Promise<string> => 'Resumo gerado em modo demonstração web.',
    generateFlashcards: async (): Promise<any[]> => [],
    askQuestion: async (): Promise<string> => 'Resposta em modo web.',

    // === Settings ===
    getSettings: async (): Promise<Record<string, string>> => {
      return getItem<Record<string, string>>('studyflow_settings', DEFAULT_SETTINGS)
    },
    getSetting: async (key: string): Promise<string | undefined> => {
      const s = getItem<Record<string, string>>('studyflow_settings', DEFAULT_SETTINGS)
      return s[key]
    },
    setSetting: async (key: string, value: string): Promise<void> => {
      const s = getItem<Record<string, string>>('studyflow_settings', DEFAULT_SETTINGS)
      s[key] = value
      setItem('studyflow_settings', s)
    },
    setSettings: async (settings: Record<string, string>): Promise<void> => {
      const s = getItem<Record<string, string>>('studyflow_settings', DEFAULT_SETTINGS)
      const updated = { ...s, ...settings }
      setItem('studyflow_settings', updated)
    },
    setApiKey: async (): Promise<void> => {},
    getApiKey: async (): Promise<string> => '',
    hasApiKey: async (): Promise<boolean> => false,

    // === Notifications ===
    showNotification: async (title: string, body: string): Promise<void> => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body })
      } else {
        console.log(`[Notificação] ${title}: ${body}`)
      }
    },

    // === Backup ===
    exportBackup: async (): Promise<boolean> => true,
    importBackup: async (): Promise<boolean> => true,
    getDatabasePath: async (): Promise<string> => 'Armazenamento Local (Navegador)'
  }

  // Bind to window.api
  ;(window as any).api = browserApi
}
