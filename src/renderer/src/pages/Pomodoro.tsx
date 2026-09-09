import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Play, Pause, RotateCcw, SkipForward, Coffee, BookOpen, Volume2, VolumeX,
  Check, X, Minus, Plus, Sliders, Square
} from 'lucide-react'
import { initBrowserApiFallback } from '../api/browserFallback'
import { HorizontalRulerPicker } from '../components/common/HorizontalRulerPicker'
import styles from './Pomodoro.module.css'

function getApi() {
  if (typeof window !== 'undefined' && !window.api) {
    initBrowserApiFallback()
  }
  return window.api
}

type SessionType = 'study' | 'short_break' | 'long_break'

interface PomodoroSettings {
  studyMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  cyclesBeforeLongBreak: number
  soundEnabled: boolean
  notificationsEnabled: boolean
}

const defaultSettings: PomodoroSettings = {
  studyMinutes: 50,
  shortBreakMinutes: 10,
  longBreakMinutes: 30,
  cyclesBeforeLongBreak: 4,
  soundEnabled: true,
  notificationsEnabled: true
}

const SESSION_LABELS: Record<SessionType, string> = {
  study: 'Foco',
  short_break: 'Pausa Curta',
  long_break: 'Pausa Longa'
}

const SESSION_COLORS: Record<SessionType, string> = {
  study: '#6641ff',
  short_break: '#34d399',
  long_break: '#8868ff'
}

// Background worker ticker to guarantee ticking even if main UI thread is throttled
function createTimerWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined' || typeof Blob === 'undefined') {
    return null
  }
  try {
    const workerScript = `
      let timerId = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (timerId) clearInterval(timerId);
          timerId = setInterval(function() {
            self.postMessage('tick');
          }, 250);
        } else if (e.data === 'stop') {
          if (timerId) {
            clearInterval(timerId);
            timerId = null;
          }
        }
      };
    `
    const blob = new Blob([workerScript], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    return new Worker(url)
  } catch (err) {
    console.warn('Web Worker ticker not available, using interval fallback:', err)
    return null
  }
}

