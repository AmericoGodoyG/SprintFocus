import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Minus, Plus } from 'lucide-react'
import styles from './HorizontalRulerPicker.module.css'

interface HorizontalRulerPickerProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  unit?: string
  testId?: string
  ariaLabel?: string
  stepAmount?: number
  valTestId?: string
  btnMinusTestId?: string
  btnPlusTestId?: string
}

const TICK_SPACING = 8 // pixels between each minute mark

export const HorizontalRulerPicker: React.FC<HorizontalRulerPickerProps> = ({
  value,
  onChange,
  min = 1,
  max = 120,
  step = 1,
  disabled = false,
  unit = 'min',
  testId = 'horizontal-ruler-picker',
  ariaLabel = 'Seletor de tempo horizontal',
  stepAmount,
  valTestId,
  btnMinusTestId,
  btnPlusTestId
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartValRef = useRef(value)
  const [isInteracting, setIsInteracting] = useState(false)

  // Clamp helper
  const clamp = useCallback(
    (val: number) => {
      const stepped = Math.round(val / step) * step
      return Math.max(min, Math.min(max, stepped))
    },
    [min, max, step]
  )

  // Generate tick marks from 0 to max
  const ticks = useMemo(() => {
    const list: Array<{ minute: number; isMajor: boolean }> = []
    for (let m = 0; m <= max; m++) {
      list.push({
        minute: m,
        isMajor: m % 5 === 0
      })
    }
    return list
  }, [max])

  // Center offset calculation:
  // With ticksTrack at left: 50%, translating by -value * TICK_SPACING locks tick `value` at 50%
  const currentOffset = useMemo(() => {
    return -value * TICK_SPACING
  }, [value])

  // Drag Interaction (Mouse / Touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    isDraggingRef.current = true
    dragStartXRef.current = e.clientX
    dragStartValRef.current = value
    setIsInteracting(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || disabled) return
    const deltaX = e.clientX - dragStartXRef.current
    // Dragging right brings lower numbers into view; dragging left increases numbers
    const deltaMinutes = -deltaX / TICK_SPACING
    const nextVal = clamp(dragStartValRef.current + deltaMinutes)
    if (nextVal !== value) {
      onChange(nextVal)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    setIsInteracting(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  // Wheel interaction (horizontal or vertical scroll)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (disabled) return
    e.preventDefault()
    const delta = e.deltaY || e.deltaX
    if (Math.abs(delta) < 2) return

    const direction = delta > 0 ? 1 : -1
    const shiftMultiplier = e.shiftKey ? 5 : 1
    const nextVal = clamp(value + direction * shiftMultiplier * step)
    if (nextVal !== value) {
      onChange(nextVal)
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      const jump = e.shiftKey ? 5 : 1
      onChange(clamp(value + jump))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      const jump = e.shiftKey ? 5 : 1
      onChange(clamp(value - jump))
    } else if (e.key === 'PageUp') {
      e.preventDefault()
      onChange(clamp(value + 10))
    } else if (e.key === 'PageDown') {
      e.preventDefault()
      onChange(clamp(value - 10))
    } else if (e.key === 'Home') {
      e.preventDefault()
      onChange(min)
    } else if (e.key === 'End') {
      e.preventDefault()
      onChange(max)
    }
  }

  return (
    <div
      className={`${styles.rulerWrapper} ${disabled ? styles.disabled : ''} ${
        isInteracting ? styles.interacting : ''
      }`}
      data-testid={testId}
    >
      {/* Recessed Notch Chamber inspired by reference image */}
      <div
        ref={containerRef}
        className={styles.rulerChamber}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} ${unit}`}
      >
        {/* Subtle Vignette Mask for optical depth & smooth edge fade */}
        <div className={styles.ticksViewport}>
          <div
            className={styles.ticksTrack}
            style={{
              transform: `translateX(${currentOffset}px)`,
              transition: isInteracting ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0, 0, 1)'
            }}
          >
            {ticks.map(({ minute, isMajor }) => {
              const isSelected = minute === value
              return (
                <div
                  key={minute}
                  className={`${styles.tickContainer} ${isMajor ? styles.majorTickContainer : ''}`}
                  style={{ left: `${minute * TICK_SPACING}px` }}
                >
                  <div
                    className={`
                      ${styles.tickBar}
                      ${isMajor ? styles.majorTick : styles.minorTick}
                      ${isSelected ? styles.selectedTick : ''}
                    `}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Center Vertical Yellow Marker (Needle) */}
        <div className={styles.yellowCenterMarker} aria-hidden="true" />
      </div>

      {/* Stepper Box below the ruler chamber: [-] {value} min [+] */}
      <div className={styles.stepperBox} data-testid={`${testId}-stepper`}>
        <button
          type="button"
          className={styles.stepperBtn}
          onClick={() => {
            const delta = stepAmount !== undefined ? stepAmount : step
            onChange(clamp(value - delta))
          }}
          disabled={disabled || value <= min}
          title={`Diminuir tempo em ${stepAmount !== undefined ? stepAmount : step} minuto${(stepAmount !== undefined ? stepAmount : step) > 1 ? 's' : ''}`}
          aria-label="Diminuir tempo"
          data-testid={btnMinusTestId || `${testId}-btn-minus`}
        >
          <Minus size={13} />
        </button>
        <div className={styles.stepperValueDisplay}>
          <span className={styles.stepperNum} data-testid={valTestId}>
            {value}
          </span>
          <span className={styles.stepperUnit}>{unit}</span>
        </div>
        <button
          type="button"
          className={styles.stepperBtn}
          onClick={() => {
            const delta = stepAmount !== undefined ? stepAmount : step
            onChange(clamp(value + delta))
          }}
          disabled={disabled || value >= max}
          title={`Aumentar tempo em ${stepAmount !== undefined ? stepAmount : step} minuto${(stepAmount !== undefined ? stepAmount : step) > 1 ? 's' : ''}`}
          aria-label="Aumentar tempo"
          data-testid={btnPlusTestId || `${testId}-btn-plus`}
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  )
}

export default HorizontalRulerPicker
