import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, BarChart3, Timer, CalendarDays, LucideIcon, Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import appIcon from '../../assets/icon.png'
import Metrics from '../../pages/Metrics'
import Pomodoro from '../../pages/Pomodoro'
import Calendar from '../../pages/Calendar'
import styles from './StudyFlowSlider.module.css'

interface FlowStep {
  id: string
  title: string
  path: string
  icon: LucideIcon
}

const FLOW_STEPS: FlowStep[] = [
  { id: 'metrics', title: 'Métricas', path: '/', icon: BarChart3 },
  { id: 'pomodoro', title: 'Pomodoro', path: '/pomodoro', icon: Timer },
  { id: 'calendar', title: 'Calendário', path: '/calendar', icon: CalendarDays }
]

function getIndexFromPath(pathname: string): number {
  if (pathname === '/pomodoro') return 1
  if (pathname === '/calendar') return 2
  return 0 // default to metrics ('/' or '/metrics')
}

export default function StudyFlowSlider() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [activeIndex, setActiveIndex] = useState(() => getIndexFromPath(location.pathname))
  const wheelLockRef = useRef(false)
  const touchStartXRef = useRef<number | null>(null)

  // Synchronize state when URL changes (e.g. from Sidebar links)
  useEffect(() => {
    const targetIdx = getIndexFromPath(location.pathname)
    setActiveIndex(targetIdx)
  }, [location.pathname])

  const goToSlide = useCallback((index: number) => {
    if (index < 0 || index >= FLOW_STEPS.length) return
    setActiveIndex(index)
    navigate(FLOW_STEPS[index].path)
  }, [navigate])

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      goToSlide(activeIndex - 1)
    }
  }, [activeIndex, goToSlide])

  const handleNext = useCallback(() => {
    if (activeIndex < FLOW_STEPS.length - 1) {
      goToSlide(activeIndex + 1)
    }
  }, [activeIndex, goToSlide])

  // Wheel horizontal swipe support with cooldown lock
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (wheelLockRef.current) return
    if (Math.abs(e.deltaX) > 40 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      if (e.deltaX > 40 && activeIndex < FLOW_STEPS.length - 1) {
        wheelLockRef.current = true
        handleNext()
        setTimeout(() => {
          wheelLockRef.current = false
        }, 500)
      } else if (e.deltaX < -40 && activeIndex > 0) {
        wheelLockRef.current = true
        handlePrev()
        setTimeout(() => {
          wheelLockRef.current = false
        }, 500)
      }
    }
  }

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null) return
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartXRef.current - touchEndX
    if (Math.abs(diff) > 60) {
      if (diff > 0 && activeIndex < FLOW_STEPS.length - 1) {
        handleNext()
      } else if (diff < 0 && activeIndex > 0) {
        handlePrev()
      }
    }
    touchStartXRef.current = null
  }

  return (
    <div
      className={styles.sliderWrapper}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Menu Bar — Brand Logo, Flow Navigation Pills & Theme Toggle */}
      <header className={styles.topBarContainer} aria-label="Menu superior">
        <div className={styles.topBarBrand}>
          <img src={appIcon} alt="SprintFocus Logo" className={styles.brandLogo} />
          <span className={styles.brandTitle}>SprintFocus</span>
        </div>

        <nav className={styles.flowPills} aria-label="Navegação de telas">
          {FLOW_STEPS.map((step, idx) => {
            const Icon = step.icon
            const isActive = activeIndex === idx
            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  className={`${styles.pillBtn} ${isActive ? styles.pillBtnActive : ''}`}
                  onClick={() => goToSlide(idx)}
                  title={`Ir para ${step.title}`}
                  data-testid={`flow-pill-${step.id}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <Icon size={14} />
                  <span>{step.title}</span>
                </button>
                {idx < FLOW_STEPS.length - 1 && (
                  <div
                    className={`${styles.pillConnector} ${
                      activeIndex > idx ? styles.pillConnectorActive : ''
                    }`}
                  />
                )}
              </React.Fragment>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={toggleTheme}
          className={styles.themeToggleBtn}
          title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          aria-label="Alternar tema"
          data-testid="theme-toggle-btn"
        >
          {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </header>

      {/* Floating Left Side Arrow */}
      {activeIndex > 0 && (
        <button
          type="button"
          className={`${styles.arrowBtn} ${styles.arrowPrev}`}
          onClick={handlePrev}
          id="flow-arrow-prev"
          data-testid="flow-arrow-prev"
          title={`Voltar para ${FLOW_STEPS[activeIndex - 1].title}`}
          aria-label={`Voltar para ${FLOW_STEPS[activeIndex - 1].title}`}
        >
          <ChevronLeft size={22} />
          <span className={styles.arrowTooltip}>
            {FLOW_STEPS[activeIndex - 1].title}
          </span>
        </button>
      )}

      {/* Floating Right Side Arrow */}
      {activeIndex < FLOW_STEPS.length - 1 && (
        <button
          type="button"
          className={`${styles.arrowBtn} ${styles.arrowNext}`}
          onClick={handleNext}
          id="flow-arrow-next"
          data-testid="flow-arrow-next"
          title={`Avançar para ${FLOW_STEPS[activeIndex + 1].title}`}
          aria-label={`Avançar para ${FLOW_STEPS[activeIndex + 1].title}`}
        >
          <ChevronRight size={22} />
          <span className={styles.arrowTooltip}>
            {FLOW_STEPS[activeIndex + 1].title}
          </span>
        </button>
      )}

      {/* 3-Screen Carousel Viewport */}
      <div className={styles.sliderViewport}>
        <div
          className={styles.sliderTrack}
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {/* Slide 0: Métricas */}
          <div className={styles.slidePane} data-slide-index="0" aria-hidden={activeIndex !== 0}>
            <Metrics />
          </div>

          {/* Slide 1: Pomodoro */}
          <div className={styles.slidePane} data-slide-index="1" aria-hidden={activeIndex !== 1}>
            <Pomodoro />
          </div>

          {/* Slide 2: Calendário */}
          <div className={styles.slidePane} data-slide-index="2" aria-hidden={activeIndex !== 2}>
            <Calendar />
          </div>
        </div>
      </div>
    </div>
  )
}
