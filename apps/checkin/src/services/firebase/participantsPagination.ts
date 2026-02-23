import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore'
import { db, convertTimestamp } from '@conference/firebase'
import { PARTICIPANTS_COLLECTION } from './collections'
import type { Participant } from '../../types'

/**
 * Helper to parse participant document
 */
const parseParticipantDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): Participant => {
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

/**
 * Simple paginated fetch for participants (for use with useBatchedInfiniteScroll hook)
 * Returns participants ordered by name with cursor-based pagination
 */
export const getParticipantsPaginatedForHook = async (
  lastItem: Participant | null,
  batchSize: number
): Promise<{ data: Participant[]; hasMore: boolean }> => {
  const participantsRef = collection(db, PARTICIPANTS_COLLECTION)

  // Build query
  let q = query(participantsRef, orderBy('name'), limit(batchSize + 1))

  // Add cursor if provided
  if (lastItem) {
    const lastDocRef = doc(db, PARTICIPANTS_COLLECTION, lastItem.id)
    const lastDocSnap = await getDoc(lastDocRef)
    if (lastDocSnap.exists()) {
      q = query(participantsRef, orderBy('name'), startAfter(lastDocSnap), limit(batchSize + 1))
    }
  }

  // Fetch from Firebase
  const snapshot = await getDocs(q)
  const docs = snapshot.docs
  const hasMore = docs.length > batchSize
  const resultDocs = hasMore ? docs.slice(0, batchSize) : docs

  // Parse participants
  const participants = resultDocs.map(parseParticipantDoc)

  return {
    data: participants,
    hasMore
  }
}
