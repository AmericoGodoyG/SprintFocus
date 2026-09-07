// Browser fallback adapter for window.api when running outside Electron (e.g. in Google Chrome / Edge)

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

  // Seed default settings if empty
  if (!localStorage.getItem('sprintfocus_settings')) {
    setItem('sprintfocus_settings', DEFAULT_SETTINGS)
  }

  const browserApi = {
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

    // === Notifications ===
    showNotification: async (title: string, body: string): Promise<void> => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body })
      } else {
        console.log(`[Notificação] ${title}: ${body}`)
      }
    },

    // === Window Controls (Browser Fallback) ===
    minimizeWindow: async (): Promise<void> => {
      console.log('[Window] minimizeWindow chamado no navegador')
    },
    maximizeWindow: async (): Promise<boolean> => {
      console.log('[Window] maximizeWindow chamado no navegador')
      return false
    },
    closeWindow: async (): Promise<void> => {
      console.log('[Window] closeWindow chamado no navegador')
    },
    isWindowMaximized: async (): Promise<boolean> => false,
    onMaximizedChange: (_callback: (isMaximized: boolean) => void) => {
      return () => {}
    }
  }

  // Bind to window.api
  ;(window as any).api = browserApi
}
