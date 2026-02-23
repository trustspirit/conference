import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  increment,
  limit,
  startAfter
} from 'firebase/firestore'
import type { Room, RoomGenderType, RoomType } from '../../types'
import { db, convertTimestamp } from '@conference/firebase'
import { ROOMS_COLLECTION, PARTICIPANTS_COLLECTION } from './collections'

export const getAllRooms = async (): Promise<Room[]> => {
  const roomsRef = collection(db, ROOMS_COLLECTION)
  const q = query(roomsRef, orderBy('roomNumber'))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt)
    } as Room
  })
}

export const getRoomById = async (roomId: string): Promise<Room | null> => {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId)
  const roomSnap = await getDoc(roomRef)

  if (!roomSnap.exists()) return null

  const data = roomSnap.data()
  return {
    id: roomSnap.id,
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt)
  } as Room
}

export interface CreateRoomOptions {
  roomNumber: string
  maxCapacity?: number
  genderType?: RoomGenderType
  roomType?: RoomType
}

export const createOrGetRoom = async (
  roomNumberOrOptions: string | CreateRoomOptions,
  maxCapacity: number = 4
): Promise<Room> => {
  // Support both old signature (roomNumber, maxCapacity) and new options object
  const options: CreateRoomOptions =
    typeof roomNumberOrOptions === 'string'
      ? { roomNumber: roomNumberOrOptions, maxCapacity }
      : roomNumberOrOptions

  const roomsRef = collection(db, ROOMS_COLLECTION)
  const q = query(roomsRef, where('roomNumber', '==', options.roomNumber), limit(1))
  const snapshot = await getDocs(q)

  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0]
    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt)
    } as Room
  }

  const newRoomRef = doc(roomsRef)
  const now = Timestamp.now()
  const newRoom: Record<string, unknown> = {
    roomNumber: options.roomNumber,
    maxCapacity: options.maxCapacity ?? 4,
    currentOccupancy: 0,
    createdAt: now,
    updatedAt: now
  }

  // Add optional fields only if they are defined
  if (options.genderType) {
    newRoom.genderType = options.genderType
  }
  if (options.roomType) {
    newRoom.roomType = options.roomType
  }

  await setDoc(newRoomRef, newRoom)

  return {
    id: newRoomRef.id,
    roomNumber: options.roomNumber,
    maxCapacity: options.maxCapacity ?? 4,
    currentOccupancy: 0,
    genderType: options.genderType,
    roomType: options.roomType,
    createdAt: now.toDate(),
    updatedAt: now.toDate()
  }
}

export const assignParticipantToRoom = async (
  participantId: string,
  roomId: string,
  roomNumber: string
): Promise<void> => {
  const participantRef = doc(db, PARTICIPANTS_COLLECTION, participantId)
  const participantSnap = await getDoc(participantRef)

  if (!participantSnap.exists()) throw new Error('Participant not found')

  const roomRef = doc(db, ROOMS_COLLECTION, roomId)
  const roomSnap = await getDoc(roomRef)

  if (!roomSnap.exists()) throw new Error('Room not found')

  const roomData = roomSnap.data()
  if (roomData.currentOccupancy >= roomData.maxCapacity) {
    throw new Error('Room is at full capacity')
  }

  const oldRoomId = participantSnap.data().roomId
  const batch = writeBatch(db)

  // Update participant
  batch.update(participantRef, {
    roomId,
    roomNumber,
    updatedAt: Timestamp.now()
  })

  // Decrement old room count if exists
  if (oldRoomId) {
    const oldRoomRef = doc(db, ROOMS_COLLECTION, oldRoomId)
    batch.update(oldRoomRef, {
      currentOccupancy: increment(-1),
      updatedAt: Timestamp.now()
    })
  }

  // Increment new room count
  batch.update(roomRef, {
    currentOccupancy: increment(1),
    updatedAt: Timestamp.now()
  })

  await batch.commit()
}

export interface UpdateRoomData {
  roomNumber?: string
  maxCapacity?: number
  genderType?: RoomGenderType | null
  roomType?: RoomType | null
  leaderId?: string | null
  leaderName?: string | null
}

export const updateRoom = async (roomId: string, data: UpdateRoomData): Promise<Room> => {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId)
  const roomSnap = await getDoc(roomRef)

  if (!roomSnap.exists()) throw new Error('Room not found')

  const currentData = roomSnap.data()
  const batch = writeBatch(db)

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now()
  }

  if (data.roomNumber !== undefined) {
    updateData.roomNumber = data.roomNumber
  }
  if (data.maxCapacity !== undefined) {
    if (data.maxCapacity < currentData.currentOccupancy) {
      throw new Error('Capacity cannot be less than current occupancy')
    }
    updateData.maxCapacity = data.maxCapacity
  }
  if (data.genderType !== undefined) {
    updateData.genderType = data.genderType
  }
  if (data.roomType !== undefined) {
    updateData.roomType = data.roomType
  }
  if (data.leaderId !== undefined) {
    updateData.leaderId = data.leaderId
    updateData.leaderName = data.leaderName
  }

  batch.update(roomRef, updateData)

  if (data.roomNumber !== undefined && data.roomNumber !== currentData.roomNumber) {
    const participantsRef = collection(db, PARTICIPANTS_COLLECTION)
    const q = query(participantsRef, where('roomId', '==', roomId))
    const snapshot = await getDocs(q)

    snapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        roomNumber: data.roomNumber,
        updatedAt: Timestamp.now()
      })
    })
  }

  await batch.commit()

  const updatedSnap = await getDoc(roomRef)
  const updatedData = updatedSnap.data()!

  return {
    id: updatedSnap.id,
    ...updatedData,
    createdAt: convertTimestamp(updatedData.createdAt),
    updatedAt: convertTimestamp(updatedData.updatedAt)
  } as Room
}

export const deleteRoom = async (roomId: string): Promise<void> => {
  const batch = writeBatch(db)

  const participantsRef = collection(db, PARTICIPANTS_COLLECTION)
  const q = query(participantsRef, where('roomId', '==', roomId))
  const snapshot = await getDocs(q)

  snapshot.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, {
      roomId: null,
      roomNumber: null,
      updatedAt: Timestamp.now()
    })
  })

  const roomRef = doc(db, ROOMS_COLLECTION, roomId)
  batch.delete(roomRef)

  await batch.commit()
}

/**
 * Fetches rooms with pagination support
 * @param lastItem The last room from previous fetch (for cursor-based pagination)
 * @param batchSize Number of rooms to fetch
 * @returns Object with data array and hasMore boolean
 */
export const getRoomsPaginated = async (
  lastItem: Room | null,
  batchSize: number
): Promise<{ data: Room[]; hasMore: boolean }> => {
  const roomsRef = collection(db, ROOMS_COLLECTION)

  let q = query(roomsRef, orderBy('roomNumber'), limit(batchSize + 1))

  if (lastItem) {
    // Get the last document snapshot
    const lastDocRef = doc(db, ROOMS_COLLECTION, lastItem.id)
    const lastDocSnap = await getDoc(lastDocRef)

    if (lastDocSnap.exists()) {
      q = query(roomsRef, orderBy('roomNumber'), startAfter(lastDocSnap), limit(batchSize + 1))
    }
  }

  const snapshot = await getDocs(q)
  const docs = snapshot.docs
  const hasMore = docs.length > batchSize
  const resultDocs = hasMore ? docs.slice(0, batchSize) : docs

  const rooms = resultDocs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt)
    } as Room
  })

  return { data: rooms, hasMore }
}