function Pomodoro() {
  const [settings, setSettings] = useState<PomodoroSettings>(defaultSettings)
  const [sessionType, setSessionType] = useState<SessionType>('study')
  const [currentCycle, setCurrentCycle] = useState(1)
  const [timeLeft, setTimeLeft] = useState(defaultSettings.studyMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [startedAt, setStartedAt] = useState<Date | null>(null)

  // Finish Timer Confirmation Modal State
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false)
  // Reset Timer Confirmation Modal State
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false)

  // Direct Time Edit on Dial
  const [isEditingTime, setIsEditingTime] = useState(false)
  const [customMinutesInput, setCustomMinutesInput] = useState('')
  const timeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditingTime) {
      setTimeout(() => timeInputRef.current?.focus(), 50)
    }
  }, [isEditingTime])

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const targetEndTimeRef = useRef<number | null>(null)
  const isCompletingRef = useRef<boolean>(false)
  const timeLeftRef = useRef<number>(timeLeft)
  const isRunningRef = useRef<boolean>(isRunning)
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    timeLeftRef.current = timeLeft
  }, [timeLeft])

  useEffect(() => {
    isRunningRef.current = isRunning
  }, [isRunning])

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const s = await getApi().getSettings() as Record<string, string>
      const loaded: PomodoroSettings = {
        studyMinutes: parseInt(s.pomodoro_study_minutes) || 50,
        shortBreakMinutes: parseInt(s.pomodoro_short_break) || 10,
        longBreakMinutes: parseInt(s.pomodoro_long_break) || 30,
        cyclesBeforeLongBreak: parseInt(s.pomodoro_cycles) || 4,
        soundEnabled: s.pomodoro_sound !== 'false',
        notificationsEnabled: s.pomodoro_notifications !== 'false'
      }
      setSettings(loaded)
      setTimeLeft(loaded.studyMinutes * 60)
    } catch (e) {
      console.error('Error loading settings:', e)
    }
  }

  function handleUpdateStudyMinutes(mins: number) {
    const val = Math.max(1, Math.min(180, mins))
    const updated = { ...settings, studyMinutes: val }
    setSettings(updated)
    if (!isRunning && sessionType === 'study') {
      setTimeLeft(val * 60)
    }
    getApi().setSetting('pomodoro_study_minutes', String(val)).catch(console.error)
  }

  function handleSaveCustomMinutes(minsToApply?: number) {
    const rawVal = minsToApply !== undefined ? minsToApply : (timeInputRef.current?.value || customMinutesInput)
    const parsed = typeof rawVal === 'number' ? rawVal : parseInt(String(rawVal), 10)
    if (isNaN(parsed) || parsed < 1 || parsed > 180) {
      setIsEditingTime(false)
      return
    }

    if (sessionType === 'study') {
      handleUpdateStudyMinutes(parsed)
    } else if (sessionType === 'short_break') {
      handleUpdateShortBreak(parsed)
    }

    const newSec = parsed * 60
    setTimeLeft(newSec)
    if (isRunning) {
      targetEndTimeRef.current = Date.now() + newSec * 1000
    }
    setIsEditingTime(false)
  }

  function handleUpdateShortBreak(mins: number) {
    const val = Math.max(1, Math.min(60, mins))
    const updated = { ...settings, shortBreakMinutes: val }
    setSettings(updated)
    if (!isRunning && sessionType === 'short_break') {
      setTimeLeft(val * 60)
    }
    getApi().setSetting('pomodoro_short_break', String(val)).catch(console.error)
  }


  function handleUpdateCycles(cycles: number) {
    const val = Math.max(1, Math.min(12, cycles))
    const updated = { ...settings, cyclesBeforeLongBreak: val }
    setSettings(updated)
    if (currentCycle > val) {
      setCurrentCycle(val)
    }
    getApi().setSetting('pomodoro_cycles', String(val)).catch(console.error)
  }

  function getTotalSeconds(type: SessionType): number {
    switch (type) {
      case 'study': return settings.studyMinutes * 60
      case 'short_break': return settings.shortBreakMinutes * 60
      case 'long_break': return settings.longBreakMinutes * 60
    }
  }

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const progress = Math.min(Math.max(1 - timeLeft / getTotalSeconds(sessionType), 0), 1)
  const radius = 125
  const circumference = 2 * Math.PI * radius
  const angleRad = (-90 + progress * 360) * (Math.PI / 180)
  const dotX = 140 + radius * Math.cos(angleRad)
  const dotY = 140 + radius * Math.sin(angleRad)

  // Play notification sound
  const playSound = useCallback(() => {
    if (!settings.soundEnabled) return
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.connect(gain)
      gain.connect(ctx.destination)

      oscillator.frequency.setValueAtTime(800, ctx.currentTime)
      oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.15)
      oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.6)
    } catch (e) {
      console.error('Sound error:', e)
    }
  }, [settings.soundEnabled])

  // Handle session completion
  const handleSessionComplete = useCallback(async () => {
    if (isCompletingRef.current) return
    isCompletingRef.current = true

    targetEndTimeRef.current = null
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (workerRef.current) {
      workerRef.current.postMessage('stop')
    }

    playSound()

    // Show notification
    if (settings.notificationsEnabled) {
      const messages: Record<SessionType, string> = {
        study: 'Pomodoro concluído! Hora da pausa. 🎉',
        short_break: 'Pausa terminada. Vamos estudar? 📚',
        long_break: 'Pausa longa terminada. Vamos estudar? 📚'
      }
      await getApi().showNotification('SprintFocus', messages[sessionType])
    }

    // Save study session
    if (sessionType === 'study' && sessionId) {
      const now = new Date()
      const elapsedMinutes = Math.round((now.getTime() - (startedAt?.getTime() || now.getTime())) / 60000)
      const actualMinutes = Math.max(settings.studyMinutes, elapsedMinutes)
      await getApi().finishSession(sessionId, now.toISOString(), actualMinutes, 'completed')
      setSessionId(null)
      setStartedAt(null)
    }

    // Transition to next session
    let nextType: SessionType
    let nextCycle = currentCycle

    if (sessionType === 'study') {
      nextType = 'short_break'
    } else {
      nextType = 'study'
      if (currentCycle >= settings.cyclesBeforeLongBreak) {
        nextCycle = 1
      } else {
        nextCycle = currentCycle + 1
      }
    }

    setSessionType(nextType)
    setCurrentCycle(nextCycle)
    setTimeLeft(getTotalSeconds(nextType))
    isCompletingRef.current = false
  }, [sessionType, currentCycle, settings, playSound, sessionId, startedAt])

  // Synchronize timer with real-world wall clock timestamp
  const syncTimer = useCallback(() => {
    if (!isRunningRef.current || !targetEndTimeRef.current || isCompletingRef.current) return

    const now = Date.now()
    const diffMs = targetEndTimeRef.current - now
    const remainingSeconds = Math.max(0, Math.ceil(diffMs / 1000))

    setTimeLeft(remainingSeconds)

    if (diffMs <= 0) {
      handleSessionComplete()
    }
  }, [handleSessionComplete])

  // Initialize and manage dedicated Web Worker background ticker
  useEffect(() => {
    const worker = createTimerWorker()
    if (worker) {
      worker.onmessage = (e) => {
        if (e.data === 'tick') {
          syncTimer()
        }
      }
      workerRef.current = worker
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [syncTimer])

  // Timer ticker effect: controls both Web Worker and setInterval fallback
  useEffect(() => {
    if (isRunning) {
      if (!targetEndTimeRef.current) {
        targetEndTimeRef.current = Date.now() + timeLeftRef.current * 1000
      }

      syncTimer()

      if (workerRef.current) {
        workerRef.current.postMessage('start')
      }

      intervalRef.current = setInterval(() => {
        syncTimer()
      }, 250)
    } else {
      if (workerRef.current) {
        workerRef.current.postMessage('stop')
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (workerRef.current) {
        workerRef.current.postMessage('stop')
      }
    }
  }, [isRunning, syncTimer])

  // Immediately resync timer whenever window becomes visible or receives focus
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' || !document.hidden) {
        syncTimer()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    window.addEventListener('focus', handleVisibilityOrFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      window.removeEventListener('focus', handleVisibilityOrFocus)
    }
  }, [syncTimer])

  // Start / Pause
  async function toggleTimer() {
    if (isRunning) {
      // Pause: recalculate exact remaining time and freeze
      setIsRunning(false)
      if (targetEndTimeRef.current) {
        const remainingSeconds = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000))
        setTimeLeft(remainingSeconds)
        targetEndTimeRef.current = null
      }
    } else {
      // Start or Resume: establish target end timestamp
      const targetSec = timeLeftRef.current > 0 ? timeLeftRef.current : getTotalSeconds(sessionType)
      targetEndTimeRef.current = Date.now() + targetSec * 1000

      // Create session record when starting study
      if (sessionType === 'study' && !sessionId) {
        const now = new Date()
        setStartedAt(now)
        try {
          const session = await getApi().createSession({
            subject_id: null,
            topic_id: null,
            started_at: now.toISOString(),
            planned_minutes: settings.studyMinutes,
            session_type: 'study',
            cycle_number: currentCycle
          }) as { id: number }
          setSessionId(session.id)
        } catch (e) {
          console.error('Error creating session:', e)
        }
      }
      setIsRunning(true)
    }
  }

  // Reset
  function resetTimer() {
    setIsRunning(false)
    targetEndTimeRef.current = null
    const defaultSec = getTotalSeconds(sessionType)
    setTimeLeft(defaultSec)
    if (sessionId) {
      const now = new Date()
      const actualMinutes = Math.round((now.getTime() - (startedAt?.getTime() || now.getTime())) / 60000)
      getApi().finishSession(sessionId, now.toISOString(), actualMinutes, 'cancelled')
      setSessionId(null)
      setStartedAt(null)
    }
  }

  function handleResetTimerConfirm() {
    setShowResetConfirmModal(false)
    resetTimer()
  }

  // Skip
  function skipSession() {
    setIsRunning(false)
    targetEndTimeRef.current = null
    if (sessionId) {
      const now = new Date()
      const actualMinutes = Math.round((now.getTime() - (startedAt?.getTime() || now.getTime())) / 60000)
      getApi().finishSession(sessionId, now.toISOString(), actualMinutes, 'skipped')
      setSessionId(null)
      setStartedAt(null)
    }
    handleSessionComplete()
  }

  // Handle explicit completion via "Finalizar Timer" modal
  async function handleFinishTimerConfirm() {
    setShowFinishConfirmModal(false)
    setIsRunning(false)
    targetEndTimeRef.current = null
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (workerRef.current) {
      workerRef.current.postMessage('stop')
    }

    playSound()

    if (settings.notificationsEnabled) {
      await getApi().showNotification('SprintFocus', 'Ciclo de foco finalizado com sucesso! 🎉')
    }

    const now = new Date()

    if (sessionType === 'study') {
      const elapsedSeconds = Math.max(1, (settings.studyMinutes * 60) - timeLeft)
      const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60))

      if (sessionId) {
        await getApi().finishSession(sessionId, now.toISOString(), elapsedMinutes, 'completed')
        setSessionId(null)
        setStartedAt(null)
      } else {
        try {
          const session = await getApi().createSession({
            subject_id: null,
            topic_id: null,
            started_at: new Date(now.getTime() - elapsedSeconds * 1000).toISOString(),
            planned_minutes: settings.studyMinutes,
            session_type: 'study',
            cycle_number: currentCycle
          }) as { id: number }
          await getApi().finishSession(session.id, now.toISOString(), elapsedMinutes, 'completed')
        } catch (e) {
          console.error('Error completing session on finish timer:', e)
        }
      }
    }

    // Transition to next cycle
    let nextType: SessionType
    let nextCycle = currentCycle

    if (sessionType === 'study') {
      nextType = 'short_break'
    } else {
      nextType = 'study'
      if (currentCycle >= settings.cyclesBeforeLongBreak) {
        nextCycle = 1
      } else {
        nextCycle = currentCycle + 1
      }
    }

    setSessionType(nextType)
    setCurrentCycle(nextCycle)
    setTimeLeft(getTotalSeconds(nextType))
  }

  return (
    <div className={styles.pomodoro}>
      <div className={styles.unifiedChamber}>
        {/* Timer Section — Left Chamber */}
        <div className={`${styles.timerColumn} ${styles.timerSection}`}>
          {/* Circular Timer with Glowing Tip Dot */}
          <div className={styles.timerWrapper}>
            <svg className={styles.timerSvg} viewBox="0 0 280 280">
              <defs>
                <filter id="glow-indicator" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Recessed Dial Background */}
              <circle
                cx="140" cy="140" r="132"
                className={styles.timerFace}
              />

              {/* Background ring track */}
              <circle
                cx="140" cy="140" r={radius}
                fill="none"
                className={styles.timerTrack}
                strokeWidth="5"
              />

              {/* Progress ring */}
              <circle
                cx="140" cy="140" r={radius}
                fill="none"
                stroke={SESSION_COLORS[sessionType]}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                transform="rotate(-90 140 140)"
                className={styles.progressRing}
              />

              {/* Glowing tip indicator dot */}
              {progress > 0.005 && progress < 0.999 && (
                <>
                  <circle
                    cx={dotX} cy={dotY} r="7"
                    fill="#ffffff"
                    opacity="0.65"
                    filter="url(#glow-indicator)"
                  />
                  <circle
                    cx={dotX} cy={dotY} r="4.5"
                    fill="#ffffff"
                    className={styles.indicatorDot}
                  />
                </>
              )}
            </svg>

            <div className={styles.timerDisplay}>
              <span className={styles.sessionBadge} style={{ color: SESSION_COLORS[sessionType] }}>
                {sessionType === 'study' ? <BookOpen size={13} /> : <Coffee size={13} />}
                {SESSION_LABELS[sessionType]}
              </span>

              {isEditingTime ? (
                <div className={styles.timeEditBox}>
                  <div className={styles.timeInputRow}>
                    <input
                      ref={timeInputRef}
                      type="number"
                      min="1"
                      max="180"
                      className={styles.timeInput}
                      value={customMinutesInput}
                      onChange={(e) => setCustomMinutesInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCustomMinutes()
                        if (e.key === 'Escape') setIsEditingTime(false)
                      }}
                      placeholder="min"
                      title="Digite os minutos desejados"
                    />
                    <span className={styles.timeInputUnit}>min</span>
                    <button
                      type="button"
                      className={`${styles.timeActionBtn} ${styles.timeConfirmBtn}`}
                      onClick={() => handleSaveCustomMinutes()}
                      title="Salvar tempo"
                      aria-label="Confirmar minutos"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.timeActionBtn} ${styles.timeCancelBtn}`}
                      onClick={() => setIsEditingTime(false)}
                      title="Cancelar"
                      aria-label="Cancelar edição de tempo"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={styles.timeDisplayTrigger}
                  onClick={() => {
                    setCustomMinutesInput(String(Math.ceil(timeLeft / 60) || 1))
                    setIsEditingTime(true)
                  }}
                  title="Clique para editar minutos específicos"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setCustomMinutesInput(String(Math.ceil(timeLeft / 60) || 1))
                      setIsEditingTime(true)
                    }
                  }}
                >
                  <span className={styles.time}>{formatTime(timeLeft)}</span>
                  <span className={styles.timeHint}>clique para editar</span>
                </div>
              )}
            </div>
          </div>

          {/* Connected Interval Dots */}
          <div className={styles.intervalTrack} title={`Ciclo ${currentCycle} de ${settings.cyclesBeforeLongBreak}`}>
            {Array.from({ length: settings.cyclesBeforeLongBreak }).map((_, idx) => {
              const cycleNum = idx + 1
              const isCompleted = cycleNum < currentCycle
              const isCurrent = cycleNum === currentCycle
              return (
                <div key={cycleNum} className={styles.intervalStep}>
                  {idx > 0 && (
                    <div
                      className={`
                        ${styles.intervalConnector}
                        ${isCompleted ? styles.intervalConnectorActive : ''}
                      `}
                    />
                  )}
                  <div className={styles.intervalNodeAnchor}>
                    <div
                      className={`
                        ${styles.intervalNode}
                        ${isCompleted ? styles.intervalCompleted : ''}
                        ${isCurrent ? styles.intervalCurrent : ''}
                      `}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Controls with Glowing Play Button */}
          <div className={styles.controls}>
            <div className={styles.finishBtnWrapper}>
              {showResetConfirmModal && (
                <div className={styles.finishPopup}>
                  <button
                    type="button"
                    className={`${styles.finishPopupBtn} ${styles.finishPopupConfirm}`}
                    onClick={handleResetTimerConfirm}
                    title="Confirmar reinício"
                    aria-label="Confirmar reinício"
                    data-testid="btn-confirm-reset"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.finishPopupBtn} ${styles.finishPopupCancel}`}
                    onClick={() => setShowResetConfirmModal(false)}
                    title="Cancelar"
                    aria-label="Cancelar reinício"
                    data-testid="btn-cancel-reset"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <button
                type="button"
                className={styles.controlBtn}
                onClick={() => {
                  setShowFinishConfirmModal(false)
                  setShowResetConfirmModal(prev => !prev)
                }}
                title="Reiniciar timer"
                aria-label="Reiniciar timer"
                data-testid="btn-reset-timer"
              >
                <RotateCcw size={18} />
              </button>
            </div>

            <button
              type="button"
              className={`${styles.playBtn} ${isRunning ? styles.playBtnPause : ''}`}
              onClick={toggleTimer}
              style={{ background: SESSION_COLORS[sessionType] }}
              title={isRunning ? 'Pausar' : 'Iniciar'}
            >
              {isRunning ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: 3 }} />}
            </button>

            <button
              type="button"
              className={styles.controlBtn}
              onClick={skipSession}
              title="Pular sessão"
            >
              <SkipForward size={18} />
            </button>

            <div className={styles.finishBtnWrapper}>
              {showFinishConfirmModal && (
                <div className={styles.finishPopup}>
                  <button
                    type="button"
                    className={`${styles.finishPopupBtn} ${styles.finishPopupConfirm}`}
                    onClick={handleFinishTimerConfirm}
                    title="Confirmar finalização"
                    aria-label="Confirmar finalização"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.finishPopupBtn} ${styles.finishPopupCancel}`}
                    onClick={() => setShowFinishConfirmModal(false)}
                    title="Cancelar"
                    aria-label="Cancelar finalização"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <button
                type="button"
                className={`${styles.controlBtn} ${styles.finishTimerBtn}`}
                onClick={() => {
                  setShowResetConfirmModal(false)
                  setShowFinishConfirmModal(prev => !prev)
                }}
                title="Finalizar timer"
                aria-label="Finalizar timer"
              >
                <Square size={15} fill="currentColor" strokeWidth={0} className={styles.squareCenterIcon} />
              </button>
            </div>
          </div>

          {/* Sub-actions: Sound Toggle */}
          <div className={styles.timerSubActions}>
            {/* Sound toggle */}
            <button
              type="button"
              className={styles.soundToggle}
              onClick={() => {
                const updated = { ...settings, soundEnabled: !settings.soundEnabled }
                setSettings(updated)
                getApi().setSetting('pomodoro_sound', String(updated.soundEnabled))
              }}
            >
              {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              {settings.soundEnabled ? 'Som ativado' : 'Som desativado'}
            </button>
          </div>
        </div>

        {/* Side Panel: Focus, Breaks & Cycles Configuration — Right Chamber */}
        <div className={`${styles.sessionColumn} ${styles.sidePanel}`}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleRow}>
              <Sliders size={18} className={styles.panelHeaderIcon} />
              <h3 className={styles.panelTitle}>Configuração dos Ciclos</h3>
            </div>
            <p className={styles.panelSubtitle}>Personalize tempos de estudo, intervalos e ciclos</p>
          </div>

          {/* 1. Tempo de Foco */}
          <div className={styles.configGroup} data-testid="config-group-focus">
            <div className={styles.configGroupHeader}>
              <div className={styles.configLabelRow}>
                <BookOpen size={14} className={styles.configIconFocus} />
                <label className={styles.configLabel}>Tempo de Foco</label>
              </div>
            </div>

            {/* Horizontal Ruler Picker (Camera Dial Minimalist Slider) */}
            <HorizontalRulerPicker
              value={settings.studyMinutes}
              onChange={handleUpdateStudyMinutes}
              min={1}
              max={120}
              step={1}
              disabled={isRunning}
              unit="min"
              testId="ruler-focus"
              ariaLabel="Tempo de Foco"
              stepAmount={1}
              valTestId="val-focus"
              btnMinusTestId="btn-focus-minus"
              btnPlusTestId="btn-focus-plus"
            />


          </div>

          {/* 2. Tempo de Pausa Curta */}
          <div className={styles.configGroup} data-testid="config-group-short-break">
            <div className={styles.configGroupHeader}>
              <div className={styles.configLabelRow}>
                <Coffee size={14} className={styles.configIconShortBreak} />
                <label className={styles.configLabel}>Pausa Curta</label>
              </div>
            </div>

            {/* Horizontal Ruler Picker (Camera Dial Minimalist Slider) */}
            <HorizontalRulerPicker
              value={settings.shortBreakMinutes}
              onChange={handleUpdateShortBreak}
              min={1}
              max={60}
              step={1}
              disabled={isRunning}
              unit="min"
              testId="ruler-short-break"
              ariaLabel="Tempo de Pausa Curta"
              stepAmount={1}
              valTestId="val-short-break"
              btnMinusTestId="btn-short-break-minus"
              btnPlusTestId="btn-short-break-plus"
            />


          </div>

          {/* 3. Quantidade de ciclos */}
          <div className={styles.configGroup} data-testid="config-group-cycles">
            <div className={styles.configGroupHeader}>
              <div className={styles.configLabelRow}>
                <RotateCcw size={14} className={styles.configIconCycles} />
                <label className={styles.configLabel}>Quantidade de ciclos</label>
              </div>
              <div className={styles.stepperBox}>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => handleUpdateCycles(settings.cyclesBeforeLongBreak - 1)}
                  disabled={isRunning || settings.cyclesBeforeLongBreak <= 1}
                  title="Diminuir quantidade de ciclos"
                  aria-label="Diminuir ciclos"
                  data-testid="btn-cycles-minus"
                >
                  <Minus size={13} />
                </button>
                <div className={styles.stepperValueDisplay}>
                  <span className={styles.stepperNum} data-testid="val-cycles">{settings.cyclesBeforeLongBreak}</span>
                  <span className={styles.stepperUnit}>ciclos</span>
                </div>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => handleUpdateCycles(settings.cyclesBeforeLongBreak + 1)}
                  disabled={isRunning || settings.cyclesBeforeLongBreak >= 12}
                  title="Aumentar quantidade de ciclos"
                  aria-label="Aumentar ciclos"
                  data-testid="btn-cycles-plus"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            <div className={styles.presetChipsRow}>
              {[2, 3, 4, 5, 6].map(cycles => (
                <button
                  key={cycles}
                  type="button"
                  className={`${styles.presetChip} ${settings.cyclesBeforeLongBreak === cycles ? styles.presetChipActive : ''}`}
                  onClick={() => handleUpdateCycles(cycles)}
                  disabled={isRunning}
                  data-testid={`chip-cycles-${cycles}`}
                >
                  {cycles}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>


    </div>
  )
}

export default Pomodoro
