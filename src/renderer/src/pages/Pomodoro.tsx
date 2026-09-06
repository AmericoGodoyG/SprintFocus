import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Play, Pause, RotateCcw, SkipForward, Coffee, BookOpen, Volume2, VolumeX,
  Check, X, Minus, Plus, Sliders, Square
} from 'lucide-react'
import { initBrowserApiFallback } from '../api/browserFallback'
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

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

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
    const val = Math.max(5, Math.min(180, mins))
    const updated = { ...settings, studyMinutes: val }
    setSettings(updated)
    if (!isRunning && sessionType === 'study') {
      setTimeLeft(val * 60)
    }
    getApi().setSetting('pomodoro_study_minutes', String(val)).catch(console.error)
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

  function handleUpdateLongBreak(mins: number) {
    const val = Math.max(5, Math.min(90, mins))
    const updated = { ...settings, longBreakMinutes: val }
    setSettings(updated)
    if (!isRunning && sessionType === 'long_break') {
      setTimeLeft(val * 60)
    }
    getApi().setSetting('pomodoro_long_break', String(val)).catch(console.error)
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
      if (currentCycle >= settings.cyclesBeforeLongBreak) {
        nextType = 'long_break'
      } else {
        nextType = 'short_break'
      }
    } else {
      nextType = 'study'
      if (sessionType === 'long_break') {
        nextCycle = 1
      } else {
        nextCycle = currentCycle + 1
      }
    }

    setSessionType(nextType)
    setCurrentCycle(nextCycle)
    setTimeLeft(getTotalSeconds(nextType))
    setIsRunning(false)
  }, [sessionType, currentCycle, settings, playSound, sessionId, startedAt])

  // Timer effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            handleSessionComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, handleSessionComplete])

  // Start / Pause
  async function toggleTimer() {
    if (isRunning) {
      setIsRunning(false)
    } else {
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
    setTimeLeft(getTotalSeconds(sessionType))
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
    if (intervalRef.current) clearInterval(intervalRef.current)

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
      if (currentCycle >= settings.cyclesBeforeLongBreak) {
        nextType = 'long_break'
      } else {
        nextType = 'short_break'
      }
    } else {
      nextType = 'study'
      if (sessionType === 'long_break') {
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
      <div className={styles.header}>
        <h1 className={styles.title}>Pomodoro</h1>
        <p className={styles.subtitle}>Gerencie seus ciclos de foco e pausas para maximizar a produtividade</p>
      </div>
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
              <span className={styles.time}>{formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Connected Interval Dots */}
          <div className={styles.intervalTrack} title={`Ciclo ${currentCycle} de ${settings.cyclesBeforeLongBreak}`}>
            {Array.from({ length: settings.cyclesBeforeLongBreak }).map((_, idx) => {
              const cycleNum = idx + 1
              const isCompleted = cycleNum < currentCycle
              const isCurrent = cycleNum === currentCycle
              return (
                <div key={idx} className={styles.intervalNodeWrapper}>
                  <div
                    className={`
                      ${styles.intervalNode}
                      ${isCompleted ? styles.intervalCompleted : ''}
                      ${isCurrent ? styles.intervalCurrent : ''}
                    `}
                  />
                  {idx < settings.cyclesBeforeLongBreak - 1 && (
                    <div
                      className={`
                        ${styles.intervalConnector}
                        ${isCompleted ? styles.intervalConnectorActive : ''}
                      `}
                    />
                  )}
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
              <div className={styles.stepperBox}>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => handleUpdateStudyMinutes(settings.studyMinutes - 5)}
                  disabled={isRunning || settings.studyMinutes <= 5}
                  title="Diminuir tempo de foco em 5 minutos"
                  aria-label="Diminuir tempo de foco"
                  data-testid="btn-focus-minus"
                >
                  <Minus size={13} />
                </button>
                <div className={styles.stepperValueDisplay}>
                  <span className={styles.stepperNum} data-testid="val-focus">{settings.studyMinutes}</span>
                  <span className={styles.stepperUnit}>min</span>
                </div>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => handleUpdateStudyMinutes(settings.studyMinutes + 5)}
                  disabled={isRunning || settings.studyMinutes >= 180}
                  title="Aumentar tempo de foco em 5 minutos"
                  aria-label="Aumentar tempo de foco"
                  data-testid="btn-focus-plus"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            <div className={styles.presetChipsRow}>
              {[25, 30, 45, 50, 60].map(min => (
                <button
                  key={min}
                  type="button"
                  className={`${styles.presetChip} ${settings.studyMinutes === min ? styles.presetChipActive : ''}`}
                  onClick={() => handleUpdateStudyMinutes(min)}
                  disabled={isRunning}
                  data-testid={`chip-focus-${min}`}
                >
                  {min}min
                </button>
              ))}
            </div>
          </div>

          {/* 2. Tempo de Pausa Curta */}
          <div className={styles.configGroup} data-testid="config-group-short-break">
            <div className={styles.configGroupHeader}>
              <div className={styles.configLabelRow}>
                <Coffee size={14} className={styles.configIconShortBreak} />
                <label className={styles.configLabel}>Pausa Curta</label>
              </div>
              <div className={styles.stepperBox}>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => handleUpdateShortBreak(settings.shortBreakMinutes - 1)}
                  disabled={isRunning || settings.shortBreakMinutes <= 1}
                  title="Diminuir pausa curta em 1 minuto"
                  aria-label="Diminuir pausa curta"
                  data-testid="btn-short-break-minus"
                >
                  <Minus size={13} />
                </button>
                <div className={styles.stepperValueDisplay}>
                  <span className={styles.stepperNum} data-testid="val-short-break">{settings.shortBreakMinutes}</span>
                  <span className={styles.stepperUnit}>min</span>
                </div>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => handleUpdateShortBreak(settings.shortBreakMinutes + 1)}
                  disabled={isRunning || settings.shortBreakMinutes >= 60}
                  title="Aumentar pausa curta em 1 minuto"
                  aria-label="Aumentar pausa curta"
                  data-testid="btn-short-break-plus"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            <div className={styles.presetChipsRow}>
              {[3, 5, 10, 15].map(min => (
                <button
                  key={min}
                  type="button"
                  className={`${styles.presetChip} ${settings.shortBreakMinutes === min ? styles.presetChipActive : ''}`}
                  onClick={() => handleUpdateShortBreak(min)}
                  disabled={isRunning}
                  data-testid={`chip-short-break-${min}`}
                >
                  {min}min
                </button>
              ))}
            </div>
          </div>

          {/* 3. Tempo de Pausa Longa */}
          <div className={styles.configGroup} data-testid="config-group-long-break">
            <div className={styles.configGroupHeader}>
              <div className={styles.configLabelRow}>
                <Coffee size={14} className={styles.configIconLongBreak} />
                <label className={styles.configLabel}>Pausa Longa</label>
              </div>
              <div className={styles.stepperBox}>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => handleUpdateLongBreak(settings.longBreakMinutes - 5)}
                  disabled={isRunning || settings.longBreakMinutes <= 5}
                  title="Diminuir pausa longa em 5 minutos"
                  aria-label="Diminuir pausa longa"
                  data-testid="btn-long-break-minus"
                >
                  <Minus size={13} />
                </button>
                <div className={styles.stepperValueDisplay}>
                  <span className={styles.stepperNum} data-testid="val-long-break">{settings.longBreakMinutes}</span>
                  <span className={styles.stepperUnit}>min</span>
                </div>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => handleUpdateLongBreak(settings.longBreakMinutes + 5)}
                  disabled={isRunning || settings.longBreakMinutes >= 90}
                  title="Aumentar pausa longa em 5 minutos"
                  aria-label="Aumentar pausa longa"
                  data-testid="btn-long-break-plus"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            <div className={styles.presetChipsRow}>
              {[15, 20, 30, 45].map(min => (
                <button
                  key={min}
                  type="button"
                  className={`${styles.presetChip} ${settings.longBreakMinutes === min ? styles.presetChipActive : ''}`}
                  onClick={() => handleUpdateLongBreak(min)}
                  disabled={isRunning}
                  data-testid={`chip-long-break-${min}`}
                >
                  {min}min
                </button>
              ))}
            </div>
          </div>

          {/* 4. Ciclos até Pausa Longa */}
          <div className={styles.configGroup} data-testid="config-group-cycles">
            <div className={styles.configGroupHeader}>
              <div className={styles.configLabelRow}>
                <RotateCcw size={14} className={styles.configIconCycles} />
                <label className={styles.configLabel}>Ciclos até Pausa Longa</label>
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
