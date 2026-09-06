import { useState, useEffect, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Flame,
  Check,
  Plus,
  Trash2,
  Pencil,
  X
} from 'lucide-react'
import styles from './Calendar.module.css'

interface TodoItem {
  id: string
  text: string
  completed: boolean
}

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
      const data = await window.api.getStudyStreak() as { current?: number; currentStreak?: number; best?: number; longestStreak?: number } | undefined
      if (data) {
        const current = Number(data.current ?? data.currentStreak ?? 0)
        const longest = Number(data.best ?? data.longestStreak ?? 0)
        setStreak({
          currentStreak: isNaN(current) ? 0 : current,
          longestStreak: isNaN(longest) ? 0 : longest
        })
      } else {
        setStreak({ currentStreak: 0, longestStreak: 0 })
      }
    } catch {
      setStreak({ currentStreak: 0, longestStreak: 0 })
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
      const totalMinutes = daySessions.reduce((acc, s) => acc + ((s as any).actual_minutes || (s as any).actual_duration_minutes || (s as any).duration_minutes || 0), 0)

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

  const [todos, setTodos] = useState<TodoItem[]>([])
  const [newTodoText, setNewTodoText] = useState('')

  useEffect(() => {
    const storageKey = `sprintfocus_todos_${selectedKey}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        setTodos(JSON.parse(saved))
        return
      } catch { }
    }
    // Default initial tasks matching Behance style
    const initialTasks: TodoItem[] = [
      { id: '1', text: 'ChecK Email', completed: false },
      { id: '2', text: 'Search for inspirations', completed: true },
      { id: '3', text: 'Design the task', completed: false },
      { id: '4', text: 'Post it on Social Media', completed: false },
      { id: '5', text: 'Get reviews and Update it', completed: false }
    ]
    setTodos(initialTasks)
    localStorage.setItem(storageKey, JSON.stringify(initialTasks))
  }, [selectedKey])

  function handleToggleTodo(id: string) {
    const updated = todos.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    setTodos(updated)
    localStorage.setItem(`sprintfocus_todos_${selectedKey}`, JSON.stringify(updated))
  }

  function handleAddTodo() {
    if (!newTodoText.trim()) return
    const newTask: TodoItem = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      completed: false
    }
    const updated = [...todos, newTask]
    setTodos(updated)
    localStorage.setItem(`sprintfocus_todos_${selectedKey}`, JSON.stringify(updated))
    setNewTodoText('')
  }

  function handleDeleteTodo(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const updated = todos.filter(t => t.id !== id)
    setTodos(updated)
    localStorage.setItem(`sprintfocus_todos_${selectedKey}`, JSON.stringify(updated))
  }

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  function handleStartEdit(todo: TodoItem, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(todo.id)
    setEditingText(todo.text)
  }

  function handleSaveEdit(id: string) {
    if (!editingText.trim()) return
    const updated = todos.map(t => (t.id === id ? { ...t, text: editingText.trim() } : t))
    setTodos(updated)
    localStorage.setItem(`sprintfocus_todos_${selectedKey}`, JSON.stringify(updated))
    setEditingId(null)
    setEditingText('')
  }

  function handleCancelEdit(e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    setEditingId(null)
    setEditingText('')
  }

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
      <div className={styles.calendarContainer}>
        {/* Left / Main: Calendar Grid */}
        <div className={styles.calendarCard}>
          <div className={styles.calendarNav}>
            <div className={styles.monthDisplay}>
              <CalendarIcon size={20} className={styles.monthIcon} />
              <h2>{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            </div>

            <div className={styles.navRightGroup}>
              {/* Indicador de dias consecutivos */}
              <div className={styles.streakBadge} title="Sequência de dias consecutivos estudados">
                <Flame size={18} className={styles.flameIcon} />
                <div className={styles.streakInfo}>
                  <span className={styles.streakCount}>{streak?.currentStreak ?? 0} dias</span>
                  <span className={styles.streakLabel}>Sequência Atual</span>
                </div>
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

              const isStudied = dayItem.totalMinutes > 0 || dayItem.sessions.length > 0

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
                    {isStudied && (
                      <div className={styles.dayTopRight} title="Dia estudado">
                        {dayItem.totalMinutes > 0 && (
                          <span className={styles.dayTimeBadge}>{formatTime(dayItem.totalMinutes)}</span>
                        )}
                        <Flame size={14} className={styles.dayFlameIcon} aria-label="Dia estudado" />
                      </div>
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

        {/* Right / Sidebar: Todo Do */}
        <div className={styles.todoCard}>
          <div className={styles.todoHeader}>
            <div>
              <h3 className={styles.todoTitle}>To Do List</h3>
              <p className={styles.todoSubtitle}>
                {selectedDate.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </p>
            </div>
          </div>

          <div className={styles.todoDivider} />

          <div className={styles.todoList}>
            {todos.map(todo => (
              <div
                key={todo.id}
                className={styles.todoItem}
                onClick={() => {
                  if (editingId !== todo.id) {
                    handleToggleTodo(todo.id)
                  }
                }}
              >
                {editingId === todo.id ? (
                  <div className={styles.todoEditRow} onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      className={styles.todoEditInput}
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleSaveEdit(todo.id)
                        } else if (e.key === 'Escape') {
                          handleCancelEdit()
                        }
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className={styles.todoEditSaveBtn}
                      onClick={() => handleSaveEdit(todo.id)}
                      title="Salvar alteração"
                      aria-label="Salvar alteração"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.todoEditCancelBtn}
                      onClick={handleCancelEdit}
                      title="Cancelar"
                      aria-label="Cancelar edição"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`
                        ${styles.todoCheckbox}
                        ${todo.completed ? styles.todoCheckboxChecked : ''}
                      `}
                      aria-label={todo.completed ? 'Desmarcar tarefa' : 'Marcar como concluída'}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleTodo(todo.id)
                      }}
                    >
                      {todo.completed && (
                        <Check size={13} strokeWidth={3.2} className={styles.todoCheckIcon} />
                      )}
                    </button>

                    <span
                      className={`
                        ${styles.todoText}
                        ${todo.completed ? styles.todoTextChecked : ''}
                      `}
                    >
                      {todo.text}
                    </span>

                    <div className={styles.todoActions} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className={styles.todoActionBtn}
                        onClick={(e) => handleStartEdit(todo, e)}
                        title="Editar tarefa"
                        aria-label="Editar tarefa"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.todoActionBtn} ${styles.todoDeleteBtn}`}
                        onClick={(e) => handleDeleteTodo(todo.id, e)}
                        title="Excluir tarefa"
                        aria-label="Excluir tarefa"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className={styles.todoFooter}>
            <button
              type="button"
              className={styles.todoPlusBtn}
              onClick={handleAddTodo}
              title="Adicionar tarefa"
              aria-label="Adicionar tarefa"
            >
              <Plus size={22} color="#ffffff" strokeWidth={2.5} />
            </button>

            <div className={styles.todoInputWrapper}>
              <input
                type="text"
                className={styles.todoInput}
                placeholder="notes..."
                value={newTodoText}
                onChange={e => setNewTodoText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTodo()
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Calendar
