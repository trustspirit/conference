import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export const onProjectMembersWrite = onDocumentWritten('projects/{projectId}', async (event) => {
  const before = (event.data?.before.data()?.memberRoles ?? {}) as Record<string, string>
  const after = (event.data?.after.data()?.memberRoles ?? {}) as Record<string, string>
  const beforeIds = new Set(Object.keys(before))
  const afterIds = new Set(Object.keys(after))
  const added = [...afterIds].filter((id) => !beforeIds.has(id))
  const removed = [...beforeIds].filter((id) => !afterIds.has(id))

  const db = getFirestore()
  const ops: Promise<unknown>[] = []
  for (const uid of added) {
    ops.push(db.doc(`users/${uid}`).set(
      { assignedProjectCount: FieldValue.increment(1) }, { merge: true }
    ))
  }
  for (const uid of removed) {
    ops.push(db.doc(`users/${uid}`).set(
      { assignedProjectCount: FieldValue.increment(-1) }, { merge: true }
    ))
  }
  await Promise.all(ops)
})
