import { collection, query, orderBy, onSnapshot, Unsubscribe, Timestamp } from 'firebase/firestore'
import type { Participant, Group, Room } from '../../types'
import { db, convertTimestamp } from '@conference/firebase'
import { PARTICIPANTS_COLLECTION, GROUPS_COLLECTION, ROOMS_COLLECTION } from './collections'

export type DataListener<T> = (data: T[]) => void

export const subscribeToParticipants = (onData: DataListener<Participant>): Unsubscribe => {
  const participantsRef = collection(db, PARTICIPANTS_COLLECTION)
  const q = query(participantsRef, orderBy('name'))

  return onSnapshot(q, (snapshot) => {
    const participants = snapshot.docs.map((docSnap) => {
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
    onData(participants)
  })
}

export const subscribeToGroups = (onData: DataListener<Group>): Unsubscribe => {
  const groupsRef = collection(db, GROUPS_COLLECTION)
  const q = query(groupsRef, orderBy('name'))

  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Group
    })
    onData(groups)
  })
}

export const subscribeToRooms = (onData: DataListener<Room>): Unsubscribe => {
  const roomsRef = collection(db, ROOMS_COLLECTION)
  const q = query(roomsRef, orderBy('roomNumber'))

  return onSnapshot(q, (snapshot) => {
    const rooms = snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Room
    })
    onData(rooms)
  })
}
