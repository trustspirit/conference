import type { ScheduleEvent } from '../types'

// Format date for display
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
}

// Format time for display
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Get week dates from a given date
const getWeekDates = (date: Date): Date[] => {
  const startOfWeek = new Date(date)
  const day = startOfWeek.getDay()
  const diff = startOfWeek.getDate() - day
  startOfWeek.setDate(diff)
  startOfWeek.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })
}

// Check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// Export schedule to CSV
export const exportScheduleToCSV = (
  schedules: ScheduleEvent[],
  filename: string = 'schedule'
): void => {
  const headers = ['날짜', '시작 시간', '종료 시간', '제목', '장소', '설명']

  const sortedSchedules = [...schedules].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  const rows = sortedSchedules.map((event) => {
    const startTime = new Date(event.startTime)
    const endTime = new Date(event.endTime)

    return [
      formatDate(startTime),
      formatTime(startTime),
      formatTime(endTime),
      `"${(event.title || '').replace(/"/g, '""')}"`,
      `"${(event.location || '').replace(/"/g, '""')}"`,
      `"${(event.description || '').replace(/"/g, '""')}"`
    ].join(',')
  })

  const csvContent = [headers.join(','), ...rows].join('\n')
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Generate shareable text
export const generateScheduleText = (
  schedules: ScheduleEvent[],
  selectedDate: Date,
  viewMode: 'week' | 'day'
): string => {
  const dates = viewMode === 'week' ? getWeekDates(selectedDate) : [selectedDate]

  const sortedSchedules = [...schedules].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  let text = ''

  // Title
  if (viewMode === 'week') {
    const start = dates[0]
    const end = dates[6]
    text += `📅 ${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()} 주간 스케줄\n\n`
  } else {
    text += `📅 ${formatDate(selectedDate)} 스케줄\n\n`
  }

  // Group by day
  dates.forEach((date) => {
    const dayEvents = sortedSchedules.filter((e) => isSameDay(new Date(e.startTime), date))

    if (dayEvents.length === 0) return

    text += `━━━ ${date.getMonth() + 1}/${date.getDate()} (${date.toLocaleDateString('ko-KR', { weekday: 'short' })}) ━━━\n`

    dayEvents.forEach((event) => {
      const start = new Date(event.startTime)
      const end = new Date(event.endTime)
      text += `\n⏰ ${formatTime(start)} - ${formatTime(end)}\n`
      text += `   ${event.title}\n`
      if (event.location) {
        text += `   📍 ${event.location}\n`
      }
      if (event.description) {
        text += `   ${event.description}\n`
      }
    })
    text += '\n'
  })

  text += `\n총 ${schedules.length}개 일정`

  return text
}

// Copy to clipboard
export const copyScheduleToClipboard = async (
  schedules: ScheduleEvent[],
  selectedDate: Date,
  viewMode: 'week' | 'day'
): Promise<boolean> => {
  try {
    const text = generateScheduleText(schedules, selectedDate, viewMode)
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

// Generate ICS (iCalendar) format
export const exportScheduleToICS = (
  schedules: ScheduleEvent[],
  filename: string = 'schedule'
): void => {
  const formatICSDate = (date: Date): string => {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
  }

  const escapeICS = (str: string): string => {
    return str.replace(/[,;\\]/g, (match) => '\\' + match).replace(/\n/g, '\\n')
  }

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//checkin//Schedule Export//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ]

  schedules.forEach((event) => {
    const start = new Date(event.startTime)
    const end = new Date(event.endTime)

    ics = ics.concat([
      'BEGIN:VEVENT',
      `UID:${event.id}@checkin`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(start)}`,
      `DTEND:${formatICSDate(end)}`,
      `SUMMARY:${escapeICS(event.title)}`,
      event.description ? `DESCRIPTION:${escapeICS(event.description)}` : '',
      event.location ? `LOCATION:${escapeICS(event.location)}` : '',
      'END:VEVENT'
    ])
  })

  ics.push('END:VCALENDAR')

  const content = ics.filter((line) => line).join('\r\n')
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
