export * from './enums'

export type Gender = 'male' | 'female' | 'other' | string

export type CheckInFilter = 'all' | 'checked-in' | 'not-checked-in'

export type TabType = 'participants' | 'groups' | 'rooms'

export type SortField = 'name' | 'ward' | 'group' | 'room' | 'status' | 'payment'
export type SortDirection = 'asc' | 'desc'

export interface Participant {
  id: string
  name: string
  gender: Gender
  age: number
  birthDate?: string // YYYY-MM-DD 형식
  stake: string
  ward: string
  phoneNumber: string
  email: string
  isPaid: boolean
  memo?: string
  metadata?: Record<string, unknown>
  groupId?: string
  groupName?: string
  roomId?: string
  roomNumber?: string
  busId?: string
  busName?: string
  checkIns: CheckInRecord[]
  createdAt: Date
  updatedAt: Date
}

export interface CheckInRecord {
  id: string
  checkInTime: Date
  checkOutTime?: Date
}

export type GroupTagPreset = 'male' | 'female'

export interface Group {
  id: string
  name: string
  participantCount: number
  expectedCapacity?: number
  tags?: string[]
  leaderId?: string
  leaderName?: string
  createdAt: Date
  updatedAt: Date
}

export type RoomGenderType = 'male' | 'female' | 'mixed'
export type RoomType = 'general' | 'guest' | 'leadership'

export interface Room {
  id: string
  roomNumber: string
  maxCapacity: number
  currentOccupancy: number
  genderType?: RoomGenderType
  roomType?: RoomType
  leaderId?: string
  leaderName?: string
  createdAt: Date
  updatedAt: Date
}

export interface CSVParticipantRow {
  name: string
  gender: string
  age: string
  birthDate?: string
  stake: string
  ward: string
  phoneNumber: string
  email: string
  groupName?: string
  roomNumber?: string
  [key: string]: string | undefined
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  userName: string
  action: 'create' | 'update' | 'delete' | 'check_in' | 'check_out' | 'assign' | 'import'
  targetType: 'participant' | 'group' | 'room' | 'bus'
  targetId: string
  targetName: string
  changes?: Record<string, { from: unknown; to: unknown }>
}

// Bus/Region for transportation management
export interface BusRoute {
  id: string
  name: string // e.g., "서울 1호차", "부산 버스"
  region: string // e.g., "서울", "부산", "대구"
  departureLocation?: string // 출발 장소
  estimatedArrivalTime?: string // 예정 도착 시간 (e.g., "14:00")
  contactName?: string // 인솔자 이름
  contactPhone?: string // 인솔자 연락처
  notes?: string // 메모
  participantCount: number
  arrivedAt?: Date // 도착 시간 (도착 표시된 경우)
  createdAt: Date
  updatedAt: Date
}

// Schedule/Event for schedule management
export type ScheduleViewMode = 'week' | 'day' | 'custom'
export type ScheduleViewOrientation = 'vertical' | 'horizontal'

export interface ScheduleEvent {
  id: string
  title: string
  description?: string
  startTime: Date // Full datetime
  endTime: Date // Full datetime
  color?: string // Custom color (hex)
  colorIndex?: number // Auto-assigned color index
  location?: string
  allDay?: boolean
  createdAt: Date
  updatedAt: Date
}
