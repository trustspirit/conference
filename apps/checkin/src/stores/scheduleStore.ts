import { atom } from 'jotai'
import type { ScheduleEvent, ScheduleViewMode, ScheduleViewOrientation } from '../types'
import {
  getAllSchedules,
  subscribeToSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  isFirebaseConfigured
} from '../services/firebase'
import type { CreateScheduleData, UpdateScheduleData } from '../services/firebase'
import { addToastAtom } from './toastStore'

// Schedule events state
export const schedulesAtom = atom<ScheduleEvent[]>([])
export const isLoadingSchedulesAtom = atom(false)

// View state
export const scheduleViewModeAtom = atom<ScheduleViewMode>('week')
export const scheduleViewOrientationAtom = atom<ScheduleViewOrientation>('vertical')
export const selectedDateAtom = atom<Date>(new Date())

// Custom date range (for 'custom' view mode)
export const customStartDateAtom = atom<Date>(new Date())

// Initialize end date to 7 days from now
const initialEndDate = new Date()
initialEndDate.setDate(initialEndDate.getDate() + 6)
export const customEndDateAtom = atom<Date>(initialEndDate)

// Event period settings (stored in localStorage)
const STORAGE_KEY_EVENT_PERIOD = 'checkin_event_period'

const loadEventPeriodFromStorage = (): { startDate: Date; endDate: Date } | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_EVENT_PERIOD)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        startDate: new Date(parsed.startDate),
        endDate: new Date(parsed.endDate)
      }
    }
  } catch (error) {
    console.error('Failed to load event period from storage:', error)
  }
  return null
}

