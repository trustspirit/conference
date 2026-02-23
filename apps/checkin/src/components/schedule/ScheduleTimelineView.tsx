import React, { useCallback, useMemo } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  schedulesAtom,
  selectedDateAtom,
  scheduleViewModeAtom,
  customStartDateAtom,
  customEndDateAtom,
  updateScheduleAtom
} from '../../stores/scheduleStore'
import type { ScheduleEvent } from '../../types'
import ScheduleEventCard from './ScheduleEventCard'
import QuickAddPopover from './QuickAddPopover'
import {
  HOURS,
  HOUR_WIDTH,
  ROW_HEIGHT,
  clampHours,
  getWeekDates,
  getCustomDateRange,
  getEventsForDay,
  calculateHorizontalEventPosition,
  isToday,
  createDateWithTime
} from './scheduleUtils'
import { useScheduleGrid, type TimeRangeWithIndex, type DropTargetWithIndex } from './useScheduleGrid'

interface ScheduleTimelineViewProps {
  onEventClick: (event: ScheduleEvent) => void
  onOpenAddModal: (date: Date, startTime: string, endTime: string) => void
}

const HALF_HOUR_WIDTH = 40 // pixels per 30 minutes

// Convert X position to time (hours and minutes)
const xToTime = (x: number): { hours: number; minutes: number } => {
  const totalMinutes = Math.floor(x / HALF_HOUR_WIDTH) * 30 + HOURS[0] * 60
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return { hours, minutes }
}

// Convert time to X position
const timeToX = (hours: number, minutes: number): number => {
  const totalMinutes = hours * 60 + minutes - HOURS[0] * 60
  return (totalMinutes / 30) * HALF_HOUR_WIDTH
}

