import React, { useCallback, useMemo, useRef } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  schedulesAtom,
  selectedDateAtom,
  updateScheduleAtom,
  scheduleViewModeAtom,
  customStartDateAtom,
  customEndDateAtom
} from '../../stores/scheduleStore'
import type { ScheduleEvent } from '../../types'
import ScheduleEventCard from './ScheduleEventCard'
import QuickAddPopover from './QuickAddPopover'
import {
  HOURS,
  HOUR_HEIGHT,
  HALF_HOUR_HEIGHT,
  yToTime,
  timeToY,
  clampHours,
  getWeekDates,
  getCustomDateRange,
  getEventsForDay,
  calculateEventPosition,
  isToday,
  groupOverlappingEvents,
  createDateWithTime,
  getCurrentTimePosition
} from './scheduleUtils'
import { useScheduleGrid, type TimeRangeWithIndex, type DropTargetWithIndex } from './useScheduleGrid'

interface ScheduleWeekViewProps {
  onEventClick: (event: ScheduleEvent) => void
  onOpenAddModal: (date: Date, startTime: string, endTime: string) => void
}

function ScheduleWeekView({
  onEventClick,
  onOpenAddModal
}: ScheduleWeekViewProps): React.ReactElement {
  const schedules = useAtomValue(schedulesAtom)
  const selectedDate = useAtomValue(selectedDateAtom)
  const viewMode = useAtomValue(scheduleViewModeAtom)
  const customStartDate = useAtomValue(customStartDateAtom)
  const customEndDate = useAtomValue(customEndDateAtom)
  const updateSchedule = useSetAtom(updateScheduleAtom)

  // Get dates based on view mode
  const weekDates = useMemo(() => {
    if (viewMode === 'custom') {
      return getCustomDateRange(customStartDate, customEndDate)
    }
    return getWeekDates(selectedDate)
  }, [viewMode, selectedDate, customStartDate, customEndDate])

  const containerRef = useRef<HTMLDivElement>(null)

  // Use shared grid interactions hook
  const {
    quickAdd,
    setQuickAdd,
    closeQuickAdd,
    dragSelection,
    setDragSelection,
    isDragging,
    justFinishedDragging,
    persistedSelection,
    setPersistedSelection,
    draggedEvent,
    setDraggedEvent,
    dropTarget,
    setDropTarget,
    hoverCell,
    setHoverCell,
    handleCellLeave,
    handleEventHoverStart,
    handleEventDragStart,
    handleEventDragEnd,
    handleDragLeave
  } = useScheduleGrid({ multiDay: true })

  // Type assertions for multi-day variants
  const typedDragSelection = dragSelection as TimeRangeWithIndex | null
  const typedPersistedSelection = persistedSelection as TimeRangeWithIndex | null
  const typedDropTarget = dropTarget as DropTargetWithIndex | null
  const typedHoverCell = hoverCell as { dayIndex?: number; hours: number; minutes: number } | null

  const handleCellHover = useCallback(
    (e: React.MouseEvent, dayIndex: number) => {
      if (isDragging.current || draggedEvent || quickAdd) return

      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top
      const { hours, minutes } = yToTime(y)
      const clampedHours = clampHours(hours)

      setHoverCell({ dayIndex, hours: clampedHours, minutes })
    },
    [draggedEvent, quickAdd, setHoverCell]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, dayIndex: number) => {
      if (e.button !== 0) return

      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top
      const { hours, minutes } = yToTime(y)
      const clampedHours = clampHours(hours)

      isDragging.current = true
      setHoverCell(null)
      setDragSelection({
        dayIndex,
        startHours: clampedHours,
        startMinutes: minutes,
        endHours: clampedHours,
        endMinutes: minutes + 30 >= 60 ? 0 : minutes + 30
      })
    },
    [setHoverCell, setDragSelection]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, dayIndex: number) => {
      if (!isDragging.current || !typedDragSelection || typedDragSelection.dayIndex !== dayIndex)
        return

      const rect = e.currentTarget.getBoundingClientRect()
      const y = Math.max(0, Math.min(e.clientY - rect.top, HOURS.length * HOUR_HEIGHT))
      const { hours, minutes } = yToTime(y)
      const clampedHours = Math.min(clampHours(hours), HOURS[HOURS.length - 1] + 1)

      setDragSelection((prev) => {
        if (!prev) return null
        return { ...prev, endHours: clampedHours, endMinutes: minutes }
      })
    },
    [typedDragSelection, setDragSelection]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || !typedDragSelection) {
        isDragging.current = false
        return
      }

      isDragging.current = false
      justFinishedDragging.current = true

      const date = weekDates[typedDragSelection.dayIndex]

      // Calculate start and end times
      const startTotal = typedDragSelection.startHours * 60 + typedDragSelection.startMinutes
      const endTotal = typedDragSelection.endHours * 60 + typedDragSelection.endMinutes

      const minTotal = Math.min(startTotal, endTotal)
      const maxTotal = Math.max(startTotal, endTotal)

      // Ensure minimum 30 min duration
      const finalEndTotal = maxTotal <= minTotal ? minTotal + 30 : maxTotal

      const startTime = createDateWithTime(date, Math.floor(minTotal / 60), minTotal % 60)
      const endTime = createDateWithTime(date, Math.floor(finalEndTotal / 60), finalEndTotal % 60)

      // Persist the selection for display while quick add is open
      setPersistedSelection({
        dayIndex: typedDragSelection.dayIndex,
        startHours: Math.floor(minTotal / 60),
        startMinutes: minTotal % 60,
        endHours: Math.floor(finalEndTotal / 60),
        endMinutes: finalEndTotal % 60
      })

      setQuickAdd({
        isOpen: true,
        position: { x: e.clientX, y: e.clientY },
        date,
        startTime,
        endTime
      })

      setDragSelection(null)
    },
    [typedDragSelection, weekDates, setPersistedSelection, setQuickAdd, setDragSelection]
  )

  const handleCellClick = useCallback(
    (e: React.MouseEvent, dayIndex: number) => {
      // Skip if we just finished dragging (to avoid overwriting persistedSelection)
      if (justFinishedDragging.current) {
        justFinishedDragging.current = false
        return
      }
      // Only handle single click (not drag)
      if (isDragging.current) return

      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top
      const { hours, minutes } = yToTime(y)
      const clampedHours = clampHours(hours)

      const date = weekDates[dayIndex]
      const startTime = createDateWithTime(date, clampedHours, minutes)
      // Default to 30 min duration for click
      const endMinutes = minutes + 30
      const endTime = createDateWithTime(
        date,
        endMinutes >= 60 ? clampedHours + 1 : clampedHours,
        endMinutes >= 60 ? 0 : endMinutes
      )

      // Persist the selection for display while quick add is open
      setPersistedSelection({
        dayIndex,
        startHours: clampedHours,
        startMinutes: minutes,
        endHours: endMinutes >= 60 ? clampedHours + 1 : clampedHours,
        endMinutes: endMinutes >= 60 ? 0 : endMinutes
      })

      setQuickAdd({
        isOpen: true,
        position: { x: e.clientX, y: e.clientY },
        date,
        startTime,
        endTime
      })
    },
    [weekDates, setPersistedSelection, setQuickAdd]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, dayIndex: number) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'

      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top
      const { hours, minutes } = yToTime(y)
      const clampedHours = clampHours(hours)

      setDropTarget({ dayIndex, hours: clampedHours, minutes })
    },
    [setDropTarget]
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent, dayIndex: number) => {
      e.preventDefault()

      try {
        const eventData = JSON.parse(e.dataTransfer.getData('application/json')) as ScheduleEvent
        const rect = e.currentTarget.getBoundingClientRect()
        const y = e.clientY - rect.top
        const { hours, minutes } = yToTime(y)
        const clampedHours = clampHours(hours)

        // Calculate duration of the original event
        const originalStart = new Date(eventData.startTime)
        const originalEnd = new Date(eventData.endTime)
        const durationMs = originalEnd.getTime() - originalStart.getTime()

        // New start time
        const targetDate = weekDates[dayIndex]
        const newStartTime = createDateWithTime(targetDate, clampedHours, minutes)
        const newEndTime = new Date(newStartTime.getTime() + durationMs)

        // Update the event
        await updateSchedule({
          id: eventData.id,
          data: {
            startTime: newStartTime,
            endTime: newEndTime
          }
        })
      } catch (error) {
        console.error('Failed to drop event:', error)
      }

      setDraggedEvent(null)
      setDropTarget(null)
      setHoverCell(null)
      setPersistedSelection(null)
    },
    [weekDates, updateSchedule]
  )

  const nowPosition = getCurrentTimePosition(HOUR_HEIGHT, HOURS[0])
  const showNowLine = nowPosition >= 0 && nowPosition <= HOURS.length * HOUR_HEIGHT

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E4E6EB] overflow-hidden">
      {/* Scrollable container for both header and content */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ maxHeight: 'calc(100vh - 280px)' }}
      >
        {/* Header with day names - sticky */}
        <div
          className="grid border-b border-[#E4E6EB] sticky top-0 z-40 bg-white"
          style={{ gridTemplateColumns: `60px repeat(${weekDates.length}, 1fr)` }}
        >
          <div className="p-2 border-r border-[#E4E6EB] bg-white" />
          {weekDates.map((date, index) => {
            const today = isToday(date)
            return (
              <div
                key={index}
                className={`p-3 text-center border-r border-[#E4E6EB] last:border-r-0 ${
                  today ? 'bg-[#E7F3FF]' : 'bg-white'
                }`}
              >
                <div className="text-xs text-[#65676B] uppercase">
                  {date.toLocaleDateString('ko-KR', { weekday: 'short' })}
                </div>
                <div
                  className={`text-lg font-semibold ${
                    today
                      ? 'w-8 h-8 bg-[#1877F2] text-white rounded-full mx-auto flex items-center justify-center'
                      : 'text-[#050505]'
                  }`}
                >
                  {date.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Time grid */}
        <div
          className="grid relative"
          style={{ gridTemplateColumns: `60px repeat(${weekDates.length}, 1fr)` }}
        >
          {/* Time labels */}
          <div className="border-r border-[#E4E6EB] pt-0">
            {HOURS.map((hour, index) => (
              <div
                key={hour}
                className={`h-[60px] text-xs text-[#65676B] text-right pr-2 flex items-start justify-end ${index === 0 ? 'pt-1' : ''}`}
              >
                <span className="-mt-2">{hour.toString().padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((date, dayIndex) => {
            const dayEvents = getEventsForDay(schedules, date)
            const eventGroups = groupOverlappingEvents(dayEvents)
            const today = isToday(date)
            const isDropTarget = typedDropTarget?.dayIndex === dayIndex

            return (
              <div
                key={dayIndex}
                className={`relative border-r border-[#E4E6EB] last:border-r-0 cursor-pointer ${
                  today ? 'bg-[#F8FBFF]' : ''
                } ${isDropTarget && draggedEvent ? 'bg-[#E7F3FF]/50' : ''}`}
                onMouseDown={(e) => !draggedEvent && handleMouseDown(e, dayIndex)}
                onMouseMove={(e) => {
                  if (!draggedEvent) {
                    handleMouseMove(e, dayIndex)
                  }
                  handleCellHover(e, dayIndex)
                }}
                onMouseUp={(e) => !draggedEvent && handleMouseUp(e)}
                onClick={(e) => !draggedEvent && handleCellClick(e, dayIndex)}
                onMouseLeave={handleCellLeave}
                onDragOver={(e) => handleDragOver(e, dayIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dayIndex)}
              >
                {/* Hour and half-hour lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="h-[60px] border-b border-[#E4E6EB] last:border-b-0 relative"
                  >
                    {/* Half-hour line */}
                    <div className="absolute left-0 right-0 top-[30px] border-b border-[#E4E6EB]/50 border-dashed" />
                  </div>
                ))}

                {/* Hover highlight */}
                {typedHoverCell &&
                  typedHoverCell.dayIndex === dayIndex &&
                  !typedDragSelection &&
                  !draggedEvent && (
                    <div
                      className="absolute left-1 right-1 bg-[#1877F2]/10 rounded-md pointer-events-none z-5 transition-all duration-75"
                      style={{
                        top: timeToY(typedHoverCell.hours, typedHoverCell.minutes),
                        height: HALF_HOUR_HEIGHT
                      }}
                    />
                  )}

                {/* Drag selection overlay */}
                {typedDragSelection &&
                  typedDragSelection.dayIndex === dayIndex &&
                  (() => {
                    const startTotal =
                      typedDragSelection.startHours * 60 + typedDragSelection.startMinutes
                    const endTotal =
                      typedDragSelection.endHours * 60 + typedDragSelection.endMinutes
                    const minTotal = Math.min(startTotal, endTotal)
                    const maxTotal = Math.max(startTotal, endTotal)
                    const top = timeToY(Math.floor(minTotal / 60), minTotal % 60)
                    const height = Math.max(
                      ((maxTotal - minTotal) / 60) * HOUR_HEIGHT,
                      HALF_HOUR_HEIGHT
                    )
                    return (
                      <div
                        className="absolute left-1 right-1 bg-[#1877F2]/20 border-2 border-[#1877F2] border-dashed rounded-lg pointer-events-none z-10"
                        style={{ top, height }}
                      />
                    )
                  })()}

                {/* Persisted selection overlay (shown while quick add is open) */}
                {typedPersistedSelection &&
                  typedPersistedSelection.dayIndex === dayIndex &&
                  !typedDragSelection &&
                  (() => {
                    const startTotal =
                      typedPersistedSelection.startHours * 60 + typedPersistedSelection.startMinutes
                    const endTotal =
                      typedPersistedSelection.endHours * 60 + typedPersistedSelection.endMinutes
                    const top = timeToY(
                      typedPersistedSelection.startHours,
                      typedPersistedSelection.startMinutes
                    )
                    const height = Math.max(
                      ((endTotal - startTotal) / 60) * HOUR_HEIGHT,
                      HALF_HOUR_HEIGHT
                    )
                    return (
                      <div
                        className="absolute left-1 right-1 bg-[#1877F2]/20 border-2 border-[#1877F2] rounded-lg pointer-events-none z-10"
                        style={{ top, height }}
                      />
                    )
                  })()}

                {/* Drop preview indicator */}
                {draggedEvent &&
                  isDropTarget &&
                  typedDropTarget &&
                  (() => {
                    const originalStart = new Date(draggedEvent.startTime)
                    const originalEnd = new Date(draggedEvent.endTime)
                    const durationMs = originalEnd.getTime() - originalStart.getTime()
                    const durationMins = durationMs / (1000 * 60)
                    const top = timeToY(typedDropTarget.hours, typedDropTarget.minutes)
                    const height = (durationMins / 60) * HOUR_HEIGHT
                    return (
                      <div
                        className="absolute left-1 right-1 bg-[#1877F2]/30 border-2 border-[#1877F2] rounded-lg pointer-events-none z-10"
                        style={{ top, height: Math.max(height, HALF_HOUR_HEIGHT) }}
                      />
                    )
                  })()}

                {/* Events */}
                {eventGroups.map((group, groupIndex) => {
                  const width = 100 / group.length

                  return group.map((event, eventIndex) => {
                    const { top, height } = calculateEventPosition(event, HOUR_HEIGHT, HOURS[0])
                    const leftPercent = eventIndex * width
                    const widthPercent = width - 2 // Small gap between overlapping events

                    return (
                      <ScheduleEventCard
                        key={event.id}
                        event={event}
                        onClick={onEventClick}
                        onDragStart={handleEventDragStart}
                        onDragEnd={handleEventDragEnd}
                        onHoverStart={handleEventHoverStart}
                        compact={height < 40}
                        style={{
                          top: `${top}px`,
                          height: `${height - 4}px`,
                          left: `calc(${leftPercent}% + 4px)`,
                          width: `calc(${widthPercent}% - 4px)`,
                          zIndex: 20 + groupIndex
                        }}
                      />
                    )
                  })
                })}

                {/* Now indicator */}
                {today && showNowLine && (
                  <div
                    className="absolute left-0 right-0 z-30 pointer-events-none"
                    style={{ top: nowPosition }}
                  >
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5" />
                      <div className="flex-1 h-0.5 bg-red-500" />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Add Popover */}
      {quickAdd && (
        <QuickAddPopover
          isOpen={quickAdd.isOpen}
          onClose={closeQuickAdd}
          position={quickAdd.position}
          date={quickAdd.date}
          startTime={quickAdd.startTime}
          endTime={quickAdd.endTime}
          onOpenFullModal={onOpenAddModal}
        />
      )}
    </div>
  )
}

export default ScheduleWeekView
