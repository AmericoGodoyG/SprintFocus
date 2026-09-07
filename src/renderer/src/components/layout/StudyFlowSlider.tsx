import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, BarChart3, Timer, CalendarDays, LucideIcon, Sun, Moon, RotateCcw } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import Metrics from '../../pages/Metrics'
import Pomodoro from '../../pages/Pomodoro'
import Calendar from '../../pages/Calendar'
import WindowControls from './WindowControls'
import SettingsModal from './SettingsModal'
import styles from './StudyFlowSlider.module.css'

interface FlowStep {
  id: string
  title: string
  path: string
  icon: LucideIcon
}

const FLOW_STEPS: FlowStep[] = [
  { id: 'metrics', title: 'Métricas', path: '/metrics', icon: BarChart3 },
  { id: 'pomodoro', title: 'Pomodoro', path: '/pomodoro', icon: Timer },
  { id: 'calendar', title: 'Calendário', path: '/calendar', icon: CalendarDays }
]

function getIndexFromPath(pathname: string): number {
  if (pathname === '/metrics') return 0
  if (pathname === '/calendar') return 2
  return 1 // default to Pomodoro ('/pomodoro', '/', or initial load)
}

export default function StudyFlowSlider() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [activeIndex, setActiveIndex] = useState(() => getIndexFromPath(location.pathname))
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const wheelLockRef = useRef(false)
  const touchStartXRef = useRef<number | null>(null)

  const sliderWrapperRef = useRef<HTMLDivElement>(null)
  const slidePanesRef = useRef<(HTMLDivElement | null)[]>([])
  const [arrowOffset, setArrowOffset] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const dist = Math.max(0, (window.innerWidth - 1100) / 2)
      return Math.max(20, Math.round(dist / 2 - 23))
    }
    return 32
  })

  // Synchronize state when URL changes (e.g. from Sidebar links)
  useEffect(() => {
    const targetIdx = getIndexFromPath(location.pathname)
    setActiveIndex(targetIdx)
  }, [location.pathname])

  const updateArrowPosition = useCallback(() => {
    const pane = slidePanesRef.current[activeIndex]
    const wrapper = sliderWrapperRef.current
    if (!wrapper) return

    const viewportWidth = wrapper.clientWidth || window.innerWidth
    let contentWidth = 1100

    if (pane) {
      // Find the visual central container (e.g. unifiedChamber for Pomodoro or page container)
      const chamber = pane.querySelector<HTMLElement>('[class*="unifiedChamber"]')
      const mainChild = pane.firstElementChild as HTMLElement | null
      if (chamber && chamber.offsetWidth > 0) {
        contentWidth = chamber.offsetWidth
      } else if (mainChild && mainChild.offsetWidth > 0) {
        contentWidth = mainChild.offsetWidth
      }
    }

    // Distance from screen border to central content border
    const distanceToContent = Math.max(0, (viewportWidth - contentWidth) / 2)
    // Half the distance between the screen border and the central content border, minus half arrow width (46px / 2 = 23px)
    const computedOffset = Math.max(20, Math.round(distanceToContent / 2 - 23))
    setArrowOffset(computedOffset)
  }, [activeIndex])

  useEffect(() => {
    updateArrowPosition()
    const timer = setTimeout(updateArrowPosition, 40)

    window.addEventListener('resize', updateArrowPosition)

    const observer = new ResizeObserver(() => {
      updateArrowPosition()
    })

    if (sliderWrapperRef.current) {
      observer.observe(sliderWrapperRef.current)
    }

    const activePane = slidePanesRef.current[activeIndex]
    if (activePane) {
      observer.observe(activePane)
    }

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateArrowPosition)
      observer.disconnect()
    }
  }, [activeIndex, updateArrowPosition])

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
      ref={sliderWrapperRef}
      className={styles.sliderWrapper}
      style={{ '--arrow-offset': `${arrowOffset}px` } as React.CSSProperties}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Menu Bar — Flow Navigation Pills & Theme Toggle */}
      <header className={styles.topBarContainer} aria-label="Menu superior">
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

        {/* Right side controls: Theme button, Settings gear, and Window Controls Overlay with identical spacing */}
        <div className={styles.topRightControls}>
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

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className={styles.settingsToggleBtn}
            title="Redefinir / Configurações"
            aria-label="Redefinir / Configurações"
            data-testid="settings-toggle-btn"
          >
            <RotateCcw size={16} />
          </button>

          <WindowControls />
        </div>
      </header>

      {/* Floating Left Side Arrow */}
      {activeIndex > 0 && (
        <button
          type="button"
          className={`${styles.arrowBtn} ${styles.arrowPrev}`}
          style={{ left: `${arrowOffset}px` }}
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
          style={{ right: `${arrowOffset}px` }}
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
          <div
            ref={el => { slidePanesRef.current[0] = el }}
            className={styles.slidePane}
            data-slide-index="0"
            aria-hidden={activeIndex !== 0}
          >
            <Metrics />
          </div>

          {/* Slide 1: Pomodoro */}
          <div
            ref={el => { slidePanesRef.current[1] = el }}
            className={styles.slidePane}
            data-slide-index="1"
            aria-hidden={activeIndex !== 1}
          >
            <Pomodoro />
          </div>

          {/* Slide 2: Calendário */}
          <div
            ref={el => { slidePanesRef.current[2] = el }}
            className={styles.slidePane}
            data-slide-index="2"
            aria-hidden={activeIndex !== 2}
          >
            <Calendar />
          </div>
        </div>
      </div>

      {/* Settings Modal Dialog */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}
