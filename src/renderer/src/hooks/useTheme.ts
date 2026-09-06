import { create } from 'zustand'

export type ThemeMode = 'dark' | 'light'

interface ThemeStore {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  initTheme: () => Promise<void>
}

const getStoredTheme = (): ThemeMode => {
  try {
    const saved = localStorage.getItem('studyflow-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // ignore
  }
  return 'dark'
}

const applyThemeToDOM = (theme: ThemeMode) => {
  document.documentElement.setAttribute('data-theme', theme)
  try {
    localStorage.setItem('studyflow-theme', theme)
  } catch {
    // ignore
  }
}

export const useTheme = create<ThemeStore>((set, get) => {
  // Apply initial theme immediately upon store creation
  const initialTheme = getStoredTheme()
  applyThemeToDOM(initialTheme)

  return {
    theme: initialTheme,

    setTheme: (newTheme: ThemeMode) => {
      applyThemeToDOM(newTheme)
      set({ theme: newTheme })

      // Persist to SQLite settings if available
      try {
        if (window.api && typeof window.api.setSetting === 'function') {
          window.api.setSetting('theme', newTheme).catch(() => {})
        }
      } catch {
        // ignore
      }
    },

    toggleTheme: () => {
      const nextTheme = get().theme === 'dark' ? 'light' : 'dark'
      get().setTheme(nextTheme)
    },

    initTheme: async () => {
      try {
        if (window.api && typeof window.api.getSetting === 'function') {
          const dbTheme = await window.api.getSetting('theme') as string | undefined
          if (dbTheme === 'light' || dbTheme === 'dark') {
            if (dbTheme !== get().theme) {
              applyThemeToDOM(dbTheme)
              set({ theme: dbTheme })
            }
          }
        }
      } catch {
        // fallback to local stored theme
      }
    }
  }
})
