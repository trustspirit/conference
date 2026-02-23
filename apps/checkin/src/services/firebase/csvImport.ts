import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  increment,
  limit
} from 'firebase/firestore'
import type { CSVParticipantRow } from '../../types'
import { db } from '@conference/firebase'
import { PARTICIPANTS_COLLECTION, GROUPS_COLLECTION, ROOMS_COLLECTION } from './collections'
import { createOrGetGroup } from './groups'
import { createOrGetRoom } from './rooms'

export const importParticipantsFromCSV = async (
  rows: CSVParticipantRow[]
): Promise<{ created: number; updated: number }> => {
  let created = 0
  let updated = 0

  const participantsRef = collection(db, PARTICIPANTS_COLLECTION)

  for (const row of rows) {
    if (!row.name || !row.email) continue

    // Check if participant exists by name + gender + email combination
    const normalizedName = row.name.trim().toLowerCase()
    const normalizedGender = (row.gender || '').trim().toLowerCase()
    const normalizedEmail = row.email.trim().toLowerCase()

    const q = query(
      participantsRef,
      where('email', '==', row.email),
      limit(10) // Get potential matches by email first
    )
    const snapshot = await getDocs(q)

    // Filter by name, gender, and email match (case-insensitive)
    const matchingDoc = snapshot.docs.find((docSnap) => {
      const data = docSnap.data()
      const docName = (data.name || '').trim().toLowerCase()
      const docGender = (data.gender || '').trim().toLowerCase()
      const docEmail = (data.email || '').trim().toLowerCase()
      return (
        docName === normalizedName && docGender === normalizedGender && docEmail === normalizedEmail
      )
    })

    const metadata: Record<string, unknown> = {}
    const knownFields = [
      'name',
      'gender',
      'age',
      'birthDate',
      'stake',
      'ward',
      'phoneNumber',
      'email',
      'groupName',
      'roomNumber'
    ]
    Object.keys(row).forEach((key) => {
      if (!knownFields.includes(key) && row[key]) {
        metadata[key] = row[key]
      }
    })

    // Handle group
    let groupId: string | undefined
    let groupName: string | undefined
    if (row.groupName) {
      const group = await createOrGetGroup(row.groupName)
      groupId = group.id
      groupName = group.name
    }

    // Handle room
    let roomId: string | undefined
    let roomNumber: string | undefined
    if (row.roomNumber) {
      const room = await createOrGetRoom(row.roomNumber)
      roomId = room.id
      roomNumber = room.roomNumber
    }

    const now = Timestamp.now()

    if (!matchingDoc) {
      // Create new participant (no match found by name + gender + email)
      const newParticipantRef = doc(participantsRef)
      await setDoc(newParticipantRef, {
        name: row.name,
        gender: row.gender || '',
        age: parseInt(row.age) || 0,
        birthDate: row.birthDate || null,
        stake: row.stake || '',
        ward: row.ward || '',
        phoneNumber: row.phoneNumber || '',
        email: row.email,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        groupId,
        groupName,
        roomId,
        roomNumber,
        checkIns: [],
        createdAt: now,
        updatedAt: now
      })

      // Update group count
      if (groupId) {
        const groupRef = doc(db, GROUPS_COLLECTION, groupId)
        await updateDoc(groupRef, {
          participantCount: increment(1),
          updatedAt: now
        })
      }

      // Update room count
      if (roomId) {
        const roomRef = doc(db, ROOMS_COLLECTION, roomId)
        await updateDoc(roomRef, {
          currentOccupancy: increment(1),
          updatedAt: now
        })
      }

      created++
    } else {
      // Update existing participant (matched by name + gender + email)
      const existingData = matchingDoc.data()

      await updateDoc(matchingDoc.ref, {
        name: row.name,
        gender: row.gender || existingData.gender,
        age: parseInt(row.age) || existingData.age,
        birthDate: row.birthDate || existingData.birthDate,
        stake: row.stake || existingData.stake,
        ward: row.ward || existingData.ward,
        phoneNumber: row.phoneNumber || existingData.phoneNumber,
        metadata:
          Object.keys(metadata).length > 0
            ? { ...existingData.metadata, ...metadata }
            : existingData.metadata,
        groupId: groupId || existingData.groupId,
        groupName: groupName || existingData.groupName,
        roomId: roomId || existingData.roomId,
        roomNumber: roomNumber || existingData.roomNumber,
        updatedAt: now
      })

      updated++
    }
  }

  return { created, updated }
}
