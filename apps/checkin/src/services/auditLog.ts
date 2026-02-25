import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  onSnapshot,
  Unsubscribe,
  writeBatch
} from 'firebase/firestore'
import { db, functions } from '@conference/firebase'
import { httpsCallable } from 'firebase/functions'
import type { AuditLogEntry } from '../types'

export type { AuditLogEntry }

const AUDIT_LOGS_COLLECTION = 'audit_logs'

// Helper to convert Firestore timestamps
const convertTimestamp = (timestamp: Timestamp | Date | string | undefined): string => {
  if (!timestamp) return new Date().toISOString()
  if (timestamp instanceof Timestamp) return timestamp.toDate().toISOString()
  if (timestamp instanceof Date) return timestamp.toISOString()
  return timestamp
}

const writeAuditLogFn = httpsCallable(functions, 'writeAuditLog')

export const writeAuditLog = async (
  userName: string,
  action: AuditLogEntry['action'],
  targetType: AuditLogEntry['targetType'],
  targetId: string,
  targetName: string,
  changes?: AuditLogEntry['changes']
): Promise<boolean> => {
  try {
    await writeAuditLogFn({
      userName,
      action,
      targetType,
      targetId,
      targetName,
      changes: changes || null
    })
    return true
  } catch (error) {
    console.error('Failed to write audit log:', error)
    return false
  }
}

export interface PaginatedAuditResult {
  data: AuditLogEntry[]
  lastDoc: QueryDocumentSnapshot | null
  hasMore: boolean
}

export const readAuditLogs = async (): Promise<AuditLogEntry[]> => {
  try {

    const auditLogsRef = collection(db, AUDIT_LOGS_COLLECTION)
    const q = query(auditLogsRef, orderBy('timestamp', 'desc'))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        timestamp: convertTimestamp(data.timestamp),
        userName: data.userName,
        userEmail: data.userEmail || '',
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        targetName: data.targetName,
        changes: data.changes || undefined
      } as AuditLogEntry
    })
  } catch (error) {
    console.error('Failed to read audit logs:', error)
    return []
  }
}

export const readAuditLogsPaginated = async (
  pageSize: number = 50,
  cursor?: QueryDocumentSnapshot | null
): Promise<PaginatedAuditResult> => {
  try {

    const auditLogsRef = collection(db, AUDIT_LOGS_COLLECTION)

    let q = query(auditLogsRef, orderBy('timestamp', 'desc'), limit(pageSize + 1))

    if (cursor) {
      q = query(auditLogsRef, orderBy('timestamp', 'desc'), startAfter(cursor), limit(pageSize + 1))
    }

    const snapshot = await getDocs(q)
    const docs = snapshot.docs
    const hasMore = docs.length > pageSize
    const resultDocs = hasMore ? docs.slice(0, pageSize) : docs

    const data = resultDocs.map((docSnap) => {
      const d = docSnap.data()
      return {
        id: docSnap.id,
        timestamp: convertTimestamp(d.timestamp),
        userName: d.userName,
        userEmail: d.userEmail || '',
        action: d.action,
        targetType: d.targetType,
        targetId: d.targetId,
        targetName: d.targetName,
        changes: d.changes || undefined
      } as AuditLogEntry
    })

    return {
      data,
      lastDoc: resultDocs.length > 0 ? resultDocs[resultDocs.length - 1] : null,
      hasMore
    }
  } catch (error) {
    console.error('Failed to read audit logs paginated:', error)
    return { data: [], lastDoc: null, hasMore: false }
  }
}

export const subscribeToAuditLogs = (
  onData: (logs: AuditLogEntry[]) => void,
  maxLogs: number = 100
): Unsubscribe => {
  const auditLogsRef = collection(db, AUDIT_LOGS_COLLECTION)
  const q = query(auditLogsRef, orderBy('timestamp', 'desc'), limit(maxLogs))

  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        timestamp: convertTimestamp(data.timestamp),
        userName: data.userName,
        userEmail: data.userEmail || '',
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        targetName: data.targetName,
        changes: data.changes || undefined
      } as AuditLogEntry
    })
    onData(logs)
  })
}

export const clearAuditLogs = async (): Promise<boolean> => {
  try {

    const auditLogsRef = collection(db, AUDIT_LOGS_COLLECTION)
    const snapshot = await getDocs(auditLogsRef)

    // Delete in batches of 500 (Firestore limit)
    const batchSize = 500
    const docs = snapshot.docs

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = writeBatch(db)
      const chunk = docs.slice(i, i + batchSize)
      chunk.forEach((docSnap) => {
        batch.delete(docSnap.ref)
      })
      await batch.commit()
    }

    return true
  } catch (error) {
    console.error('Failed to clear audit logs:', error)
    return false
  }
}

export const deleteAuditLog = async (logId: string): Promise<boolean> => {
  try {

    const logRef = doc(db, AUDIT_LOGS_COLLECTION, logId)
    await deleteDoc(logRef)
    return true
  } catch (error) {
    console.error('Failed to delete audit log:', error)
    return false
  }
}
