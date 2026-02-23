import React, { useCallback } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { schedulesAtom, selectedDateAtom, updateScheduleAtom } from '../../stores/scheduleStore'
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
  getEventsForDay,
  calculateEventPosition,
  isToday,
  groupOverlappingEvents,
  createDateWithTime,
  getCurrentTimePosition
} from './scheduleUtils'
import { useScheduleGrid, type TimeRange } from './useScheduleGrid'

interface ScheduleDayViewProps {
  onEventClick: (event: ScheduleEvent) => void
  onOpenAddModal: (date: Date, startTime: string, endTime: string) => void
}

function ScheduleDayView({
  onEventClick,
  onOpenAddModal
}: ScheduleDayViewProps): React.ReactElement {
  const schedules = useAtomValue(schedulesAtom)
  const selectedDate = useAtomValue(selectedDateAtom)
  const updateSchedule = useSetAtom(updateScheduleAtom)
  const dayEvents = getEventsForDay(schedules, selectedDate)
  const eventGroups = groupOverlappingEvents(dayEvents)
  const today = isToday(selectedDate)

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
  } = useScheduleGrid()

  const handleCellHover = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging.current || draggedEvent || quickAdd) return

      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top
      const { hours, minutes } = yToTime(y)
      const clampedHours = clampHours(hours)

      setHoverCell({ hours: clampedHours, minutes })
    },
    [draggedEvent, quickAdd, setHoverCell]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return

      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top
      const { hours, minutes } = yToTime(y)
      const clampedHours = clampHours(hours)

      isDragging.current = true
      setHoverCell(null)
      setDragSelection({
        startHours: clampedHours,
        startMinutes: minutes,
        endHours: clampedHours,
        endMinutes: minutes + 30 >= 60 ? 0 : minutes + 30
      })
    },
    [setHoverCell, setDragSelection]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || !dragSelection) return

      const rect = e.currentTarget.getBoundingClientRect()
      const y = Math.max(0, Math.min(e.clientY - rect.top, HOURS.length * HOUR_HEIGHT))
      const { hours, minutes } = yToTime(y)
      const clampedHours = Math.min(clampHours(hours), HOURS[HOURS.length - 1] + 1)

      setDragSelection((prev) => {
        if (!prev) return null
        return { ...prev, endHours: clampedHours, endMinutes: minutes }
      })
    },
    [dragSelection]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || !dragSelection) {
        isDragging.current = false
        return
      }

      isDragging.current = false
      justFinishedDragging.current = true

      // Calculate start and end times
      const startTotal = dragSelection.startHours * 60 + dragSelection.startMinutes
      const endTotal = dragSelection.endHours * 60 + dragSelection.endMinutes

      const minTotal = Math.min(startTotal, endTotal)
      const maxTotal = Math.max(startTotal, endTotal)

      // Ensure minimum 30 min duration
      const finalEndTotal = maxTotal <= minTotal ? minTotal + 30 : maxTotal

      const startTime = createDateWithTime(selectedDate, Math.floor(minTotal / 60), minTotal % 60)
      const endTime = createDateWithTime(
        selectedDate,
        Math.floor(finalEndTotal / 60),
        finalEndTotal % 60
      )

      // Persist the selection for display while quick add is open
      setPersistedSelection({
        startHours: Math.floor(minTotal / 60),
        startMinutes: minTotal % 60,
        endHours: Math.floor(finalEndTotal / 60),
        endMinutes: finalEndTotal % 60
      })

      setQuickAdd({
        isOpen: true,
        position: { x: e.clientX, y: e.clientY },
        date: selectedDate,
        startTime,
        endTime
      })

      setDragSelection(null)
    },
    [dragSelection, selectedDate]
  )

  const handleCellClick = useCallback(
    (e: React.MouseEvent) => {
      // Skip if we just finished dragging (to avoid overwriting persistedSelection)
      if (justFinishedDragging.current) {
        justFinishedDragging.current = false
        return
      }
      if (isDragging.current) return

      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top
      const { hours, minutes } = yToTime(y)
      const clampedHours = clampHours(hours)

      const startTime = createDateWithTime(selectedDate, clampedHours, minutes)
      // Default to 30 min duration for click
      const endMinutes = minutes + 30
      const endTime = createDateWithTime(
        selectedDate,
        endMinutes >= 60 ? clampedHours + 1 : clampedHours,
        endMinutes >= 60 ? 0 : endMinutes
      )

      // Persist the selection for display while quick add is open
      setPersistedSelection({
        startHours: clampedHours,
        startMinutes: minutes,
        endHours: endMinutes >= 60 ? clampedHours + 1 : clampedHours,
        endMinutes: endMinutes >= 60 ? 0 : endMinutes
      })

      setQuickAdd({
        isOpen: true,
        position: { x: e.clientX, y: e.clientY },
        date: selectedDate,
        startTime,
        endTime
      })
    },
    [selectedDate]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'

      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top
      const { hours, minutes } = yToTime(y)
      const clampedHours = clampHours(hours)

      setDropTarget({ hours: clampedHours, minutes })
    },
    [setDropTarget]
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
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
        const newStartTime = createDateWithTime(selectedDate, clampedHours, minutes)
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
    [selectedDate, updateSchedule]
  )

  const nowPosition = getCurrentTimePosition(HOUR_HEIGHT, HOURS[0])
  const showNowLine = today && nowPosition >= 0 && nowPosition <= HOURS.length * HOUR_HEIGHT

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E4E6EB] overflow-hidden">
      {/* Scrollable container for both header and content */}
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {/* Header - sticky */}
        <div className="grid grid-cols-[60px_1fr] border-b border-[#E4E6EB] sticky top-0 z-40 bg-white">
          <div className="p-2 border-r border-[#E4E6EB] bg-white" />
          <div className={`p-4 ${today ? 'bg-[#E7F3FF]' : 'bg-white'}`}>
            <div className="text-sm text-[#65676B]">
              {selectedDate.toLocaleDateString('ko-KR', { weekday: 'long' })}
            </div>
            <div
              className={`text-2xl font-semibold ${today ? 'text-[#1877F2]' : 'text-[#050505]'}`}
            >
              {selectedDate.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[60px_1fr] relative">
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

          {/* Day column */}
          <div
            className={`relative cursor-pointer ${today ? 'bg-[#F8FBFF]' : ''} ${draggedEvent && dropTarget ? 'bg-[#E7F3FF]/50' : ''}`}
            onMouseDown={(e) => !draggedEvent && handleMouseDown(e)}
            onMouseMove={(e) => {
              if (!draggedEvent) {
                handleMouseMove(e)
              }
              handleCellHover(e)
            }}
            onMouseUp={(e) => !draggedEvent && handleMouseUp(e)}
            onClick={(e) => !draggedEvent && handleCellClick(e)}
            onMouseLeave={handleCellLeave}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
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
            {hoverCell && !dragSelection && !draggedEvent && (
              <div
                className="absolute left-2 right-2 bg-[#1877F2]/10 rounded-md pointer-events-none z-5 transition-all duration-75"
                style={{
                  top: timeToY(hoverCell.hours, hoverCell.minutes),
                  height: HALF_HOUR_HEIGHT
                }}
              />
            )}

            {/* Drag selection overlay */}
            {dragSelection &&
              (() => {
                const startTotal = dragSelection.startHours * 60 + dragSelection.startMinutes
                const endTotal = dragSelection.endHours * 60 + dragSelection.endMinutes
                const minTotal = Math.min(startTotal, endTotal)
                const maxTotal = Math.max(startTotal, endTotal)
                const top = timeToY(Math.floor(minTotal / 60), minTotal % 60)
                const height = Math.max(
                  ((maxTotal - minTotal) / 60) * HOUR_HEIGHT,
                  HALF_HOUR_HEIGHT
                )
                return (
                  <div
                    className="absolute left-2 right-2 bg-[#1877F2]/20 border-2 border-[#1877F2] border-dashed rounded-lg pointer-events-none z-10"
                    style={{ top, height }}
                  />
                )
              })()}

            {/* Persisted selection overlay (shown while quick add is open) */}
            {persistedSelection &&
              !dragSelection &&
              (() => {
                const startTotal =
                  persistedSelection.startHours * 60 + persistedSelection.startMinutes
                const endTotal = persistedSelection.endHours * 60 + persistedSelection.endMinutes
                const top = timeToY(persistedSelection.startHours, persistedSelection.startMinutes)
                const height = Math.max(
                  ((endTotal - startTotal) / 60) * HOUR_HEIGHT,
                  HALF_HOUR_HEIGHT
                )
                return (
                  <div
                    className="absolute left-2 right-2 bg-[#1877F2]/20 border-2 border-[#1877F2] rounded-lg pointer-events-none z-10"
                    style={{ top, height }}
                  />
                )
              })()}

            {/* Drop preview indicator */}
            {draggedEvent &&
              dropTarget &&
              (() => {
                const originalStart = new Date(draggedEvent.startTime)
                const originalEnd = new Date(draggedEvent.endTime)
                const durationMs = originalEnd.getTime() - originalStart.getTime()
                const durationMins = durationMs / (1000 * 60)
                const top = timeToY(dropTarget.hours, dropTarget.minutes)
                const height = (durationMins / 60) * HOUR_HEIGHT
                return (
                  <div
                    className="absolute left-2 right-2 bg-[#1877F2]/30 border-2 border-[#1877F2] rounded-lg pointer-events-none z-10"
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
                const widthPercent = width - 2

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
                      left: `calc(${leftPercent}% + 8px)`,
                      width: `calc(${widthPercent}% - 16px)`,
                      zIndex: 20 + groupIndex
                    }}
                  />
                )
              })
            })}

            {/* Now indicator */}
            {showNowLine && (
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

export default ScheduleDayView
