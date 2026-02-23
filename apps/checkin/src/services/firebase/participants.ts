import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  increment,
  limit,
  startAfter,
  QueryDocumentSnapshot
} from 'firebase/firestore'
import type { Participant, CheckInRecord, SortField, SortDirection } from '../../types'
import { db, convertTimestamp } from '@conference/firebase'
import { PARTICIPANTS_COLLECTION, GROUPS_COLLECTION, ROOMS_COLLECTION } from './collections'
import {
  generateKeyFromParticipant,
  isValidParticipantKey
} from '../../utils/generateParticipantKey'

// Helper to parse participant document
const parseParticipantDoc = (docSnap: QueryDocumentSnapshot): Participant => {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    ...data,
    isPaid: data.isPaid ?? false,
    memo: data.memo || '',
    checkIns: (data.checkIns || []).map(
      (ci: { id: string; checkInTime: Timestamp; checkOutTime?: Timestamp }) => ({
        ...ci,
        checkInTime: convertTimestamp(ci.checkInTime),
        checkOutTime: ci.checkOutTime ? convertTimestamp(ci.checkOutTime) : undefined
      })
    ),
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt)
  } as Participant
}

const isCheckedIn = (participant: Participant): boolean => {
  return participant.checkIns.some((ci) => !ci.checkOutTime)
}

export const searchParticipants = async (searchTerm: string): Promise<Participant[]> => {
  if (!searchTerm.trim()) return []

  const searchLower = searchTerm.toLowerCase()
  const searchUpper = searchTerm.toUpperCase()
  const isKeySearch = isValidParticipantKey(searchUpper)

  const participantsRef = collection(db, PARTICIPANTS_COLLECTION)
  const snapshot = await getDocs(participantsRef)

  const participants: Participant[] = []
  const keyMatchPromises: Promise<{ participant: Participant; matches: boolean }>[] = []

  snapshot.forEach((docSnap) => {
    const data = docSnap.data()
    const name = (data.name || '').toLowerCase()
    const email = (data.email || '').toLowerCase()
    const phone = (data.phoneNumber || '').toLowerCase()

    const participant: Participant = {
      id: docSnap.id,
      ...data,
      isPaid: data.isPaid ?? false,
      memo: data.memo || '',
      birthDate: data.birthDate || undefined,
      checkIns: (data.checkIns || []).map(
        (ci: { id: string; checkInTime: Timestamp; checkOutTime?: Timestamp }) => ({
          ...ci,
          checkInTime: convertTimestamp(ci.checkInTime),
          checkOutTime: ci.checkOutTime ? convertTimestamp(ci.checkOutTime) : undefined
        })
      ),
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt)
    } as Participant

    // 일반 검색 (이름, 이메일, 전화번호)
    if (name.includes(searchLower) || email.includes(searchLower) || phone.includes(searchLower)) {
      participants.push(participant)
    }
    // 키 검색이 가능한 경우 (8자리 대문자+숫자)
    else if (isKeySearch && participant.birthDate) {
      keyMatchPromises.push(
        generateKeyFromParticipant(participant.name, participant.birthDate).then((key) => ({
          participant,
          matches: key === searchUpper
        }))
      )
    }
  })

  // 키 매칭 결과 처리
  if (keyMatchPromises.length > 0) {
    const keyResults = await Promise.all(keyMatchPromises)
    for (const result of keyResults) {
      if (result.matches) {
        participants.push(result.participant)
      }
    }
  }

  return participants.slice(0, 10)
}

export const getParticipantById = async (id: string): Promise<Participant | null> => {
  const docRef = doc(db, PARTICIPANTS_COLLECTION, id)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) return null

  const data = docSnap.data()
  return {
    id: docSnap.id,
    ...data,
    isPaid: data.isPaid ?? false,
    memo: data.memo || '',
    checkIns: (data.checkIns || []).map(
      (ci: { id: string; checkInTime: Timestamp; checkOutTime?: Timestamp }) => ({
        ...ci,
        checkInTime: convertTimestamp(ci.checkInTime),
        checkOutTime: ci.checkOutTime ? convertTimestamp(ci.checkOutTime) : undefined
      })
    ),
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt)
  } as Participant
}

