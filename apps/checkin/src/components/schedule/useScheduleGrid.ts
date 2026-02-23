import { useState, useRef, useCallback } from 'react'
import type { ScheduleEvent } from '../../types'

// Types for selection and drag states
export interface TimeRange {
  startHours: number
  startMinutes: number
  endHours: number
  endMinutes: number
}

export interface QuickAddState {
  isOpen: boolean
  position: { x: number; y: number }
  date: Date
  startTime: Date
  endTime: Date
}

export interface HoverCell {
  hours: number
  minutes: number
}

export interface DropTarget {
  hours: number
  minutes: number
}

// Multi-day/row variants (for week view and timeline view)
export interface TimeRangeWithIndex extends TimeRange {
  dayIndex?: number
  rowIndex?: number
}

export interface HoverCellWithIndex extends HoverCell {
  dayIndex?: number
  rowIndex?: number
}

export interface DropTargetWithIndex extends DropTarget {
  dayIndex?: number
  rowIndex?: number
}

interface UseScheduleGridOptions {
  multiDay?: boolean
}

interface UseScheduleGridReturn {
  // Quick add
  quickAdd: QuickAddState | null
  setQuickAdd: React.Dispatch<React.SetStateAction<QuickAddState | null>>
  closeQuickAdd: () => void

  // Drag selection
  dragSelection: TimeRange | TimeRangeWithIndex | null
  setDragSelection: React.Dispatch<React.SetStateAction<TimeRange | TimeRangeWithIndex | null>>
  isDragging: React.MutableRefObject<boolean>
  justFinishedDragging: React.MutableRefObject<boolean>

  // Persisted selection (while quick add is open)
  persistedSelection: TimeRange | TimeRangeWithIndex | null
  setPersistedSelection: React.Dispatch<React.SetStateAction<TimeRange | TimeRangeWithIndex | null>>

  // Event drag
  draggedEvent: ScheduleEvent | null
  setDraggedEvent: React.Dispatch<React.SetStateAction<ScheduleEvent | null>>
  dropTarget: DropTarget | DropTargetWithIndex | null
  setDropTarget: React.Dispatch<React.SetStateAction<DropTarget | DropTargetWithIndex | null>>

  // Hover
  hoverCell: HoverCell | HoverCellWithIndex | null
  setHoverCell: React.Dispatch<React.SetStateAction<HoverCell | HoverCellWithIndex | null>>
  handleCellLeave: () => void
  handleEventHoverStart: () => void

  // Event drag handlers
  handleEventDragStart: (event: ScheduleEvent) => void
  handleEventDragEnd: () => void
  handleDragLeave: () => void
}

/**
 * Custom hook for schedule grid interactions
 * Manages state for quick add, drag selection, event drag, and hover
 */
export function useScheduleGrid(_options: UseScheduleGridOptions = {}): UseScheduleGridReturn {
  // Quick add state
  const [quickAdd, setQuickAdd] = useState<QuickAddState | null>(null)

  // Drag selection state
  const [dragSelection, setDragSelection] = useState<TimeRange | TimeRangeWithIndex | null>(null)
  const isDragging = useRef(false)
  const justFinishedDragging = useRef(false)

  // Persisted selection (visible while quick add is open)
  const [persistedSelection, setPersistedSelection] = useState<
    TimeRange | TimeRangeWithIndex | null
  >(null)

  // Event drag state
  const [draggedEvent, setDraggedEvent] = useState<ScheduleEvent | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | DropTargetWithIndex | null>(null)

  // Hover state
  const [hoverCell, setHoverCell] = useState<HoverCell | HoverCellWithIndex | null>(null)

  // Close quick add and clear selection
  const closeQuickAdd = useCallback(() => {
    setQuickAdd(null)
    setPersistedSelection(null)
  }, [])

  // Hover handlers
  const handleCellLeave = useCallback(() => {
    if (!draggedEvent) {
      setHoverCell(null)
    }
  }, [draggedEvent])

  const handleEventHoverStart = useCallback(() => {
    setHoverCell(null)
  }, [])

  // Event drag handlers
  const handleEventDragStart = useCallback((event: ScheduleEvent) => {
    setDraggedEvent(event)
    setHoverCell(null)
  }, [])

  const handleEventDragEnd = useCallback(() => {
    setDraggedEvent(null)
    setDropTarget(null)
    setHoverCell(null)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDropTarget(null)
  }, [])

  return {
    // Quick add
    quickAdd,
    setQuickAdd,
    closeQuickAdd,

    // Drag selection
    dragSelection,
    setDragSelection,
    isDragging,
    justFinishedDragging,

    // Persisted selection
    persistedSelection,
    setPersistedSelection,

    // Event drag
    draggedEvent,
    setDraggedEvent,
    dropTarget,
    setDropTarget,

    // Hover
    hoverCell,
    setHoverCell,
    handleCellLeave,
    handleEventHoverStart,

    // Event drag handlers
    handleEventDragStart,
    handleEventDragEnd,
    handleDragLeave
  }
}

/**
 * Helper to create time range from drag coordinates
 */
export function createTimeRange(
  startHours: number,
  startMinutes: number,
  endHours: number,
  endMinutes: number,
  dayIndex?: number
): TimeRange | TimeRangeWithDay {
  // Normalize so start is always before end
  const startTotal = startHours * 60 + startMinutes
  const endTotal = endHours * 60 + endMinutes

  const normalizedStart = Math.min(startTotal, endTotal)
  const normalizedEnd = Math.max(startTotal, endTotal)

  const result = {
    startHours: Math.floor(normalizedStart / 60),
    startMinutes: normalizedStart % 60,
    endHours: Math.floor(normalizedEnd / 60),
    endMinutes: normalizedEnd % 60
  }

  if (dayIndex !== undefined) {
    return { ...result, dayIndex }
  }
  return result
}

/**
 * Check if hover should be shown
 */
export function shouldShowHover(
  isDragging: boolean,
  draggedEvent: ScheduleEvent | null,
  quickAdd: QuickAddState | null
): boolean {
  return !isDragging && !draggedEvent && !quickAdd
}

/**
 * Clamp time to valid schedule range
 */
export function clampTime(hours: number, minutes: number): { hours: number; minutes: number } {
  const clampedHours = clampHours(hours)
  return { hours: clampedHours, minutes }
}
