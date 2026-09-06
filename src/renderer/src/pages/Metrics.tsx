import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, TrendingUp, TrendingDown, Mountain, Compass,
  Calendar as CalendarIcon, Timer
} from 'lucide-react'
import { initBrowserApiFallback } from '../api/browserFallback'
import styles from './Metrics.module.css'

function getApi() {
  if (typeof window !== 'undefined' && !window.api) {
    initBrowserApiFallback()
  }
  return window.api
}

type Period = '7d' | '30d' | '90d' | '1y'

interface DayStudyPoint {
  dateStr: string        // YYYY-MM-DD
  label: string          // Seg, Ter, 04/09, etc.
  fullDate: string       // 04/09/2026
  weekdayName: string    // Sexta-feira
  minutes: number
  hoursFormatted: string // 3h 42min
}

function formatMinutesToHours(minutes: number): string {
  const safeMins = Math.max(0, Math.round(minutes))
  const h = Math.floor(safeMins / 60)
  const m = safeMins % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m.toString().padStart(2, '0')}min`
}

function formatDifference(diffMinutes: number): { text: string; isPositive: boolean; isNeutral: boolean } {
  const rounded = Math.round(diffMinutes)
  if (Math.abs(rounded) < 1) {
    return { text: 'Na média', isPositive: true, isNeutral: true }
  }
  const isPositive = rounded > 0
  const absMins = Math.abs(rounded)
  const formatted = formatMinutesToHours(absMins)
  return {
    text: `${isPositive ? '+' : '-'}${formatted} ${isPositive ? 'acima da média' : 'abaixo da média'}`,
    isPositive,
    isNeutral: false
  }
}

// Generate smooth cubic Bezier path from coordinate points
function generateSplinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

// Generate closed area under the spline curve down to baseline
function generateSplineArea(points: { x: number; y: number }[], baselineY: number): string {
  if (points.length < 2) return ''
  const spline = generateSplinePath(points)
  const first = points[0]
  const last = points[points.length - 1]
  return `${spline} L ${last.x.toFixed(1)} ${baselineY.toFixed(1)} L ${first.x.toFixed(1)} ${baselineY.toFixed(1)} Z`
}

function Metrics() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>('7d')
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [yesterdayMinutes, setYesterdayMinutes] = useState(0)
  const [weekMinutes, setWeekMinutes] = useState(0)
  const [monthMinutes, setMonthMinutes] = useState(0)
  const [prevWeekMinutes, setPrevWeekMinutes] = useState(0)
  const [dailyData, setDailyData] = useState<DayStudyPoint[]>([])
  const [hoveredPoint, setHoveredPoint] = useState<{ point: DayStudyPoint; x: number; y: number } | null>(null)

  const chartContainerRef = useRef<HTMLDivElement>(null)

  // Load all metrics data
  useEffect(() => {
    loadData()
  }, [period])

  async function loadData() {
    try {
      const api = getApi()
      const now = new Date()

      // 1. Hoje
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

      // 2. Ontem
      const yestDate = new Date(now.getTime() - 86400000)
      const yestStart = new Date(yestDate.getFullYear(), yestDate.getMonth(), yestDate.getDate()).toISOString()
      const yestEnd = new Date(yestDate.getFullYear(), yestDate.getMonth(), yestDate.getDate(), 23, 59, 59).toISOString()

      // 3. Esta Semana (domingo como dia inicial da semana)
      const dayOfWeek = now.getDay() // 0 = dom, 1 = seg, ..., 6 = sáb
      const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
      thisWeekStart.setHours(0, 0, 0, 0)
      const thisWeekEnd = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate() + 6, 23, 59, 59)

      // 4. Semana Anterior
      const prevWeekStart = new Date(thisWeekStart.getTime() - 7 * 86400000)
      const prevWeekEnd = new Date(thisWeekStart.getTime() - 1)

      // 5. Este Mês
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      // 6. Período Selecionado
      let periodStartDate: Date
      let periodEndDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      if (period === '7d') {
        const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
        sunday.setHours(0, 0, 0, 0)
        periodStartDate = sunday
        periodEndDate = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 6, 23, 59, 59)
      } else if (period === '30d') {
        periodStartDate = new Date(now.getTime() - 29 * 86400000)
        periodStartDate.setHours(0, 0, 0, 0)
      } else if (period === '90d') {
        periodStartDate = new Date(now.getTime() - 89 * 86400000)
        periodStartDate.setHours(0, 0, 0, 0)
      } else {
        // 1y
        periodStartDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        periodStartDate.setHours(0, 0, 0, 0)
      }

      const [
        todayStats,
        yestStats,
        weekStats,
        prevWeekStats,
        monthStats,
        rawPeriodDaily
      ] = await Promise.all([
        api.getSessionStats(todayStart, todayEnd),
        api.getSessionStats(yestStart, yestEnd),
        api.getSessionStats(thisWeekStart.toISOString(), thisWeekEnd.toISOString()),
        api.getSessionStats(prevWeekStart.toISOString(), prevWeekEnd.toISOString()),
        api.getSessionStats(thisMonthStart.toISOString(), thisMonthEnd.toISOString()),
        api.getDailyStudyData(periodStartDate.toISOString(), periodEndDate.toISOString())
      ])

      setTodayMinutes(todayStats?.total_minutes || 0)
      setYesterdayMinutes(yestStats?.total_minutes || 0)
      setWeekMinutes(weekStats?.total_minutes || 0)
      setPrevWeekMinutes(prevWeekStats?.total_minutes || 0)
      setMonthMinutes(monthStats?.total_minutes || 0)

      // Process Daily Data Points for the selected period
      const dailyMap: Record<string, number> = {}
      if (Array.isArray(rawPeriodDaily)) {
        rawPeriodDaily.forEach((item: any) => {
          if (item && item.date) {
            dailyMap[item.date] = Number(item.total_minutes) || 0
          }
        })
      }

      const points: DayStudyPoint[] = []
      const weekdayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
      const weekdayShorts = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

      if (period === '7d') {
        const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
        for (let i = 0; i < 7; i++) {
          const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i)
          const year = d.getFullYear()
          const month = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          const dateStr = `${year}-${month}-${day}`
          const mins = dailyMap[dateStr] || 0
          points.push({
            dateStr,
            label: weekdayShorts[d.getDay()],
            fullDate: `${day}/${month}/${year}`,
            weekdayName: weekdayNames[d.getDay()],
            minutes: mins,
            hoursFormatted: formatMinutesToHours(mins)
          })
        }
      } else if (period === '30d') {
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 86400000)
          const dateStr = d.toISOString().slice(0, 10)
          const mins = dailyMap[dateStr] || 0
          const dayNum = String(d.getDate()).padStart(2, '0')
          const monthNum = String(d.getMonth() + 1).padStart(2, '0')
          points.push({
            dateStr,
            label: `${dayNum}/${monthNum}`,
            fullDate: `${dayNum}/${monthNum}/${d.getFullYear()}`,
            weekdayName: weekdayNames[d.getDay()],
            minutes: mins,
            hoursFormatted: formatMinutesToHours(mins)
          })
        }
      } else if (period === '90d') {
        for (let i = 89; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 86400000)
          const dateStr = d.toISOString().slice(0, 10)
          const mins = dailyMap[dateStr] || 0
          const dayNum = String(d.getDate()).padStart(2, '0')
          const monthNum = String(d.getMonth() + 1).padStart(2, '0')
          points.push({
            dateStr,
            label: `${dayNum}/${monthNum}`,
            fullDate: `${dayNum}/${monthNum}/${d.getFullYear()}`,
            weekdayName: weekdayNames[d.getDay()],
            minutes: mins,
            hoursFormatted: formatMinutesToHours(mins)
          })
        }
      } else {
        // 1 ano (12 meses agrupados por mês)
        const monthsNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth()

        for (let i = 11; i >= 0; i--) {
          const targetDate = new Date(currentYear, currentMonth - i, 1)
          const year = targetDate.getFullYear()
          const month = targetDate.getMonth()
          const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`

          // Sum all days in that month
          let monthMins = 0
          Object.keys(dailyMap).forEach(k => {
            if (k.startsWith(monthKey)) {
              monthMins += dailyMap[k]
            }
          })

          points.push({
            dateStr: monthKey,
            label: monthsNames[month],
            fullDate: `${monthsNames[month]} de ${year}`,
            weekdayName: `${year}`,
            minutes: monthMins,
            hoursFormatted: formatMinutesToHours(monthMins)
          })
        }
      }

      setDailyData(points)
    } catch (err) {
      console.error('Erro ao carregar dados de estudo de Métricas:', err)
    }
  }

  // Calculate statistics for the period
  const stats = useMemo(() => {
    if (dailyData.length === 0) {
      return {
        totalMinutes: 0,
        averageMinutes: 0,
        maxMinutes: 0,
        summitPoint: null as DayStudyPoint | null,
        latestPoint: null as DayStudyPoint | null,
        comparison: { text: 'Na média', isPositive: true, isNeutral: true }
      }
    }

    const totalMinutes = dailyData.reduce((sum, d) => sum + d.minutes, 0)
    // Daily average across the period days
    const averageMinutes = Math.round(totalMinutes / dailyData.length)
    const maxMinutes = Math.max(...dailyData.map(d => d.minutes))

    const summitPoint = dailyData.find(d => d.minutes === maxMinutes && maxMinutes > 0) || null
    const latestPoint = dailyData[dailyData.length - 1] || null

    const diff = latestPoint ? latestPoint.minutes - averageMinutes : 0
    const comparison = formatDifference(diff)

    return {
      totalMinutes,
      averageMinutes,
      maxMinutes,
      summitPoint,
      latestPoint,
      comparison
    }
  }, [dailyData])

  // SVG container measurement for responsive, crystal-clear 1:1 vector resolution
  const svgWrapperRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(1000)

  useEffect(() => {
    if (!svgWrapperRef.current) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.round(entry.contentRect.width))
        }
      }
    })
    ro.observe(svgWrapperRef.current)
    return () => ro.disconnect()
  }, [])

  // Chart Dimensions and Vector Calculations - enhanced height for expansive resolution
  const chartWidth = Math.max(700, containerWidth)
  const chartHeight = 480
  const padding = { top: 45, right: 45, bottom: 55, left: 55 }

  const effectiveWidth = chartWidth - padding.left - padding.right
  const effectiveHeight = chartHeight - padding.top - padding.bottom
  const baselineY = chartHeight - padding.bottom

  // Dynamic vertical scale (hours)
  const maxHoursForScale = useMemo(() => {
    const rawHours = stats.maxMinutes / 60
    if (rawHours <= 2) return 3
    if (rawHours <= 4) return 5
    if (rawHours <= 6) return 8
    if (rawHours <= 10) return 12
    return Math.ceil(rawHours + 2)
  }, [stats.maxMinutes])

  const chartMaxMinutes = maxHoursForScale * 60

  // Coordinates of each daily study point
  const chartPoints = useMemo(() => {
    if (dailyData.length === 0) return []
    const stepX = dailyData.length > 1 ? effectiveWidth / (dailyData.length - 1) : 0

    return dailyData.map((d, index) => {
      const x = padding.left + index * stepX
      const clampedMinutes = Math.min(d.minutes, chartMaxMinutes)
      const y = baselineY - (clampedMinutes / chartMaxMinutes) * effectiveHeight
      return {
        ...d,
        x,
        y: Math.max(padding.top, Math.min(baselineY, y))
      }
    })
  }, [dailyData, effectiveWidth, effectiveHeight, baselineY, chartMaxMinutes, padding.left, padding.top])

  // Average line Y position
  const averageLineY = useMemo(() => {
    if (stats.averageMinutes <= 0) return baselineY
    const clampedAvg = Math.min(stats.averageMinutes, chartMaxMinutes)
    const y = baselineY - (clampedAvg / chartMaxMinutes) * effectiveHeight
    return Math.max(padding.top, Math.min(baselineY, y))
  }, [stats.averageMinutes, chartMaxMinutes, effectiveHeight, baselineY, padding.top])

  // Spline paths
  const splinePath = useMemo(() => generateSplinePath(chartPoints), [chartPoints])
  const splineArea = useMemo(() => generateSplineArea(chartPoints, baselineY), [chartPoints, baselineY])

  return (
    <div className={styles.metrics}>
      {/* 1. Action Header */}
      <div className={styles.headerRow}>

        <button
          type="button"
          className={styles.pomodoroLinkBtn}
          onClick={() => navigate('/pomodoro')}
          title="Ir para o Pomodoro e iniciar uma sessão de foco"
        >
          <Timer size={16} />
          <span>Timer</span>
        </button>
      </div>

      {/* 2. Four Discreet Key Metric Cards */}
      <div className={styles.metricsGrid}>
        {/* Hoje */}
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Hoje</span>
            <Clock size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>
            {formatMinutesToHours(todayMinutes)}
          </div>
          <div className={styles.metricSubtext}>
            {yesterdayMinutes > 0 ? (
              todayMinutes >= yesterdayMinutes ? (
                <span className={styles.trendPositive}>
                  <TrendingUp size={12} /> +{formatMinutesToHours(todayMinutes - yesterdayMinutes)} vs ontem
                </span>
              ) : (
                <span className={styles.trendNegative}>
                  <TrendingDown size={12} /> -{formatMinutesToHours(yesterdayMinutes - todayMinutes)} vs ontem
                </span>
              )
            ) : (
              <span>Foco acumulado hoje</span>
            )}
          </div>
        </div>

        {/* Esta semana */}
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Esta semana</span>
            <CalendarIcon size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>
            {formatMinutesToHours(weekMinutes)}
          </div>
          <div className={styles.metricSubtext}>
            {prevWeekMinutes > 0 ? (
              <span>vs {formatMinutesToHours(prevWeekMinutes)} semana anterior</span>
            ) : (
              <span>Total de ciclos semanais</span>
            )}
          </div>
        </div>

        {/* Este mês */}
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Este mês</span>
            <Mountain size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>
            {formatMinutesToHours(monthMinutes)}
          </div>
          <div className={styles.metricSubtext}>
            <span>Progresso do mês</span>
          </div>
        </div>

        {/* Média diária */}
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Média diária</span>
            <Compass size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>
            {formatMinutesToHours(stats.averageMinutes)}
          </div>
          <div className={styles.metricSubtext}>
            <span>Período de {period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : period === '90d' ? '90 dias' : '1 ano'}</span>
          </div>
        </div>
      </div>

      {/* 3. Main Chart Card: Mountain & Evolution Trail */}
      <div className={styles.chartCard} ref={chartContainerRef}>
        <div className={styles.chartCardHeader}>
          <div>
            <h3 className={styles.chartCardTitle}>Evolução do Tempo de Estudo</h3>
            <p className={styles.chartCardSubtitle}>
              Trilha de elevação diária — gerada automaticamente pelos seus ciclos no Pomodoro
            </p>
          </div>

          <div className={styles.chartControlsRow}>
            {/* Difference vs Average Badge */}
            {stats.comparison && stats.latestPoint && (
              <div
                className={`
                  ${styles.diffBadge}
                  ${stats.comparison.isNeutral ? styles.diffBadgeNeutral : stats.comparison.isPositive ? styles.diffBadgePositive : styles.diffBadgeNegative}
                `}
              >
                {stats.comparison.isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                <span>{stats.comparison.text}</span>
              </div>
            )}

            {/* Period Filters */}
            <div className={styles.periodFilterGroup}>
              <button
                type="button"
                className={`${styles.periodBtn} ${period === '7d' ? styles.periodBtnActive : ''}`}
                onClick={() => setPeriod('7d')}
              >
                7 dias
              </button>
              <button
                type="button"
                className={`${styles.periodBtn} ${period === '30d' ? styles.periodBtnActive : ''}`}
                onClick={() => setPeriod('30d')}
              >
                30 dias
              </button>
              <button
                type="button"
                className={`${styles.periodBtn} ${period === '90d' ? styles.periodBtnActive : ''}`}
                onClick={() => setPeriod('90d')}
              >
                90 dias
              </button>
              <button
                type="button"
                className={`${styles.periodBtn} ${period === '1y' ? styles.periodBtnActive : ''}`}
                onClick={() => setPeriod('1y')}
              >
                1 ano
              </button>
            </div>
          </div>
        </div>

        {/* SVG Mountain Elevation Canvas */}
        <div ref={svgWrapperRef} className={styles.svgWrapper}>
          <svg
            className={styles.mountainSvg}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          >
            <defs>
              {/* Mountain Silhouettes Linear Gradients */}
              <linearGradient id="distantMountainGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary-600)" stopOpacity="0.08" />
                <stop offset="100%" stopColor="var(--primary-600)" stopOpacity="0.00" />
              </linearGradient>

              <linearGradient id="midMountainGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary-500)" stopOpacity="0.14" />
                <stop offset="100%" stopColor="var(--primary-500)" stopOpacity="0.01" />
              </linearGradient>

              {/* Area Under the Trail Curve */}
              <linearGradient id="trailAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary-500)" stopOpacity="0.32" />
                <stop offset="50%" stopColor="var(--primary-500)" stopOpacity="0.12" />
                <stop offset="100%" stopColor="var(--primary-500)" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Background Silhouettes: Atmospheric mountain ridges */}
            <path
              d={`
                M ${padding.left} ${baselineY}
                L ${padding.left} ${baselineY - effectiveHeight * 0.52}
                Q ${padding.left + effectiveWidth * 0.25} ${baselineY - effectiveHeight * 0.80} ${padding.left + effectiveWidth * 0.45} ${baselineY - effectiveHeight * 0.60}
                T ${padding.left + effectiveWidth * 0.8} ${baselineY - effectiveHeight * 0.86}
                L ${padding.left + effectiveWidth} ${baselineY - effectiveHeight * 0.68}
                L ${padding.left + effectiveWidth} ${baselineY}
                Z
              `}
              fill="url(#distantMountainGrad)"
              className={styles.distantMountain}
            />

            <path
              d={`
                M ${padding.left} ${baselineY}
                L ${padding.left} ${baselineY - effectiveHeight * 0.30}
                Q ${padding.left + effectiveWidth * 0.18} ${baselineY - effectiveHeight * 0.64} ${padding.left + effectiveWidth * 0.38} ${baselineY - effectiveHeight * 0.42}
                T ${padding.left + effectiveWidth * 0.72} ${baselineY - effectiveHeight * 0.68}
                L ${padding.left + effectiveWidth} ${baselineY - effectiveHeight * 0.50}
                L ${padding.left + effectiveWidth} ${baselineY}
                Z
              `}
              fill="url(#midMountainGrad)"
              className={styles.midMountain}
            />

            {/* Horizontal Gridlines & Y-Axis Scale Labels */}
            {Array.from({ length: 5 }).map((_, i) => {
              const fraction = i / 4
              const yPos = baselineY - fraction * effectiveHeight
              const hoursVal = (fraction * maxHoursForScale).toFixed(fraction === 0 || maxHoursForScale % 4 === 0 ? 0 : 1)

              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={yPos}
                    x2={padding.left + effectiveWidth}
                    y2={yPos}
                    className={styles.gridLine}
                  />
                  <text
                    x={padding.left - 12}
                    y={yPos + 4}
                    textAnchor="end"
                    className={styles.yAxisText}
                  >
                    {hoursVal}h
                  </text>
                </g>
              )
            })}

            {/* Baseline (Ground Level) */}
            <line
              x1={padding.left}
              y1={baselineY}
              x2={padding.left + effectiveWidth}
              y2={baselineY}
              className={styles.baseLine}
            />

            {/* Secondary Average Line across the period */}
            {stats.averageMinutes > 0 && (
              <g className={styles.averageLineGroup}>
                <line
                  x1={padding.left}
                  y1={averageLineY}
                  x2={padding.left + effectiveWidth}
                  y2={averageLineY}
                  className={styles.averageLine}
                />
                <rect
                  x={padding.left + effectiveWidth - 75}
                  y={averageLineY - 18}
                  width="75"
                  height="16"
                  rx="4"
                  className={styles.averageTagBg}
                />
                <text
                  x={padding.left + effectiveWidth - 38}
                  y={averageLineY - 6}
                  textAnchor="middle"
                  className={styles.averageTagText}
                >
                  Média: {formatMinutesToHours(stats.averageMinutes)}
                </text>
              </g>
            )}

            {/* Spline Area Fill (Altitude shading) */}
            {splineArea && (
              <path
                d={splineArea}
                fill="url(#trailAreaGrad)"
                className={styles.trailArea}
              />
            )}

            {/* Main Spline Evolution Trail */}
            {splinePath && (
              <path
                d={splinePath}
                className={styles.trailPath}
              />
            )}

            {/* Data Waypoints along the Trail & X-Axis Labels */}
            {chartPoints.map((pt, idx) => {
              const isSummit = stats.summitPoint && stats.summitPoint.dateStr === pt.dateStr && pt.minutes > 0
              const isLatest = idx === chartPoints.length - 1
              const isHovered = hoveredPoint && hoveredPoint.point.dateStr === pt.dateStr

              // Calculate label frequency so dates never overlap
              let showXLabel = true
              if (period === '30d') {
                showXLabel = idx % 4 === 0 || idx === chartPoints.length - 1
              } else if (period === '90d') {
                showXLabel = idx % 12 === 0 || idx === chartPoints.length - 1
              }

              return (
                <g
                  key={pt.dateStr}
                  className={styles.pointGroup}
                  onMouseEnter={() => setHoveredPoint({ point: pt, x: pt.x, y: pt.y })}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Invisible wide hit area for easy hovering */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={16}
                    fill="transparent"
                    className={styles.hitArea}
                  />

                  {/* Clean, stable waypoint circle on the line */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : isSummit ? 5 : 4}
                    className={`${styles.waypointDot} ${isSummit ? styles.summitDot : isLatest ? styles.latestDot : ''
                      } ${isHovered ? styles.hoveredDot : ''}`}
                  />

                  {/* X-Axis Day/Date Label */}
                  {showXLabel && (
                    <text
                      x={pt.x}
                      y={baselineY + 22}
                      textAnchor="middle"
                      className={`${styles.xAxisText} ${isHovered ? styles.xAxisTextActive : ''}`}
                    >
                      {pt.label}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Hover Vertical Line */}
            {hoveredPoint && (
              <g className={styles.hoverGuideGroup}>
                <line
                  x1={hoveredPoint.x}
                  y1={padding.top}
                  x2={hoveredPoint.x}
                  y2={baselineY}
                  className={styles.hoverVerticalLine}
                />
              </g>
            )}
          </svg>

          {/* Interactive Floating Tooltip */}
          {hoveredPoint && (
            <div
              className={styles.floatingTooltip}
              style={{
                left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                top: `${Math.max(10, (hoveredPoint.y / chartHeight) * 100 - 24)}%`
              }}
            >
              <div className={styles.tooltipHeader}>
                <span className={styles.tooltipDate}>{hoveredPoint.point.fullDate}</span>
                <span className={styles.tooltipDayName}>{hoveredPoint.point.weekdayName}</span>
              </div>

              <div className={styles.tooltipTimeRow}>
                <Clock size={14} className={styles.tooltipTimeIcon} />
                <span className={styles.tooltipTimeVal}>
                  {hoveredPoint.point.minutes > 0
                    ? `${hoveredPoint.point.hoursFormatted} estudados`
                    : 'Sem estudo registrado'}
                </span>
              </div>

              {/* Comparison vs period average */}
              {stats.averageMinutes > 0 && (
                <div className={styles.tooltipDiffRow}>
                  {hoveredPoint.point.minutes >= stats.averageMinutes ? (
                    <span className={styles.tooltipPositive}>
                      +{formatMinutesToHours(hoveredPoint.point.minutes - stats.averageMinutes)} acima da média
                    </span>
                  ) : (
                    <span className={styles.tooltipNegative}>
                      -{formatMinutesToHours(stats.averageMinutes - hoveredPoint.point.minutes)} abaixo da média
                    </span>
                  )}
                </div>
              )}

              {/* Summit peak badge */}
              {stats.summitPoint && stats.summitPoint.dateStr === hoveredPoint.point.dateStr && hoveredPoint.point.minutes > 0 && (
                <div className={styles.tooltipSummitBadge}>
                  <Mountain size={12} />
                  <span>Cume do período (maior tempo)</span>
                </div>
              )}
            </div>
          )}
        </div>


      </div>
    </div>
  )
}

export default Metrics