export const getAllParticipants = async (): Promise<Participant[]> => {
  const participantsRef = collection(db, PARTICIPANTS_COLLECTION)
  const q = query(participantsRef, orderBy('name'))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      isPaid: data.isPaid ?? false,
      memo: data.memo || '',
      checkIns: (data.checkIns || []).map(
        (ci: { id: string; checkInTime: Timestamp; checkOutTime?: Timestamp }) => ({
          ...ci,
          checkInTime: convertTimestamp(ci.checkInTime),
          checkOutTime: ci.checkOutTime ? convertTimestamp(ci.checkOutTime) : undefined
        })
      ),
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt)
    } as Participant
  })
}

export interface PaginatedResult<T> {
  data: T[]
  lastDoc: QueryDocumentSnapshot | null
  hasMore: boolean
}

export interface ParticipantFilters {
  searchTerm?: string
  checkInStatus?: 'all' | 'checked-in' | 'not-checked-in'
}

export const getParticipantsPaginated = async (
  pageSize: number = 100,
  cursor?: QueryDocumentSnapshot | null,
  filters?: ParticipantFilters
): Promise<PaginatedResult<Participant>> => {
  const participantsRef = collection(db, PARTICIPANTS_COLLECTION)

  let q = query(participantsRef, orderBy('name'), limit(pageSize + 1))

  if (cursor) {
    q = query(participantsRef, orderBy('name'), startAfter(cursor), limit(pageSize + 1))
  }

  const snapshot = await getDocs(q)
  const docs = snapshot.docs
  const hasMore = docs.length > pageSize
  const resultDocs = hasMore ? docs.slice(0, pageSize) : docs

  let participants = resultDocs.map(parseParticipantDoc)

  if (filters?.searchTerm) {
    const searchLower = filters.searchTerm.toLowerCase()
    participants = participants.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.email.toLowerCase().includes(searchLower) ||
        p.phoneNumber?.toLowerCase().includes(searchLower) ||
        p.ward?.toLowerCase().includes(searchLower) ||
        p.stake?.toLowerCase().includes(searchLower)
    )
  }

  if (filters?.checkInStatus && filters.checkInStatus !== 'all') {
    participants = participants.filter((p) => {
      const checkedIn = isCheckedIn(p)
      return filters.checkInStatus === 'checked-in' ? checkedIn : !checkedIn
    })
  }

  return {
    data: participants,
    lastDoc: resultDocs.length > 0 ? resultDocs[resultDocs.length - 1] : null,
    hasMore
  }
}

