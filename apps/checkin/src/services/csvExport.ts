import type { Participant, Group, Room } from '../types'

interface ExportOptions {
  includeCheckInHistory?: boolean
  filename?: string
}

const escapeCSVValue = (value: string | number | boolean | null | undefined): string => {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

const downloadCSV = (content: string, filename: string): void => {
  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const formatDate = (date: Date | undefined): string => {
  if (!date) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export const exportParticipantsToCSV = (
  participants: Participant[],
  options: ExportOptions = {}
): void => {
  const { includeCheckInHistory = false, filename = 'participants' } = options

  const headers = [
    'Name',
    'Email',
    'Phone',
    'Gender',
    'Age',
    'Stake',
    'Ward',
    'Group',
    'Room',
    'Payment Status',
    'Memo',
    'Check-in Status',
    'Created At',
    'Updated At'
  ]

  if (includeCheckInHistory) {
    headers.push('Check-in History')
  }

  const rows = participants.map((p) => {
    const isCheckedIn = p.checkIns.some((ci) => !ci.checkOutTime)
    const checkInStatus = isCheckedIn ? 'Checked In' : 'Not Checked In'

    const row = [
      escapeCSVValue(p.name),
      escapeCSVValue(p.email),
      escapeCSVValue(p.phoneNumber),
      escapeCSVValue(p.gender),
      escapeCSVValue(p.age || ''),
      escapeCSVValue(p.stake),
      escapeCSVValue(p.ward),
      escapeCSVValue(p.groupName || ''),
      escapeCSVValue(p.roomNumber || ''),
      escapeCSVValue(p.isPaid ? 'Paid' : 'Unpaid'),
      escapeCSVValue(p.memo || ''),
      escapeCSVValue(checkInStatus),
      escapeCSVValue(formatDate(p.createdAt)),
      escapeCSVValue(formatDate(p.updatedAt))
    ]

    if (includeCheckInHistory) {
      const history = p.checkIns
        .map((ci) => {
          const inTime = formatDate(ci.checkInTime)
          const outTime = ci.checkOutTime ? formatDate(ci.checkOutTime) : 'Active'
          return `In: ${inTime} / Out: ${outTime}`
        })
        .join(' | ')
      row.push(escapeCSVValue(history || 'No history'))
    }

    return row.join(',')
  })

  const csvContent = [headers.join(','), ...rows].join('\n')
  const timestamp = new Date().toISOString().slice(0, 10)
  downloadCSV(csvContent, `${filename}_${timestamp}.csv`)
}

export const exportGroupsToCSV = (groups: Group[], filename: string = 'groups'): void => {
  const headers = ['Name', 'Participant Count', 'Expected Capacity', 'Created At', 'Updated At']

  const rows = groups.map((g) => {
    return [
      escapeCSVValue(g.name),
      escapeCSVValue(g.participantCount),
      escapeCSVValue(g.expectedCapacity || ''),
      escapeCSVValue(formatDate(g.createdAt)),
      escapeCSVValue(formatDate(g.updatedAt))
    ].join(',')
  })

  const csvContent = [headers.join(','), ...rows].join('\n')
  const timestamp = new Date().toISOString().slice(0, 10)
  downloadCSV(csvContent, `${filename}_${timestamp}.csv`)
}

export const exportRoomsToCSV = (rooms: Room[], filename: string = 'rooms'): void => {
  const headers = [
    'Room Number',
    'Current Occupancy',
    'Max Capacity',
    'Status',
    'Created At',
    'Updated At'
  ]

  const rows = rooms.map((r) => {
    let status = 'Available'
    if (r.currentOccupancy >= r.maxCapacity) {
      status = 'Full'
    } else if (r.currentOccupancy >= r.maxCapacity - 1) {
      status = 'Almost Full'
    }

    return [
      escapeCSVValue(r.roomNumber),
      escapeCSVValue(r.currentOccupancy),
      escapeCSVValue(r.maxCapacity),
      escapeCSVValue(status),
      escapeCSVValue(formatDate(r.createdAt)),
      escapeCSVValue(formatDate(r.updatedAt))
    ].join(',')
  })

  const csvContent = [headers.join(','), ...rows].join('\n')
  const timestamp = new Date().toISOString().slice(0, 10)
  downloadCSV(csvContent, `${filename}_${timestamp}.csv`)
}

export const exportCheckInSummaryToCSV = (
  participants: Participant[],
  filename: string = 'checkin_summary'
): void => {
  const headers = [
    'Name',
    'Email',
    'Group',
    'Room',
    'Current Status',
    'Total Check-ins',
    'Last Check-in',
    'Last Check-out'
  ]

  const rows = participants.map((p) => {
    const isCheckedIn = p.checkIns.some((ci) => !ci.checkOutTime)
    const totalCheckIns = p.checkIns.length
    const lastCheckIn = p.checkIns.length > 0 ? p.checkIns[p.checkIns.length - 1] : null

    return [
      escapeCSVValue(p.name),
      escapeCSVValue(p.email),
      escapeCSVValue(p.groupName || ''),
      escapeCSVValue(p.roomNumber || ''),
      escapeCSVValue(isCheckedIn ? 'Checked In' : 'Not Checked In'),
      escapeCSVValue(totalCheckIns),
      escapeCSVValue(lastCheckIn ? formatDate(lastCheckIn.checkInTime) : ''),
      escapeCSVValue(lastCheckIn?.checkOutTime ? formatDate(lastCheckIn.checkOutTime) : '')
    ].join(',')
  })

  const csvContent = [headers.join(','), ...rows].join('\n')
  const timestamp = new Date().toISOString().slice(0, 10)
  downloadCSV(csvContent, `${filename}_${timestamp}.csv`)
}