function ScheduleTimelineView({
  onEventClick,
  onOpenAddModal
}: ScheduleTimelineViewProps): React.ReactElement {
  const schedules = useAtomValue(schedulesAtom)
  const selectedDate = useAtomValue(selectedDateAtom)
  const viewMode = useAtomValue(scheduleViewModeAtom)
  const customStartDate = useAtomValue(customStartDateAtom)
  const customEndDate = useAtomValue(customEndDateAtom)
  const updateSchedule = useSetAtom(updateScheduleAtom)
  const dates = useMemo(() => {
    if (viewMode === 'week') {
      return getWeekDates(selectedDate)
    } else if (viewMode === 'custom') {
      return getCustomDateRange(customStartDate, customEndDate)
    }
    return [selectedDate]
  }, [viewMode, selectedDate, customStartDate, customEndDate])

  // Use shared grid interactions hook (using rowIndex instead of dayIndex)
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

  // Type assertions for timeline view (using rowIndex)
  const typedDragSelection = dragSelection as TimeRangeWithIndex | null
  const typedPersistedSelection = persistedSelection as TimeRangeWithIndex | null
  const typedDropTarget = dropTarget as DropTargetWithIndex | null
  const typedHoverCell = hoverCell as { rowIndex?: number; hours: number; minutes: number } | null

  const handleCellHover = useCallback(
    (e: React.MouseEvent, rowIndex: number) => {
      if (isDragging.current || draggedEvent || quickAdd) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const { hours, minutes } = xToTime(x)
      const clampedHours = clampHours(hours)

      setHoverCell({ rowIndex, hours: clampedHours, minutes })
    },
    [draggedEvent, quickAdd, setHoverCell]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, rowIndex: number) => {
      if (e.button !== 0) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const { hours, minutes } = xToTime(x)
      const clampedHours = clampHours(hours)

      isDragging.current = true
      setHoverCell(null)
      setDragSelection({
        rowIndex,
        startHours: clampedHours,
        startMinutes: minutes,
        endHours: clampedHours,
        endMinutes: minutes + 30 >= 60 ? 0 : minutes + 30
      })
    },
    [setHoverCell, setDragSelection]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, rowIndex: number) => {
      if (!isDragging.current || !typedDragSelection || typedDragSelection.rowIndex !== rowIndex)
        return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = Math.max(0, Math.min(e.clientX - rect.left, HOURS.length * HOUR_WIDTH))
      const { hours, minutes } = xToTime(x)
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
      if (!isDragging.current || !typedDragSelection || typedDragSelection.rowIndex === undefined) {
        isDragging.current = false
        return
      }

      isDragging.current = false
      justFinishedDragging.current = true

      const date = dates[typedDragSelection.rowIndex]

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
        rowIndex: typedDragSelection.rowIndex,
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
    [typedDragSelection, dates, setPersistedSelection, setQuickAdd, setDragSelection]
  )

  const handleCellClick = useCallback(
    (e: React.MouseEvent, rowIndex: number) => {
      // Skip if we just finished dragging (to avoid overwriting persistedSelection)
      if (justFinishedDragging.current) {
        justFinishedDragging.current = false
        return
      }
      if (isDragging.current) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const { hours, minutes } = xToTime(x)
      const clampedHours = clampHours(hours)

      const date = dates[rowIndex]
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
        rowIndex,
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
    [dates, setPersistedSelection, setQuickAdd]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, rowIndex: number) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'

      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const { hours, minutes } = xToTime(x)
      const clampedHours = clampHours(hours)

      setDropTarget({ rowIndex, hours: clampedHours, minutes })
    },
    [setDropTarget]
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent, rowIndex: number) => {
      e.preventDefault()

      try {
        const eventData = JSON.parse(e.dataTransfer.getData('application/json')) as ScheduleEvent
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const { hours, minutes } = xToTime(x)
        const clampedHours = clampHours(hours)

        // Calculate duration of the original event
        const originalStart = new Date(eventData.startTime)
        const originalEnd = new Date(eventData.endTime)
        const durationMs = originalEnd.getTime() - originalStart.getTime()

        // New start time
        const targetDate = dates[rowIndex]
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

      handleEventDragEnd()
      setPersistedSelection(null)
    },
    [dates, updateSchedule]
  )

  // Current time indicator position
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nowOffset = nowMinutes - HOURS[0] * 60
  const nowPosition = (nowOffset / 60) * HOUR_WIDTH
  const showNowLine = nowPosition >= 0 && nowPosition <= HOURS.length * HOUR_WIDTH

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E4E6EB] overflow-hidden">
      {/* Header with time labels */}
      <div className="flex border-b border-[#E4E6EB]">
        <div className="w-32 shrink-0 p-3 border-r border-[#E4E6EB] bg-[#F9FAFB]">
          <span className="text-sm font-medium text-[#65676B]">
            {viewMode === 'week' ? '날짜' : '시간'}
          </span>
        </div>
        <div className="flex overflow-x-auto">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="flex-shrink-0 border-r border-[#E4E6EB] last:border-r-0 flex"
              style={{ width: HOUR_WIDTH }}
            >
              <div className="flex-1 text-center py-2 border-r border-[#E4E6EB]/50 border-dashed">
                <span className="text-xs text-[#65676B]">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
              <div className="flex-1 text-center py-2">
                <span className="text-xs text-[#8A8D91]">:30</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline rows */}
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {dates.map((date, rowIndex) => {
          const dayEvents = getEventsForDay(schedules, date)
          const today = isToday(date)

          return (
            <div
              key={rowIndex}
              className={`flex border-b border-[#E4E6EB] last:border-b-0 ${
                today ? 'bg-[#F8FBFF]' : ''
              }`}
            >
              {/* Date label */}
              <div
                className={`w-32 shrink-0 p-3 border-r border-[#E4E6EB] ${
                  today ? 'bg-[#E7F3FF]' : 'bg-[#F9FAFB]'
                }`}
              >
                <div className="text-xs text-[#65676B]">
                  {date.toLocaleDateString('ko-KR', { weekday: 'short' })}
                </div>
                <div
                  className={`text-lg font-semibold ${today ? 'text-[#1877F2]' : 'text-[#050505]'}`}
                >
                  {date.getMonth() + 1}/{date.getDate()}
                </div>
              </div>

              {/* Timeline area */}
              <div
                className={`relative flex-1 cursor-pointer ${draggedEvent && typedDropTarget?.rowIndex === rowIndex ? 'bg-[#E7F3FF]/50' : ''}`}
                style={{ minWidth: HOURS.length * HOUR_WIDTH, height: ROW_HEIGHT }}
                onMouseDown={(e) => !draggedEvent && handleMouseDown(e, rowIndex)}
                onMouseMove={(e) => {
                  if (!draggedEvent) {
                    handleMouseMove(e, rowIndex)
                  }
                  handleCellHover(e, rowIndex)
                }}
                onMouseUp={(e) => !draggedEvent && handleMouseUp(e)}
                onClick={(e) => !draggedEvent && handleCellClick(e, rowIndex)}
                onMouseLeave={handleCellLeave}
                onDragOver={(e) => handleDragOver(e, rowIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, rowIndex)}
              >
                {/* Hour and half-hour grid lines */}
                <div className="absolute inset-0 flex">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-r border-[#E4E6EB] last:border-r-0 relative"
                      style={{ width: HOUR_WIDTH }}
                    >
                      {/* Half-hour line */}
                      <div className="absolute top-0 bottom-0 left-[40px] border-r border-[#E4E6EB]/50 border-dashed" />
                    </div>
                  ))}
                </div>

                {/* Hover highlight */}
                {typedHoverCell &&
                  typedHoverCell.rowIndex === rowIndex &&
                  !typedDragSelection &&
                  !draggedEvent && (
                    <div
                      className="absolute top-2 bottom-2 bg-[#1877F2]/10 rounded-md pointer-events-none z-5 transition-all duration-75"
                      style={{
                        left: timeToX(typedHoverCell.hours, typedHoverCell.minutes),
                        width: HALF_HOUR_WIDTH
                      }}
                    />
                  )}

                {/* Drag selection overlay */}
                {typedDragSelection &&
                  typedDragSelection.rowIndex === rowIndex &&
                  (() => {
                    const startTotal =
                      typedDragSelection.startHours * 60 + typedDragSelection.startMinutes
                    const endTotal =
                      typedDragSelection.endHours * 60 + typedDragSelection.endMinutes
                    const minTotal = Math.min(startTotal, endTotal)
                    const maxTotal = Math.max(startTotal, endTotal)
                    const left = timeToX(Math.floor(minTotal / 60), minTotal % 60)
                    const width = Math.max(
                      ((maxTotal - minTotal) / 60) * HOUR_WIDTH,
                      HALF_HOUR_WIDTH
                    )
                    return (
                      <div
                        className="absolute top-2 bottom-2 bg-[#1877F2]/20 border-2 border-[#1877F2] border-dashed rounded-lg pointer-events-none z-10"
                        style={{ left, width }}
                      />
                    )
                  })()}

                {/* Persisted selection overlay (shown while quick add is open) */}
                {typedPersistedSelection &&
                  typedPersistedSelection.rowIndex === rowIndex &&
                  !typedDragSelection &&
                  (() => {
                    const startTotal =
                      typedPersistedSelection.startHours * 60 + typedPersistedSelection.startMinutes
                    const endTotal =
                      typedPersistedSelection.endHours * 60 + typedPersistedSelection.endMinutes
                    const left = timeToX(
                      typedPersistedSelection.startHours,
                      typedPersistedSelection.startMinutes
                    )
                    const width = Math.max(
                      ((endTotal - startTotal) / 60) * HOUR_WIDTH,
                      HALF_HOUR_WIDTH
                    )
                    return (
                      <div
                        className="absolute top-2 bottom-2 bg-[#1877F2]/20 border-2 border-[#1877F2] rounded-lg pointer-events-none z-10"
                        style={{ left, width }}
                      />
                    )
                  })()}

                {/* Drop preview indicator */}
                {draggedEvent &&
                  typedDropTarget?.rowIndex === rowIndex &&
                  (() => {
                    const originalStart = new Date(draggedEvent.startTime)
                    const originalEnd = new Date(draggedEvent.endTime)
                    const durationMs = originalEnd.getTime() - originalStart.getTime()
                    const durationMins = durationMs / (1000 * 60)
                    const left = timeToX(typedDropTarget.hours, typedDropTarget.minutes)
                    const width = (durationMins / 60) * HOUR_WIDTH
                    return (
                      <div
                        className="absolute top-2 bottom-2 bg-[#1877F2]/30 border-2 border-[#1877F2] rounded-lg pointer-events-none z-10"
                        style={{ left, width: Math.max(width, HALF_HOUR_WIDTH) }}
                      />
                    )
                  })()}

                {/* Events */}
                {dayEvents.map((event) => {
                  const { left, width } = calculateHorizontalEventPosition(
                    event,
                    HOUR_WIDTH,
                    HOURS[0]
                  )

                  return (
                    <ScheduleEventCard
                      key={event.id}
                      event={event}
                      onClick={onEventClick}
                      onDragStart={handleEventDragStart}
                      onDragEnd={handleEventDragEnd}
                      onHoverStart={handleEventHoverStart}
                      orientation="horizontal"
                      compact={width < 80}
                      style={{
                        left: `${left}px`,
                        width: `${width - 4}px`,
                        top: '8px',
                        bottom: '8px',
                        height: 'auto'
                      }}
                    />
                  )
                })}

                {/* Now indicator */}
                {today && showNowLine && (
                  <div
                    className="absolute top-0 bottom-0 z-30 pointer-events-none"
                    style={{ left: nowPosition }}
                  >
                    <div className="w-0.5 h-full bg-red-500" />
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
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

export default ScheduleTimelineView