export const searchParticipantsPaginated = async (
  searchTerm: string,
  checkInStatus: 'all' | 'checked-in' | 'not-checked-in' = 'all',
  pageSize: number = 100,
  loadedIds: Set<string> = new Set(),
  sortField: SortField | null = null,
  sortDirection: SortDirection = 'asc'
): Promise<{ data: Participant[]; hasMore: boolean }> => {
  const participantsRef = collection(db, PARTICIPANTS_COLLECTION)
  const q = query(participantsRef, orderBy('name'))
  const snapshot = await getDocs(q)

  let participants = snapshot.docs.map(parseParticipantDoc)

  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase()
    participants = participants.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.email.toLowerCase().includes(searchLower) ||
        p.phoneNumber?.toLowerCase().includes(searchLower) ||
        p.ward?.toLowerCase().includes(searchLower) ||
        p.stake?.toLowerCase().includes(searchLower)
    )
  }

  if (checkInStatus !== 'all') {
    participants = participants.filter((p) => {
      const checkedIn = isCheckedIn(p)
      return checkInStatus === 'checked-in' ? checkedIn : !checkedIn
    })
  }

  if (sortField) {
    participants.sort((a, b) => {
      let aValue: string | number = ''
      let bValue: string | number = ''

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'ward':
          aValue = (a.ward || '').toLowerCase()
          bValue = (b.ward || '').toLowerCase()
          break
        case 'group':
          aValue = (a.groupName || '').toLowerCase()
          bValue = (b.groupName || '').toLowerCase()
          break
        case 'room':
          aValue = a.roomNumber || ''
          bValue = b.roomNumber || ''
          break
        case 'status':
          aValue = isCheckedIn(a) ? 0 : 1
          bValue = isCheckedIn(b) ? 0 : 1
          break
        case 'payment':
          aValue = a.isPaid ? 0 : 1
          bValue = b.isPaid ? 0 : 1
          break
      }

      if (aValue === '' && bValue !== '') return 1
      if (aValue !== '' && bValue === '') return -1
      if (aValue === '' && bValue === '') return 0

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  const notLoaded = participants.filter((p) => !loadedIds.has(p.id))
  const pageData = notLoaded.slice(0, pageSize)
  const hasMore = notLoaded.length > pageSize

  return { data: pageData, hasMore }
}

export interface CreateParticipantData {
  name: string
  email: string
  gender?: string
  age?: number
  birthDate?: string
  stake?: string
  ward?: string
  phoneNumber?: string
  isPaid?: boolean
  memo?: string
  groupId?: string
  groupName?: string
  roomId?: string
  roomNumber?: string
}

export interface UpdateParticipantData {
  name?: string
  email?: string
  gender?: string
  age?: number
  birthDate?: string
  stake?: string
  ward?: string
  phoneNumber?: string
  isPaid?: boolean
  memo?: string
}

export const addParticipant = async (data: CreateParticipantData): Promise<Participant> => {
  const participantsRef = collection(db, PARTICIPANTS_COLLECTION)

  // Check if email already exists
  const q = query(participantsRef, where('email', '==', data.email), limit(1))
  const snapshot = await getDocs(q)

  if (!snapshot.empty) {
    throw new Error('A participant with this email already exists')
  }

  const now = Timestamp.now()
  const newParticipantRef = doc(participantsRef)

  const participantData = {
    name: data.name,
    email: data.email,
    gender: data.gender || '',
    age: data.age || 0,
    birthDate: data.birthDate || undefined,
    stake: data.stake || '',
    ward: data.ward || '',
    phoneNumber: data.phoneNumber || '',
    isPaid: data.isPaid ?? false,
    memo: data.memo || '',
    groupId: data.groupId || null,
    groupName: data.groupName || null,
    roomId: data.roomId || null,
    roomNumber: data.roomNumber || null,
    checkIns: [],
    createdAt: now,
    updatedAt: now
  }

  await setDoc(newParticipantRef, participantData)

  // Update group count if assigned
  if (data.groupId) {
    const groupRef = doc(db, GROUPS_COLLECTION, data.groupId)
    await updateDoc(groupRef, {
      participantCount: increment(1),
      updatedAt: now
    })
  }

  // Update room count if assigned
  if (data.roomId) {
    const roomRef = doc(db, ROOMS_COLLECTION, data.roomId)
    await updateDoc(roomRef, {
      currentOccupancy: increment(1),
      updatedAt: now
    })
  }

  return {
    id: newParticipantRef.id,
    ...participantData,
    groupId: data.groupId,
    groupName: data.groupName,
    roomId: data.roomId,
    roomNumber: data.roomNumber,
    checkIns: [],
    createdAt: now.toDate(),
    updatedAt: now.toDate()
  }
}

export const updateParticipant = async (
  participantId: string,
  data: UpdateParticipantData
): Promise<Participant> => {
  const docRef = doc(db, PARTICIPANTS_COLLECTION, participantId)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) throw new Error('Participant not found')

  const currentData = docSnap.data()

  if (data.email && data.email !== currentData.email) {
    const emailQuery = query(
      collection(db, PARTICIPANTS_COLLECTION),
      where('email', '==', data.email),
      limit(1)
    )
    const emailSnapshot = await getDocs(emailQuery)
    if (!emailSnapshot.empty) {
      throw new Error('Email already exists')
    }
  }

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now()
  }

  if (data.name !== undefined) updateData.name = data.name
  if (data.email !== undefined) updateData.email = data.email
  if (data.gender !== undefined) updateData.gender = data.gender
  if (data.age !== undefined) updateData.age = data.age
  if (data.birthDate !== undefined) updateData.birthDate = data.birthDate
  if (data.stake !== undefined) updateData.stake = data.stake
  if (data.ward !== undefined) updateData.ward = data.ward
  if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber
  if (data.isPaid !== undefined) updateData.isPaid = data.isPaid
  if (data.memo !== undefined) updateData.memo = data.memo

  await updateDoc(docRef, updateData)

  const updatedSnap = await getDoc(docRef)
  const updatedData = updatedSnap.data()!

  return {
    id: updatedSnap.id,
    ...updatedData,
    checkIns: (updatedData.checkIns || []).map(
      (ci: { id: string; checkInTime: Timestamp; checkOutTime?: Timestamp }) => ({
        id: ci.id,
        checkInTime: ci.checkInTime.toDate(),
        checkOutTime: ci.checkOutTime?.toDate()
      })
    ),
    createdAt: convertTimestamp(updatedData.createdAt),
    updatedAt: convertTimestamp(updatedData.updatedAt)
  } as Participant
}

