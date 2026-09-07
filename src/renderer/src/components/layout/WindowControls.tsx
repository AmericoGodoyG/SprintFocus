import { useEffect, useState } from 'react'
import { Minus, Square, Copy, X } from 'lucide-react'
import styles from './WindowControls.module.css'

export default function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.api?.isWindowMaximized) return

    window.api.isWindowMaximized().then(setIsMaximized).catch(() => {})

    if (window.api.onMaximizedChange) {
      const unsubscribe = window.api.onMaximizedChange((max) => {
        setIsMaximized(max)
      })
      return unsubscribe
    }
  }, [])

  const handleMinimize = () => {
    window.api?.minimizeWindow?.()
  }

  const handleMaximize = async () => {
    if (window.api?.maximizeWindow) {
      const nextState = await window.api.maximizeWindow()
      setIsMaximized(Boolean(nextState))
    }
  }

  const handleClose = () => {
    window.api?.closeWindow?.()
  }

  return (
    <div className={styles.windowControlsContainer} aria-label="Controles da janela">
      <button
        type="button"
        className={styles.controlBtn}
        onClick={handleMinimize}
        title="Minimizar"
        aria-label="Minimizar janela"
        data-testid="window-minimize-btn"
      >
        <Minus size={13} strokeWidth={2.4} />
      </button>

      <button
        type="button"
        className={styles.controlBtn}
        onClick={handleMaximize}
        title={isMaximized ? 'Restaurar' : 'Maximizar'}
        aria-label={isMaximized ? 'Restaurar janela' : 'Maximizar janela'}
        data-testid="window-maximize-btn"
      >
        {isMaximized ? (
          <Copy size={11} strokeWidth={2.2} />
        ) : (
          <Square size={11} strokeWidth={2.2} />
        )}
      </button>

      <button
        type="button"
        className={`${styles.controlBtn} ${styles.closeBtn}`}
        onClick={handleClose}
        title="Fechar"
        aria-label="Fechar aplicação"
        data-testid="window-close-btn"
      >
        <X size={13} strokeWidth={2.4} />
      </button>
    </div>
  )
}
