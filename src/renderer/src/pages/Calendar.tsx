import { useState, useEffect, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Flame,
  CheckCircle2,
  BookOpen,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import styles from './Calendar.module.css'

interface StudySession {
  id: number
  subject_id: number | null
  subject_name?: string
  subject_color?: string
  topic_id: number | null
  topic_name?: string
  duration_minutes: number
  actual_duration_minutes: number
  type: string
  status: string
  started_at: string
  finished_at: string | null
  notes: string | null
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function Calendar() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [streak, setStreak] = useState<{ currentStreak: number; longestStreak: number }>({
    currentStreak: 0,
    longestStreak: 0
  })
  const [loading, setLoading] = useState(true)

  // Fetch sessions for the displayed month
  useEffect(() => {
    loadMonthSessions()
    loadStreak()
  }, [currentDate.getFullYear(), currentDate.getMonth()])

  async function loadStreak() {
    try {
      const data = await window.api.getStudyStreak() as { currentStreak: number; longestStreak: number }
      if (data) setStreak(data)
    } catch {
      // ignore
    }
  }

  async function loadMonthSessions() {
    setLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()

      // Calculate start and end including previous and next month buffer
      const start = new Date(year, month - 1, 20).toISOString().split('T')[0]
      const end = new Date(year, month + 1, 10).toISOString().split('T')[0]

      const data = await window.api.getSessionsByDateRange(start, end) as StudySession[]
      setSessions(data || [])
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  // Group sessions by day string (YYYY-MM-DD)
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, StudySession[]>()
    sessions.forEach(session => {
      if (!session.started_at) return
      const dayKey = session.started_at.split('T')[0] || session.started_at.substring(0, 10)
      if (!map.has(dayKey)) {
        map.set(dayKey, [])
      }
      map.get(dayKey)!.push(session)
    })
    return map
  }, [sessions])

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDayIndex = new Date(year, month, 1).getDay()
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()

    const days: {
      date: Date
      dayNumber: number
      isCurrentMonth: boolean
      isToday: boolean
      isSelected: boolean
      key: string
      sessions: StudySession[]
      totalMinutes: number
    }[] = []

    const todayStr = new Date().toISOString().split('T')[0]
    const selectedStr = selectedDate.toISOString().split('T')[0]

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i
      const d = new Date(year, month - 1, dayNum)
      const key = d.toISOString().split('T')[0]
      const daySessions = sessionsByDay.get(key) || []
      const totalMinutes = daySessions.reduce((acc, s) => acc + (s.actual_duration_minutes || s.duration_minutes || 0), 0)

      days.push({
        date: d,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: key === todayStr,
        isSelected: key === selectedStr,
        key,
        sessions: daySessions,
        totalMinutes
      })
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i)
      const key = d.toISOString().split('T')[0]
      const daySessions = sessionsByDay.get(key) || []
      const totalMinutes = daySessions.reduce((acc, s) => acc + (s.actual_duration_minutes || s.duration_minutes || 0), 0)

      days.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: key === todayStr,
        isSelected: key === selectedStr,
        key,
        sessions: daySessions,
        totalMinutes
      })
    }

    // Next month padding to fill complete grid of 35 or 42
    const remaining = (7 - (days.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      const key = d.toISOString().split('T')[0]
      const daySessions = sessionsByDay.get(key) || []
      const totalMinutes = daySessions.reduce((acc, s) => acc + (s.actual_duration_minutes || s.duration_minutes || 0), 0)

      days.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: key === todayStr,
        isSelected: key === selectedStr,
        key,
        sessions: daySessions,
        totalMinutes
      })
    }

    return days
  }, [currentDate, sessionsByDay, selectedDate])

  const selectedKey = selectedDate.toISOString().split('T')[0]
  const selectedDaySessions = sessionsByDay.get(selectedKey) || []
  const selectedDayTotalMinutes = selectedDaySessions.reduce(
    (acc, s) => acc + (s.actual_duration_minutes || s.duration_minutes || 0),
    0
  )

  function prevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  function goToToday() {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  function formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`
  }

  return (
    <div className={styles.calendarPage}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Calendário de Estudos</h1>
          <p className={styles.subtitle}>Acompanhe seu ritmo de aprendizagem diário</p>
        </div>

        <div className={styles.streakBadge}>
          <Flame size={20} className={styles.flameIcon} />
          <div>
            <span className={styles.streakCount}>{streak.currentStreak} dias</span>
            <span className={styles.streakLabel}>Sequência Atual</span>
          </div>
        </div>
      </div>

      <div className={styles.calendarContainer}>
        {/* Left / Main: Calendar Grid */}
        <div className={styles.calendarCard}>
          <div className={styles.calendarNav}>
            <div className={styles.monthDisplay}>
              <CalendarIcon size={20} className={styles.monthIcon} />
              <h2>{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            </div>

            <div className={styles.navButtons}>
              <button className={styles.todayBtn} onClick={goToToday}>Hoje</button>
              <button className={styles.navIconBtn} onClick={prevMonth} title="Mês anterior">
                <ChevronLeft size={18} />
              </button>
              <button className={styles.navIconBtn} onClick={nextMonth} title="Próximo mês">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className={styles.weekGrid}>
            {WEEK_DAYS.map(day => (
              <div key={day} className={styles.weekDayName}>{day}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className={styles.daysGrid}>
            {calendarDays.map((dayItem) => {
              const intensity = dayItem.totalMinutes === 0
                ? 'none'
                : dayItem.totalMinutes < 30
                ? 'low'
                : dayItem.totalMinutes < 90
                ? 'medium'
                : 'high'

              return (
                <div
                  key={dayItem.key}
                  className={`
                    ${styles.dayCell}
                    ${!dayItem.isCurrentMonth ? styles.otherMonth : ''}
                    ${dayItem.isToday ? styles.today : ''}
                    ${dayItem.isSelected ? styles.selected : ''}
                    ${styles[`intensity_${intensity}`]}
                  `}
                  onClick={() => setSelectedDate(dayItem.date)}
                >
                  <div className={styles.dayTop}>
                    <span className={styles.dayNum}>{dayItem.dayNumber}</span>
                    {dayItem.totalMinutes > 0 && (
                      <span className={styles.dayTimeBadge}>{formatTime(dayItem.totalMinutes)}</span>
                    )}
                  </div>

                  {dayItem.sessions.length > 0 && (
                    <div className={styles.sessionDots}>
                      {dayItem.sessions.slice(0, 3).map((s, idx) => (
                        <span
                          key={idx}
                          className={styles.sessionDot}
                          style={{ background: s.subject_color || 'var(--primary-400)' }}
                        />
                      ))}
                      {dayItem.sessions.length > 3 && (
                        <span className={styles.moreDot}>+{dayItem.sessions.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Heatmap Legend */}
          <div className={styles.legend}>
            <span className={styles.legendLabel}>Horas estudadas:</span>
            <div className={styles.legendItem}>
              <span className={`${styles.legendBox} ${styles.boxNone}`} /> 0m
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendBox} ${styles.boxLow}`} /> &lt; 30m
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendBox} ${styles.boxMedium}`} /> 30m - 90m
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendBox} ${styles.boxHigh}`} /> 90m+
            </div>
          </div>
        </div>

        {/* Right / Sidebar: Day Details */}
        <div className={styles.detailCard}>
          <div className={styles.detailHeader}>
            <div>
              <h3>
                {selectedDate.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </h3>
              <p className={styles.detailSub}>
                {selectedDaySessions.length > 0
                  ? `${selectedDaySessions.length} sessão(ões) realizada(s)`
                  : 'Nenhum estudo registrado neste dia'}
              </p>
            </div>

            <div className={styles.totalBadge}>
              <Clock size={16} />
              <span>{formatTime(selectedDayTotalMinutes)}</span>
            </div>
          </div>

          {/* Sessions List */}
          <div className={styles.sessionList}>
            {selectedDaySessions.length === 0 ? (
              <div className={styles.noSessions}>
                <Sparkles size={36} className={styles.emptyIcon} />
                <p>Dia sem registros de estudo</p>
                <span>Aproveite para iniciar um foco agora!</span>
                <button
                  className={styles.startFocusBtn}
                  onClick={() => navigate('/pomodoro')}
                >
                  Ir para o Pomodoro <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              selectedDaySessions.map(session => (
                <div key={session.id} className={styles.sessionItem}>
                  <div className={styles.sessionHeader}>
                    <div className={styles.subjectTag}>
                      <span
                        className={styles.subjectColor}
                        style={{ background: session.subject_color || 'var(--primary-500)' }}
                      />
                      <strong>{session.subject_name || 'Geral'}</strong>
                    </div>
                    <span className={`
                      ${styles.statusBadge}
                      ${session.status === 'completed' ? styles.statusCompleted : styles.statusInterrupted}
                    `}>
                      {session.status === 'completed' ? 'Concluído' : 'Interrompido'}
                    </span>
                  </div>

                  {session.topic_name && (
                    <div className={styles.topicName}>
                      <BookOpen size={14} />
                      <span>{session.topic_name}</span>
                    </div>
                  )}

                  <div className={styles.sessionMeta}>
                    <span className={styles.metaDuration}>
                      <Clock size={13} />
                      {session.actual_duration_minutes || session.duration_minutes} minutos
                    </span>
                    <span className={styles.metaTime}>
                      {new Date(session.started_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {session.notes && (
                    <p className={styles.sessionNote}>"{session.notes}"</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Calendar