export const checkInParticipant = async (participantId: string): Promise<CheckInRecord> => {
  const docRef = doc(db, PARTICIPANTS_COLLECTION, participantId)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) throw new Error('Participant not found')

  const data = docSnap.data()
  const checkIns: CheckInRecord[] = data.checkIns || []

  const newCheckIn: CheckInRecord = {
    id: `checkin_${Date.now()}`,
    checkInTime: new Date()
  }

  await updateDoc(docRef, {
    checkIns: [
      ...checkIns,
      { ...newCheckIn, checkInTime: Timestamp.fromDate(newCheckIn.checkInTime) }
    ],
    updatedAt: Timestamp.now()
  })

  return newCheckIn
}

export const checkOutParticipant = async (
  participantId: string,
  checkInId: string
): Promise<void> => {
  const docRef = doc(db, PARTICIPANTS_COLLECTION, participantId)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) throw new Error('Participant not found')

  const data = docSnap.data()
  const checkIns = data.checkIns || []

  const updatedCheckIns = checkIns.map(
    (ci: { id: string; checkInTime: Timestamp; checkOutTime?: Timestamp }) => {
      if (ci.id === checkInId) {
        return { ...ci, checkOutTime: Timestamp.now() }
      }
      return ci
    }
  )

  await updateDoc(docRef, {
    checkIns: updatedCheckIns,
    updatedAt: Timestamp.now()
  })
}

export const moveParticipantsToRoom = async (
  participantIds: string[],
  targetRoomId: string,
  targetRoomNumber: string
): Promise<void> => {
  if (participantIds.length === 0) return

  const roomRef = doc(db, ROOMS_COLLECTION, targetRoomId)
  const roomSnap = await getDoc(roomRef)

  if (!roomSnap.exists()) throw new Error('Target room not found')

  const roomData = roomSnap.data()
  const availableSpace = roomData.maxCapacity - roomData.currentOccupancy

  const participantRefs = await Promise.all(
    participantIds.map(async (id) => {
      const ref = doc(db, PARTICIPANTS_COLLECTION, id)
      const snap = await getDoc(ref)
      return { ref, snap, id }
    })
  )

  const validParticipants = participantRefs.filter((p) => p.snap.exists())
  const movingToNewRoom = validParticipants.filter((p) => p.snap.data()?.roomId !== targetRoomId)

  if (movingToNewRoom.length > availableSpace) {
    throw new Error(
      `Room capacity exceeded. Available: ${availableSpace}, Trying to move: ${movingToNewRoom.length}`
    )
  }

  const batch = writeBatch(db)
  const roomCountChanges: Record<string, number> = {}

  for (const { ref, snap } of validParticipants) {
    const data = snap.data()!
    const oldRoomId = data.roomId

    if (oldRoomId === targetRoomId) continue

    batch.update(ref, {
      roomId: targetRoomId,
      roomNumber: targetRoomNumber,
      updatedAt: Timestamp.now()
    })

    if (oldRoomId) {
      roomCountChanges[oldRoomId] = (roomCountChanges[oldRoomId] || 0) - 1
    }
    roomCountChanges[targetRoomId] = (roomCountChanges[targetRoomId] || 0) + 1
  }

  for (const [roomId, change] of Object.entries(roomCountChanges)) {
    const ref = doc(db, ROOMS_COLLECTION, roomId)
    batch.update(ref, {
      currentOccupancy: increment(change),
      updatedAt: Timestamp.now()
    })
  }

  await batch.commit()
}

