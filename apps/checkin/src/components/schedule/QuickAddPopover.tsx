import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSetAtom } from 'jotai'
import { createScheduleAtom } from '../../stores/scheduleStore'
import { getNextColorIndex } from '../../utils/scheduleColors'

interface QuickAddPopoverProps {
  isOpen: boolean
  onClose: () => void
  position: { x: number; y: number }
  date: Date
  startTime: Date
  endTime: Date
  onOpenFullModal: (date: Date, startTime: string, endTime: string) => void
}

// Time spinner input component
interface TimeSpinnerProps {
  hours: number
  minutes: number
  onChange: (hours: number, minutes: number) => void
  label?: string
  hasError?: boolean
}

function TimeSpinner({ hours, minutes, onChange, label, hasError }: TimeSpinnerProps) {
  const hourInputRef = useRef<HTMLInputElement>(null)
  const minInputRef = useRef<HTMLInputElement>(null)

  const adjustHours = (delta: number) => {
    const newHours = (hours + delta + 24) % 24
    onChange(newHours, minutes)
  }

  const adjustMinutes = (delta: number) => {
    let newMinutes = minutes + delta
    let newHours = hours

    if (newMinutes >= 60) {
      newMinutes = 0
      newHours = (hours + 1) % 24
    } else if (newMinutes < 0) {
      newMinutes = 55
      newHours = (hours - 1 + 24) % 24
    }

    onChange(newHours, newMinutes)
  }

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value === '') {
      onChange(0, minutes)
      return
    }
    const num = Math.min(23, Math.max(0, parseInt(value, 10)))
    onChange(num, minutes)
  }

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value === '') {
      onChange(hours, 0)
      return
    }
    const num = Math.min(59, Math.max(0, parseInt(value, 10)))
    onChange(hours, num)
  }

  const handleHourKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      adjustHours(1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      adjustHours(-1)
    } else if (e.key === 'ArrowRight' && hourInputRef.current?.selectionStart === 2) {
      minInputRef.current?.focus()
      minInputRef.current?.select()
    }
  }

  const handleMinuteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      adjustMinutes(5)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      adjustMinutes(-5)
    } else if (e.key === 'ArrowLeft' && minInputRef.current?.selectionStart === 0) {
      hourInputRef.current?.focus()
      hourInputRef.current?.select()
    }
  }

  const handleHourBlur = () => {
    // Ensure valid range on blur
    onChange(Math.min(23, Math.max(0, hours)), minutes)
  }

  const handleMinuteBlur = () => {
    // Ensure valid range on blur
    onChange(hours, Math.min(59, Math.max(0, minutes)))
  }

  return (
    <div className="flex flex-col items-center">
      {label && <span className="text-[10px] text-[#65676B] mb-1">{label}</span>}
      <div
        className={`flex items-center bg-white border rounded-lg ${hasError ? 'border-red-400' : 'border-[#DADDE1]'} overflow-hidden`}
      >
        {/* Hours */}
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => adjustHours(1)}
            className="px-1 py-0.5 text-[#65676B] hover:bg-[#F0F2F5] transition-colors"
            tabIndex={-1}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
          <input
            ref={hourInputRef}
            type="text"
            value={hours.toString().padStart(2, '0')}
            onChange={handleHourChange}
            onKeyDown={handleHourKeyDown}
            onBlur={handleHourBlur}
            onFocus={(e) => e.target.select()}
            className="w-7 text-center text-sm font-medium text-[#050505] focus:outline-none"
            maxLength={2}
          />
          <button
            type="button"
            onClick={() => adjustHours(-1)}
            className="px-1 py-0.5 text-[#65676B] hover:bg-[#F0F2F5] transition-colors"
            tabIndex={-1}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        <span className="text-sm font-medium text-[#050505]">:</span>

        {/* Minutes */}
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => adjustMinutes(5)}
            className="px-1 py-0.5 text-[#65676B] hover:bg-[#F0F2F5] transition-colors"
            tabIndex={-1}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
          <input
            ref={minInputRef}
            type="text"
            value={minutes.toString().padStart(2, '0')}
            onChange={handleMinuteChange}
            onKeyDown={handleMinuteKeyDown}
            onBlur={handleMinuteBlur}
            onFocus={(e) => e.target.select()}
            className="w-7 text-center text-sm font-medium text-[#050505] focus:outline-none"
            maxLength={2}
          />
          <button
            type="button"
            onClick={() => adjustMinutes(-5)}
            className="px-1 py-0.5 text-[#65676B] hover:bg-[#F0F2F5] transition-colors"
            tabIndex={-1}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function QuickAddPopover({
  isOpen,
  onClose,
  position,
  date,
  startTime: initialStartTime,
  endTime: initialEndTime,
  onOpenFullModal
}: QuickAddPopoverProps): React.ReactElement | null {
  const { t } = useTranslation()
  const createSchedule = useSetAtom(createScheduleAtom)
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startHours, setStartHours] = useState(0)
  const [startMinutes, setStartMinutes] = useState(0)
  const [endHours, setEndHours] = useState(0)
  const [endMinutes, setEndMinutes] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Initialize time from props
  useEffect(() => {
    if (isOpen) {
      setStartHours(initialStartTime.getHours())
      setStartMinutes(initialStartTime.getMinutes())
      setEndHours(initialEndTime.getHours())
      setEndMinutes(initialEndTime.getMinutes())
    }
  }, [isOpen, initialStartTime, initialEndTime])

  // Focus input when popover opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle click outside and ESC key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setTitle('')
    }
  }, [isOpen])

  // Create Date objects from time values
  const actualStartTime = useMemo(() => {
    const newDate = new Date(date)
    newDate.setHours(startHours, startMinutes, 0, 0)
    return newDate
  }, [date, startHours, startMinutes])

  const actualEndTime = useMemo(() => {
    const newDate = new Date(date)
    newDate.setHours(endHours, endMinutes, 0, 0)
    return newDate
  }, [date, endHours, endMinutes])

  // Calculate duration
  const durationMinutes = useMemo(() => {
    const startTotal = startHours * 60 + startMinutes
    const endTotal = endHours * 60 + endMinutes
    return endTotal - startTotal
  }, [startHours, startMinutes, endHours, endMinutes])

  const durationText = useMemo(() => {
    if (durationMinutes <= 0) return ''
    const hours = Math.floor(durationMinutes / 60)
    const mins = durationMinutes % 60
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${mins}m`
    }
  }, [durationMinutes])

  const isValidTime = durationMinutes > 0

  // Handle start time change with auto-adjust
  const handleStartTimeChange = useCallback(
    (hours: number, minutes: number) => {
      setStartHours(hours)
      setStartMinutes(minutes)

      // Auto-adjust end time if needed
      const startTotal = hours * 60 + minutes
      const endTotal = endHours * 60 + endMinutes

      if (endTotal <= startTotal) {
        // Set end time to 1 hour after start time
        const newEndTotal = startTotal + 60
        setEndHours(Math.floor(newEndTotal / 60) % 24)
        setEndMinutes(newEndTotal % 60)
      }
    },
    [endHours, endMinutes]
  )

  const handleEndTimeChange = useCallback((hours: number, minutes: number) => {
    setEndHours(hours)
    setEndMinutes(minutes)
  }, [])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !isValidTime) return

    setIsSubmitting(true)
    try {
      await createSchedule({
        title: title.trim(),
        startTime: actualStartTime,
        endTime: actualEndTime,
        colorIndex: getNextColorIndex()
      })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMoreOptions = () => {
    const startTimeStr = `${startHours.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`
    const endTimeStr = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
    onOpenFullModal(date, startTimeStr, endTimeStr)
    onClose()
  }

  // Calculate position to keep popover in viewport
  const adjustedPosition = {
    left: Math.min(position.x, window.innerWidth - 340),
    top: Math.min(position.y, window.innerHeight - 260)
  }

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 bg-white rounded-xl shadow-xl border border-[#DADDE1] p-4 w-auto min-w-[320px] animate-fade-in"
      style={{
        left: adjustedPosition.left,
        top: adjustedPosition.top
      }}
    >
      {/* Date Display */}
      <div className="flex items-center gap-2 mb-3 text-sm text-[#65676B]">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>
          {date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
        </span>
      </div>

      {/* Time Spinners - Always visible inline */}
      <div className="mb-3 p-2 bg-[#F0F2F5] rounded-lg">
        <div className="flex items-center justify-center gap-3">
          <TimeSpinner
            hours={startHours}
            minutes={startMinutes}
            onChange={handleStartTimeChange}
            label={t('schedule.startTime')}
          />

          <div className="flex flex-col items-center justify-center pt-4">
            <svg
              className="w-4 h-4 text-[#65676B]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </div>

          <TimeSpinner
            hours={endHours}
            minutes={endMinutes}
            onChange={handleEndTimeChange}
            label={t('schedule.endTime')}
            hasError={!isValidTime}
          />
        </div>

        {/* Duration display */}
        <div className="mt-2 text-center">
          {!isValidTime ? (
            <p className="text-xs text-red-500">{t('schedule.invalidTimeRange')}</p>
          ) : durationText ? (
            <p className="text-xs text-[#65676B]">
              <span className="font-medium">{durationText}</span>
            </p>
          ) : null}
        </div>
      </div>

      {/* Quick Add Form */}
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('schedule.quickAddPlaceholder')}
          className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-[#050505] placeholder-[#8A8D91] focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] text-sm"
          disabled={isSubmitting}
        />

        <div className="flex items-center gap-2 mt-3">
          <button
            type="submit"
            disabled={!title.trim() || isSubmitting || !isValidTime}
            className="flex-1 py-2 px-3 bg-[#1877F2] text-white rounded-lg text-sm font-medium hover:bg-[#166FE5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? t('common.saving') : t('common.create')}
          </button>
          <button
            type="button"
            onClick={handleMoreOptions}
            className="py-2 px-3 text-[#1877F2] rounded-lg text-sm font-medium hover:bg-[#E7F3FF] transition-colors"
          >
            {t('schedule.moreOptions')}
          </button>
        </div>
      </form>

      {/* Keyboard Hint */}
      <p className="text-xs text-[#8A8D91] mt-2 text-center">
        {t('schedule.quickAddHint')} · ↑↓ {t('schedule.timeAdjustHint')}
      </p>
    </div>
  )
}

export default QuickAddPopover
