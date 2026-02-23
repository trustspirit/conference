import React, { useState, useRef, useEffect } from 'react'
import type { ScheduleEvent } from '../../types'
import { getEventColorStyles } from '../../utils/scheduleColors'
import { formatTime, formatDate } from './scheduleUtils'

interface ScheduleEventCardProps {
  event: ScheduleEvent
  onClick?: (event: ScheduleEvent) => void
  onDragStart?: (event: ScheduleEvent) => void
  onDragEnd?: () => void
  onHoverStart?: () => void
  style?: React.CSSProperties
  compact?: boolean
  orientation?: 'vertical' | 'horizontal'
  draggable?: boolean
}

function ScheduleEventCard({
  event,
  onClick,
  onDragStart,
  onDragEnd,
  onHoverStart,
  style,
  compact = false,
  orientation = 'vertical',
  draggable = true
}: ScheduleEventCardProps): React.ReactElement {
  const colors = getEventColorStyles(event.color, event.colorIndex)
  const [showTooltip, setShowTooltip] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom' | 'left' | 'right'>(
    'right'
  )
  const cardRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.(event)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent grid from receiving mousedown and starting a drag selection
    e.stopPropagation()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    // Prevent grid from receiving mousemove and showing hover highlight
    e.stopPropagation()
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    setShowTooltip(false)
    // Store event data for transfer
    e.dataTransfer.setData('application/json', JSON.stringify(event))
    e.dataTransfer.effectAllowed = 'move'
    onDragStart?.(event)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    onDragEnd?.()
  }

  const handleMouseEnter = () => {
    if (isDragging) return
    // Notify parent to clear grid hover state
    onHoverStart?.()
    hoverTimeoutRef.current = setTimeout(() => {
      if (cardRef.current && !isDragging) {
        const rect = cardRef.current.getBoundingClientRect()
        const spaceRight = window.innerWidth - rect.right
        const spaceLeft = rect.left
        const spaceBottom = window.innerHeight - rect.bottom

        // Determine best position for tooltip
        if (spaceRight >= 280) {
          setTooltipPosition('right')
        } else if (spaceLeft >= 280) {
          setTooltipPosition('left')
        } else if (spaceBottom >= 150) {
          setTooltipPosition('bottom')
        } else {
          setTooltipPosition('top')
        }
      }
      setShowTooltip(true)
    }, 300) // 300ms delay before showing tooltip
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setShowTooltip(false)
  }

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  const isHorizontal = orientation === 'horizontal'
  const startDate = new Date(event.startTime)
  const endDate = new Date(event.endTime)

  // Calculate duration
  const durationMs = endDate.getTime() - startDate.getTime()
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
  const durationMins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
  const durationText =
    durationHours > 0
      ? durationMins > 0
        ? `${durationHours}시간 ${durationMins}분`
        : `${durationHours}시간`
      : `${durationMins}분`

  const getTooltipPositionStyles = (): React.CSSProperties => {
    switch (tooltipPosition) {
      case 'right':
        return { left: '100%', top: '0', marginLeft: '8px' }
      case 'left':
        return { right: '100%', top: '0', marginRight: '8px' }
      case 'bottom':
        return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' }
      case 'top':
        return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' }
    }
  }

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        opacity: isDragging ? 0.5 : 1,
        ...style
      }}
      className={`
        absolute rounded-lg border-l-4 cursor-pointer overflow-hidden
        hover:shadow-md transition-shadow duration-200
        ${isHorizontal ? 'flex items-center' : ''}
        ${compact ? 'p-1' : 'p-2'}
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
      `}
    >
      <div className={`${isHorizontal ? 'flex items-center gap-2 whitespace-nowrap' : ''}`}>
        <p
          className={`font-medium truncate ${compact ? 'text-xs' : 'text-sm'}`}
          style={{ color: colors.text }}
        >
          {event.title}
        </p>
        {!compact && (
          <p className="text-xs text-[#65676B] truncate">
            {formatTime(startDate)} - {formatTime(endDate)}
          </p>
        )}
        {!compact && event.location && (
          <p className="text-xs text-[#65676B] truncate mt-0.5">
            <span className="inline-flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {event.location}
            </span>
          </p>
        )}
      </div>

      {/* Hover Tooltip */}
      {showTooltip && (
        <div
          className="absolute z-[100] w-64 bg-white rounded-xl shadow-xl border border-[#DADDE1] p-4 pointer-events-none animate-fade-in"
          style={getTooltipPositionStyles()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Event Title with color indicator */}
          <div className="flex items-start gap-2 mb-3">
            <div
              className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
              style={{ backgroundColor: colors.border }}
            />
            <h4 className="font-semibold text-[#050505] text-sm leading-tight">{event.title}</h4>
          </div>

          {/* Date & Time */}
          <div className="flex items-center gap-2 text-xs text-[#65676B] mb-2">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{formatDate(startDate)}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#65676B] mb-2">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              {formatTime(startDate)} - {formatTime(endDate)} ({durationText})
            </span>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2 text-xs text-[#65676B] mb-2">
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{event.location}</span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="mt-3 pt-3 border-t border-[#E4E6EB]">
              <p className="text-xs text-[#65676B] line-clamp-3">{event.description}</p>
            </div>
          )}

          {/* Click hint */}
          <div className="mt-3 pt-2 border-t border-[#E4E6EB]">
            <p className="text-[10px] text-[#8A8D91] text-center">클릭하여 상세 보기</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduleEventCard
