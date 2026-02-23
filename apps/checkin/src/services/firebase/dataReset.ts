import {
  collection,
  getDocs,
  writeBatch,
  query,
  limit,
  DocumentReference
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import { PARTICIPANTS_COLLECTION, GROUPS_COLLECTION, ROOMS_COLLECTION } from './collections'

const BATCH_SIZE = 500 // Firestore batch limit

/**
 * Delete all documents in a collection using batched writes
 */
async function deleteCollection(collectionName: string): Promise<number> {

  const collectionRef = collection(db, collectionName)
  let totalDeleted = 0

  // Keep deleting until no documents remain
  while (true) {
    const q = query(collectionRef, limit(BATCH_SIZE))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      break
    }

    const batch = writeBatch(db)
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref as DocumentReference)
    })

    await batch.commit()
    totalDeleted += snapshot.docs.length
  }

  return totalDeleted
}

export interface ResetResult {
  success: boolean
  participantsDeleted: number
  groupsDeleted: number
  roomsDeleted: number
  error?: string
}

/**
 * Reset all data in the database (participants, groups, rooms)
 */
export async function resetAllData(): Promise<ResetResult> {
  try {
    const [participantsDeleted, groupsDeleted, roomsDeleted] = await Promise.all([
      deleteCollection(PARTICIPANTS_COLLECTION),
      deleteCollection(GROUPS_COLLECTION),
      deleteCollection(ROOMS_COLLECTION)
    ])

    return {
      success: true,
      participantsDeleted,
      groupsDeleted,
      roomsDeleted
    }
  } catch (error) {
    console.error('Error resetting data:', error)
    return {
      success: false,
      participantsDeleted: 0,
      groupsDeleted: 0,
      roomsDeleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
