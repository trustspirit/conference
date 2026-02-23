import type { ScheduleEvent } from '../../types'

// Get hours array for time slots (6:00 - 23:00)
export const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)

// Grid layout constants
export const HOUR_HEIGHT = 60 // pixels per hour (vertical view)
export const HALF_HOUR_HEIGHT = 30 // pixels per 30 minutes (vertical view)
export const HOUR_WIDTH = 100 // pixels per hour (horizontal view)
export const ROW_HEIGHT = 80 // pixels per row (horizontal view)

// Convert Y position to time (for vertical views)
export const yToTime = (y: number): { hours: number; minutes: number } => {
  const totalMinutes = Math.floor(y / HALF_HOUR_HEIGHT) * 30 + HOURS[0] * 60
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return { hours, minutes }
}

// Convert time to Y position (for vertical views)
export const timeToY = (hours: number, minutes: number): number => {
  const totalMinutes = hours * 60 + minutes - HOURS[0] * 60
  return (totalMinutes / 30) * HALF_HOUR_HEIGHT
}

// Convert X position to time (for horizontal views)
export const xToTime = (x: number): { hours: number; minutes: number } => {
  const totalMinutes = Math.floor(x / (HOUR_WIDTH / 2)) * 30 + HOURS[0] * 60
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return { hours, minutes }
}

// Convert time to X position (for horizontal views)
export const timeToX = (hours: number, minutes: number): number => {
  const totalMinutes = hours * 60 + minutes - HOURS[0] * 60
  return (totalMinutes / 30) * (HOUR_WIDTH / 2)
}

// Clamp hours to valid range
export const clampHours = (hours: number): number => {
  return Math.max(HOURS[0], Math.min(HOURS[HOURS.length - 1], hours))
}

// Format time for display
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Format date for display
export const formatDate = (date: Date, format: 'short' | 'long' = 'short'): string => {
  if (format === 'short') {
    return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })
  }
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
}

// Get week dates from a given date
export const getWeekDates = (date: Date): Date[] => {
  const startOfWeek = new Date(date)
  const day = startOfWeek.getDay()
  const diff = startOfWeek.getDate() - day // Start from Sunday
  startOfWeek.setDate(diff)
  startOfWeek.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })
}

// Get dates in a custom range
export const getCustomDateRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = []
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  const current = new Date(start)
  while (current <= end) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

// Check if two dates are the same day
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// Check if a date is today
export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date())
}

// Get events for a specific day
export const getEventsForDay = (events: ScheduleEvent[], date: Date): ScheduleEvent[] => {
  return events.filter((event) => isSameDay(new Date(event.startTime), date))
}

// Calculate event position and height (for vertical view)
export const calculateEventPosition = (
  event: ScheduleEvent,
  hourHeight: number,
  startHour: number = 6
): { top: number; height: number } => {
  const startTime = new Date(event.startTime)
  const endTime = new Date(event.endTime)

  const startMinutes = startTime.getHours() * 60 + startTime.getMinutes()
  const endMinutes = endTime.getHours() * 60 + endTime.getMinutes()

  const startOffset = startMinutes - startHour * 60
  const duration = endMinutes - startMinutes

  const top = (startOffset / 60) * hourHeight
  const height = Math.max((duration / 60) * hourHeight, hourHeight / 2) // Minimum height

  return { top, height }
}

// Calculate event position for horizontal timeline
export const calculateHorizontalEventPosition = (
  event: ScheduleEvent,
  hourWidth: number,
  startHour: number = 6
): { left: number; width: number } => {
  const startTime = new Date(event.startTime)
  const endTime = new Date(event.endTime)

  const startMinutes = startTime.getHours() * 60 + startTime.getMinutes()
  const endMinutes = endTime.getHours() * 60 + endTime.getMinutes()

  const startOffset = startMinutes - startHour * 60
  const duration = endMinutes - startMinutes

  const left = (startOffset / 60) * hourWidth
  const width = Math.max((duration / 60) * hourWidth, hourWidth / 2) // Minimum width

  return { left, width }
}

// Parse time string to hours and minutes
export const parseTimeString = (timeStr: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return { hours: hours || 0, minutes: minutes || 0 }
}

// Create date with specific time
export const createDateWithTime = (baseDate: Date, hours: number, minutes: number = 0): Date => {
  const date = new Date(baseDate)
  date.setHours(hours, minutes, 0, 0)
  return date
}

// Get current time position (for "now" indicator)
export const getCurrentTimePosition = (hourHeight: number, startHour: number = 6): number => {
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const offset = minutes - startHour * 60
  return (offset / 60) * hourHeight
}

// Check if events overlap
export const doEventsOverlap = (event1: ScheduleEvent, event2: ScheduleEvent): boolean => {
  const start1 = new Date(event1.startTime).getTime()
  const end1 = new Date(event1.endTime).getTime()
  const start2 = new Date(event2.startTime).getTime()
  const end2 = new Date(event2.endTime).getTime()

  return start1 < end2 && end1 > start2
}

// Group overlapping events
export const groupOverlappingEvents = (events: ScheduleEvent[]): ScheduleEvent[][] => {
  if (events.length === 0) return []

  const sorted = [...events].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )
  const groups: ScheduleEvent[][] = []
  let currentGroup: ScheduleEvent[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const overlapsWithGroup = currentGroup.some((e) => doEventsOverlap(e, sorted[i]))
    if (overlapsWithGroup) {
      currentGroup.push(sorted[i])
    } else {
      groups.push(currentGroup)
      currentGroup = [sorted[i]]
    }
  }
  groups.push(currentGroup)

  return groups
}

// Format week range for header
export const formatWeekRange = (date: Date): string => {
  const weekDates = getWeekDates(date)
  const start = weekDates[0]
  const end = weekDates[6]

  const startMonth = start.toLocaleDateString('ko-KR', { month: 'long' })
  const endMonth = end.toLocaleDateString('ko-KR', { month: 'long' })
  const year = start.getFullYear()

  if (startMonth === endMonth) {
    return `${year}년 ${startMonth} ${start.getDate()}일 - ${end.getDate()}일`
  }
  return `${year}년 ${startMonth} ${start.getDate()}일 - ${endMonth} ${end.getDate()}일`
}

// Format date for HTML date input (YYYY-MM-DD format, local timezone)
export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Parse date string from HTML date input (avoids UTC conversion)
export const parseDateFromInput = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Calculate days between two dates (inclusive)
export const calculateDaysBetween = (startDate: Date, endDate: Date): number => {
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
}
