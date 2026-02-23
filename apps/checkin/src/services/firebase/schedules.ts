import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
  onSnapshot
} from 'firebase/firestore'
import { db, convertTimestamp } from '@conference/firebase'
import { SCHEDULES_COLLECTION } from './collections'
import type { ScheduleEvent } from '../../types'

// Type for creating a new schedule
export interface CreateScheduleData {
  title: string
  description?: string
  startTime: Date
  endTime: Date
  color?: string
  colorIndex?: number
  location?: string
  allDay?: boolean
}

// Type for updating a schedule
export interface UpdateScheduleData {
  title?: string
  description?: string
  startTime?: Date
  endTime?: Date
  color?: string
  colorIndex?: number
  location?: string
  allDay?: boolean
}

// Convert Firestore document to ScheduleEvent
const convertToScheduleEvent = (id: string, data: Record<string, unknown>): ScheduleEvent => ({
  id,
  title: data.title as string,
  description: data.description as string | undefined,
  startTime: convertTimestamp(data.startTime as Timestamp),
  endTime: convertTimestamp(data.endTime as Timestamp),
  color: data.color as string | undefined,
  colorIndex: data.colorIndex as number | undefined,
  location: data.location as string | undefined,
  allDay: data.allDay as boolean | undefined,
  createdAt: convertTimestamp(data.createdAt as Timestamp),
  updatedAt: convertTimestamp(data.updatedAt as Timestamp)
})

// Get all schedules
export const getAllSchedules = async (): Promise<ScheduleEvent[]> => {

  const q = query(collection(db, SCHEDULES_COLLECTION), orderBy('startTime', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => convertToScheduleEvent(doc.id, doc.data()))
}

// Get schedules by date range
export const getSchedulesByDateRange = async (
  startDate: Date,
  endDate: Date
): Promise<ScheduleEvent[]> => {

  const q = query(
    collection(db, SCHEDULES_COLLECTION),
    where('startTime', '>=', Timestamp.fromDate(startDate)),
    where('startTime', '<=', Timestamp.fromDate(endDate)),
    orderBy('startTime', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => convertToScheduleEvent(doc.id, doc.data()))
}

// Get schedule by ID
export const getScheduleById = async (id: string): Promise<ScheduleEvent | null> => {

  const docRef = doc(db, SCHEDULES_COLLECTION, id)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) return null
  return convertToScheduleEvent(snapshot.id, snapshot.data())
}

// Create a new schedule
export const createSchedule = async (data: CreateScheduleData): Promise<ScheduleEvent> => {

  const now = new Date()

  const docData = {
    title: data.title,
    description: data.description || null,
    startTime: Timestamp.fromDate(data.startTime),
    endTime: Timestamp.fromDate(data.endTime),
    color: data.color || null,
    colorIndex: data.colorIndex ?? null,
    location: data.location || null,
    allDay: data.allDay || false,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now)
  }

  const docRef = await addDoc(collection(db, SCHEDULES_COLLECTION), docData)
  return {
    id: docRef.id,
    title: data.title,
    description: data.description,
    startTime: data.startTime,
    endTime: data.endTime,
    color: data.color,
    colorIndex: data.colorIndex,
    location: data.location,
    allDay: data.allDay,
    createdAt: now,
    updatedAt: now
  }
}

// Update a schedule
export const updateSchedule = async (id: string, data: UpdateScheduleData): Promise<void> => {

  const docRef = doc(db, SCHEDULES_COLLECTION, id)

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.fromDate(new Date())
  }

  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description || null
  if (data.startTime !== undefined) updateData.startTime = Timestamp.fromDate(data.startTime)
  if (data.endTime !== undefined) updateData.endTime = Timestamp.fromDate(data.endTime)
  if (data.color !== undefined) updateData.color = data.color || null
  if (data.colorIndex !== undefined) updateData.colorIndex = data.colorIndex
  if (data.location !== undefined) updateData.location = data.location || null
  if (data.allDay !== undefined) updateData.allDay = data.allDay

  await updateDoc(docRef, updateData)
}

// Delete a schedule
export const deleteSchedule = async (id: string): Promise<void> => {

  const docRef = doc(db, SCHEDULES_COLLECTION, id)
  await deleteDoc(docRef)
}

// Subscribe to schedules (real-time updates)
export const subscribeToSchedules = (
  callback: (schedules: ScheduleEvent[]) => void
): (() => void) => {

  const q = query(collection(db, SCHEDULES_COLLECTION), orderBy('startTime', 'asc'))

  return onSnapshot(q, (snapshot) => {
    const schedules = snapshot.docs.map((doc) => convertToScheduleEvent(doc.id, doc.data()))
    callback(schedules)
  })
}
