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

  console.info('%c[SprintFocus] Inicializando API de compatibilidade para Navegador Web (Armazenamento Local)', 'color: #6641ff; font-weight: bold;')

  // Seed default subjects if empty
  if (!localStorage.getItem('sprintfocus_subjects')) {
    setItem('sprintfocus_subjects', DEFAULT_SUBJECTS)
  }

  // Seed default settings if empty
  if (!localStorage.getItem('sprintfocus_settings')) {
    setItem('sprintfocus_settings', DEFAULT_SETTINGS)
  }

  const browserApi = {
    // === Subjects ===
    getSubjects: async (): Promise<Subject[]> => {
      return getItem<Subject[]>('sprintfocus_subjects', DEFAULT_SUBJECTS)
    },
    getSubjectById: async (id: number): Promise<Subject | undefined> => {
      const list = getItem<Subject[]>('sprintfocus_subjects', DEFAULT_SUBJECTS)
      return list.find(s => s.id === id)
    },
    createSubject: async (name: string, color: string): Promise<Subject> => {
      const list = getItem<Subject[]>('sprintfocus_subjects', DEFAULT_SUBJECTS)
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
      setItem('sprintfocus_subjects', updated)
      return newSubject
    },
    updateSubject: async (id: number, name: string, color: string): Promise<Subject | undefined> => {
      const list = getItem<Subject[]>('sprintfocus_subjects', DEFAULT_SUBJECTS)
      const cleanName = name.trim()
      const index = list.findIndex(s => s.id === id)
      if (index === -1) return undefined

      const updatedItem = { ...list[index], name: cleanName, color }
      list[index] = updatedItem
      setItem('sprintfocus_subjects', list)
      return updatedItem
    },
    deleteSubject: async (id: number): Promise<boolean> => {
      const list = getItem<Subject[]>('sprintfocus_subjects', DEFAULT_SUBJECTS)
      const filtered = list.filter(s => s.id !== id)
      setItem('sprintfocus_subjects', filtered)

      // Also clean up topics
      const topics = getItem<Topic[]>('sprintfocus_topics', [])
      setItem('sprintfocus_topics', topics.filter(t => t.subject_id !== id))
      return true
    },

    // === Topics ===
    getTopics: async (): Promise<Topic[]> => {
      return getItem<Topic[]>('sprintfocus_topics', [])
    },
    getTopicsBySubject: async (subjectId: number): Promise<Topic[]> => {
      const topics = getItem<Topic[]>('sprintfocus_topics', [])
      return topics.filter(t => t.subject_id === subjectId)
    },
    createTopic: async (subjectId: number, name: string): Promise<Topic> => {
      const topics = getItem<Topic[]>('sprintfocus_topics', [])
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
      setItem('sprintfocus_topics', [...topics, newTopic])
      return newTopic
    },
    updateTopic: async (id: number, name: string): Promise<Topic | undefined> => {
      const topics = getItem<Topic[]>('sprintfocus_topics', [])
      const index = topics.findIndex(t => t.id === id)
      if (index === -1) return undefined
      topics[index] = { ...topics[index], name: name.trim() }
      setItem('sprintfocus_topics', topics)
      return topics[index]
    },
    deleteTopic: async (id: number): Promise<boolean> => {
      const topics = getItem<Topic[]>('sprintfocus_topics', [])
      setItem('sprintfocus_topics', topics.filter(t => t.id !== id))
      return true
    },

    // === Sessions ===
    createSession: async (data: any): Promise<{ id: number }> => {
      const sessions = getItem<any[]>('sprintfocus_sessions', [])
      const id = Date.now()
      const newSession = { id, ...data, created_at: new Date().toISOString() }
      setItem('sprintfocus_sessions', [newSession, ...sessions])
      return { id }
    },
    finishSession: async (id: number, finishedAt: string, actualMinutes: number, status: string): Promise<any> => {
      const sessions = getItem<any[]>('sprintfocus_sessions', [])
      const index = sessions.findIndex(s => s.id === id)
      if (index !== -1) {
        sessions[index] = { ...sessions[index], finished_at: finishedAt, actual_minutes: actualMinutes, status }
        setItem('sprintfocus_sessions', sessions)
      }
      return true
    },
    getSessions: async (): Promise<any[]> => {
      return getItem<any[]>('sprintfocus_sessions', [])
    },
    getSessionsByDateRange: async (): Promise<any[]> => {
      return getItem<any[]>('sprintfocus_sessions', [])
    },
    getSessionStats: async (start?: string, end?: string): Promise<any> => {
      const sessions = getItem<any[]>('sprintfocus_sessions', [])
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
      const sessions = getItem<any[]>('sprintfocus_sessions', [])
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
      const sessions = getItem<any[]>('sprintfocus_sessions', [])
      const index = sessions.findIndex(s => s.id === id)
      if (index !== -1) {
        sessions[index] = { ...sessions[index], ...data }
        setItem('sprintfocus_sessions', sessions)
      }
      return true
    },
    deleteSession: async (id: number): Promise<boolean> => {
      const sessions = getItem<any[]>('sprintfocus_sessions', [])
      setItem('sprintfocus_sessions', sessions.filter(s => s.id !== id))
      return true
    },

    // === Settings ===
    getSettings: async (): Promise<Record<string, string>> => {
      return getItem<Record<string, string>>('sprintfocus_settings', DEFAULT_SETTINGS)
    },
    getSetting: async (key: string): Promise<string | undefined> => {
      const s = getItem<Record<string, string>>('sprintfocus_settings', DEFAULT_SETTINGS)
      return s[key]
    },
    setSetting: async (key: string, value: string): Promise<void> => {
      const s = getItem<Record<string, string>>('sprintfocus_settings', DEFAULT_SETTINGS)
      s[key] = value
      setItem('sprintfocus_settings', s)
    },
    setSettings: async (settings: Record<string, string>): Promise<void> => {
      const s = getItem<Record<string, string>>('sprintfocus_settings', DEFAULT_SETTINGS)
      const updated = { ...s, ...settings }
      setItem('sprintfocus_settings', updated)
    },

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