export const moveParticipantsToGroup = async (
  participantIds: string[],
  targetGroupId: string,
  targetGroupName: string
): Promise<void> => {
  if (participantIds.length === 0) return

  const groupRef = doc(db, GROUPS_COLLECTION, targetGroupId)
  const groupSnap = await getDoc(groupRef)

  if (!groupSnap.exists()) throw new Error('Target group not found')

  const participantRefs = await Promise.all(
    participantIds.map(async (id) => {
      const ref = doc(db, PARTICIPANTS_COLLECTION, id)
      const snap = await getDoc(ref)
      return { ref, snap, id }
    })
  )

  const validParticipants = participantRefs.filter((p) => p.snap.exists())

  const batch = writeBatch(db)
  const groupCountChanges: Record<string, number> = {}

  for (const { ref, snap } of validParticipants) {
    const data = snap.data()!
    const oldGroupId = data.groupId

    if (oldGroupId === targetGroupId) continue

    batch.update(ref, {
      groupId: targetGroupId,
      groupName: targetGroupName,
      updatedAt: Timestamp.now()
    })

    if (oldGroupId) {
      groupCountChanges[oldGroupId] = (groupCountChanges[oldGroupId] || 0) - 1
    }
    groupCountChanges[targetGroupId] = (groupCountChanges[targetGroupId] || 0) + 1
  }

  for (const [groupId, change] of Object.entries(groupCountChanges)) {
    const ref = doc(db, GROUPS_COLLECTION, groupId)
    batch.update(ref, {
      participantCount: increment(change),
      updatedAt: Timestamp.now()
    })
  }

  await batch.commit()
}

export const removeParticipantFromGroup = async (participantId: string): Promise<void> => {
  const participantRef = doc(db, PARTICIPANTS_COLLECTION, participantId)
  const participantSnap = await getDoc(participantRef)

  if (!participantSnap.exists()) throw new Error('Participant not found')

  const data = participantSnap.data()
  const groupId = data.groupId

  if (!groupId) return

  const batch = writeBatch(db)

  batch.update(participantRef, {
    groupId: null,
    groupName: null,
    updatedAt: Timestamp.now()
  })

  const groupRef = doc(db, GROUPS_COLLECTION, groupId)
  batch.update(groupRef, {
    participantCount: increment(-1),
    updatedAt: Timestamp.now()
  })

  await batch.commit()
}

export const removeParticipantFromRoom = async (participantId: string): Promise<void> => {
  const participantRef = doc(db, PARTICIPANTS_COLLECTION, participantId)
  const participantSnap = await getDoc(participantRef)

  if (!participantSnap.exists()) throw new Error('Participant not found')

  const data = participantSnap.data()
  const roomId = data.roomId

  if (!roomId) return

  const batch = writeBatch(db)

  batch.update(participantRef, {
    roomId: null,
    roomNumber: null,
    updatedAt: Timestamp.now()
  })

  const roomRef = doc(db, ROOMS_COLLECTION, roomId)
  batch.update(roomRef, {
    currentOccupancy: increment(-1),
    updatedAt: Timestamp.now()
  })

  await batch.commit()
}
