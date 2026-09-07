import React, { useState, useEffect } from 'react'
import { X, RotateCcw, AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react'
import styles from './SettingsModal.module.css'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [showAttention, setShowAttention] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Reset internal states when opened
  useEffect(() => {
    if (isOpen) {
      setShowAttention(false)
      setIsResetting(false)
      setIsSuccess(false)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        if (showAttention) {
          setShowAttention(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, showAttention, onClose])

  if (!isOpen) return null

  async function handleConfirmReset() {
    setIsResetting(true)
    try {
      if (window.api?.clearAllSessions) {
        await window.api.clearAllSessions()
      }
      // Also clear any browser fallback storage for sessions
      try {
        localStorage.removeItem('sprintfocus_sessions')
      } catch {}

      setIsSuccess(true)

      // Notify window listeners
      window.dispatchEvent(new CustomEvent('study-data-reset'))

      // Reload app smoothly after brief confirmation
      setTimeout(() => {
        window.location.reload()
      }, 600)
    } catch (err) {
      console.error('Erro ao apagar dados do Pomodoro:', err)
      setIsResetting(false)
    }
  }

  return (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isResetting) {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className={styles.modalChamber}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <RotateCcw size={20} className={styles.headerIcon} />
            <h2 id="settings-modal-title" className={styles.modalTitle}>Configurações</h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isResetting}
            title="Fechar"
            aria-label="Fechar configurações"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {!showAttention ? (
          <div className={styles.modalBody}>
            <div>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Gerenciamento de Dados</h3>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <div className={styles.settingIconWrapper}>
                    <RotateCcw size={18} />
                  </div>
                  <div className={styles.settingText}>
                    <h4 className={styles.settingName}>Apagar todos os registros do Pomodoro</h4>
                    <p className={styles.settingDesc}>
                      Apaga dados de gráficos no menu Métricas, horas estudadas acumuladas e sequência de dias (streak).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.dangerBtn}
                  onClick={() => setShowAttention(true)}
                  title="Apagar todos os registros"
                >
                  Apagar registros
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Attention / Confirmation Dialog */
          <div className={styles.warningOverlay}>
            <div className={styles.warningIconBox}>
              <AlertTriangle size={32} />
            </div>

            <h3 className={styles.warningTitle}>Atenção: Ação Irreversível!</h3>

            <p className={styles.warningDescription}>
              Se você prosseguir, <strong>todos os seus dados salvos serão apagados permanentemente</strong>.
              Essa operação não poderá ser desfeita.
            </p>

            <div className={styles.warningListCard}>
              <div className={styles.warningListTitle}>Itens que serão apagados:</div>
              <ul className={styles.warningList}>
                <li>Histórico completo de sessões do Pomodoro</li>
                <li>Horas e minutos estudados acumulados</li>
                <li>Gráficos de evolução diária e estatísticas</li>
                <li>Sequência de dias consecutivos estudados (streak)</li>
              </ul>
            </div>

            <div className={styles.warningActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setShowAttention(false)}
                disabled={isResetting}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={styles.confirmDangerBtn}
                onClick={handleConfirmReset}
                disabled={isResetting}
              >
                {isResetting ? (
                  <>Apagando dados...</>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 size={16} /> Dados apagados!
                  </>
                ) : (
                  <>
                    <Trash2 size={16} /> Sim, apagar tudo
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