const saveEventPeriodToStorage = (startDate: Date, endDate: Date): void => {
  try {
    localStorage.setItem(
      STORAGE_KEY_EVENT_PERIOD,
      JSON.stringify({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
    )
  } catch (error) {
    console.error('Failed to save event period to storage:', error)
  }
}

const storedEventPeriod = loadEventPeriodFromStorage()

export const eventPeriodStartAtom = atom<Date | null>(storedEventPeriod?.startDate || null)
export const eventPeriodEndAtom = atom<Date | null>(storedEventPeriod?.endDate || null)

// Set event period and save to storage
export const setEventPeriodAtom = atom(
  null,
  (_get, set, { startDate, endDate }: { startDate: Date; endDate: Date }) => {
    set(eventPeriodStartAtom, startDate)
    set(eventPeriodEndAtom, endDate)
    saveEventPeriodToStorage(startDate, endDate)
  }
)

// Clear event period
export const clearEventPeriodAtom = atom(null, (_get, set) => {
  set(eventPeriodStartAtom, null)
  set(eventPeriodEndAtom, null)
  localStorage.removeItem(STORAGE_KEY_EVENT_PERIOD)
})

// Apply event period to custom view
export const applyEventPeriodAtom = atom(null, (get, set) => {
  const startDate = get(eventPeriodStartAtom)
  const endDate = get(eventPeriodEndAtom)

  if (startDate && endDate) {
    set(customStartDateAtom, startDate)
    set(customEndDateAtom, endDate)
    set(scheduleViewModeAtom, 'custom')
  }
})

// Unsubscribe function for realtime listener
let unsubscribeSchedules: (() => void) | null = null

// Setup realtime listener for schedules
export const setupScheduleListenerAtom = atom(null, (_get, set) => {
  if (!isFirebaseConfigured()) return

  if (unsubscribeSchedules) return // Already subscribed

  try {
    unsubscribeSchedules = subscribeToSchedules((data) => {
      set(schedulesAtom, data)
      set(isLoadingSchedulesAtom, false)
    })
  } catch (error) {
    console.error('Error setting up schedule listener:', error)
  }
})

// Cleanup listener
export const cleanupScheduleListenerAtom = atom(null, () => {
  if (unsubscribeSchedules) {
    unsubscribeSchedules()
    unsubscribeSchedules = null
  }
})

// Fetch all schedules
export const fetchSchedulesAtom = atom(null, async (_get, set) => {
  if (!isFirebaseConfigured()) {
    set(addToastAtom, { message: 'Firebase not configured', type: 'warning' })
    return
  }

  set(isLoadingSchedulesAtom, true)
  try {
    const schedules = await getAllSchedules()
    set(schedulesAtom, schedules)
  } catch (error) {
    console.error('Error fetching schedules:', error)
    set(addToastAtom, {
      message: error instanceof Error ? error.message : 'Failed to fetch schedules',
      type: 'error'
    })
  } finally {
    set(isLoadingSchedulesAtom, false)
  }
})

// Create schedule
export const createScheduleAtom = atom(
  null,
  async (_get, set, data: CreateScheduleData): Promise<ScheduleEvent | null> => {
    try {
      const schedule = await createSchedule(data)
      set(addToastAtom, { message: '스케줄이 생성되었습니다', type: 'success' })
      return schedule
    } catch (error) {
      console.error('Error creating schedule:', error)
      set(addToastAtom, {
        message: error instanceof Error ? error.message : 'Failed to create schedule',
        type: 'error'
      })
      return null
    }
  }
)

// Update schedule
export const updateScheduleAtom = atom(
  null,
  async (_get, set, { id, data }: { id: string; data: UpdateScheduleData }): Promise<boolean> => {
    try {
      await updateSchedule(id, data)
      set(addToastAtom, { message: '스케줄이 수정되었습니다', type: 'success' })
      return true
    } catch (error) {
      console.error('Error updating schedule:', error)
      set(addToastAtom, {
        message: error instanceof Error ? error.message : 'Failed to update schedule',
        type: 'error'
      })
      return false
    }
  }
)

// Delete schedule
export const deleteScheduleAtom = atom(null, async (_get, set, id: string): Promise<boolean> => {
  try {
    await deleteSchedule(id)
    set(addToastAtom, { message: '스케줄이 삭제되었습니다', type: 'success' })
    return true
  } catch (error) {
    console.error('Error deleting schedule:', error)
    set(addToastAtom, {
      message: error instanceof Error ? error.message : 'Failed to delete schedule',
      type: 'error'
    })
    return false
  }
})

// Navigate to previous period
export const goToPreviousPeriodAtom = atom(null, (get, set) => {
  const viewMode = get(scheduleViewModeAtom)

  if (viewMode === 'custom') {
    const startDate = get(customStartDateAtom)
    const endDate = get(customEndDateAtom)
    const rangeDays =
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const newStartDate = new Date(startDate)
    newStartDate.setDate(newStartDate.getDate() - rangeDays)
    const newEndDate = new Date(endDate)
    newEndDate.setDate(newEndDate.getDate() - rangeDays)

    set(customStartDateAtom, newStartDate)
    set(customEndDateAtom, newEndDate)
  } else {
    const currentDate = get(selectedDateAtom)
    const newDate = new Date(currentDate)

    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() - 1)
    }

    set(selectedDateAtom, newDate)
  }
})

// Navigate to next period
export const goToNextPeriodAtom = atom(null, (get, set) => {
  const viewMode = get(scheduleViewModeAtom)

  if (viewMode === 'custom') {
    const startDate = get(customStartDateAtom)
    const endDate = get(customEndDateAtom)
    const rangeDays =
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const newStartDate = new Date(startDate)
    newStartDate.setDate(newStartDate.getDate() + rangeDays)
    const newEndDate = new Date(endDate)
    newEndDate.setDate(newEndDate.getDate() + rangeDays)

    set(customStartDateAtom, newStartDate)
    set(customEndDateAtom, newEndDate)
  } else {
    const currentDate = get(selectedDateAtom)
    const newDate = new Date(currentDate)

    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }

    set(selectedDateAtom, newDate)
  }
})

// Go to today - sets selected date to today in any view mode
export const goToTodayAtom = atom(null, (_get, set) => {
  set(selectedDateAtom, new Date())
})
