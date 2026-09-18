/**
 * Migration: give rejections their own audit fields
 *
 * Rejections used to be written into the field of the stage they denied, which
 * left rejected requests looking reviewed and approved. This moves the rejecter
 * into `rejectedBy` / `rejectedAt` and clears the review and approval fields so
 * the stages read as not passed.
 *
 * SAFE: Idempotent, and dry-run by default. Pass `--apply` to write.
 *
 * For emulator: pass `--emulator`.
 * For production: set GOOGLE_APPLICATION_CREDENTIALS, or use gcloud ADC.
 */

import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { inferLegacyRejection } from '../src/lib/rejectUpdate'

const apply = process.argv.includes('--apply')
const useEmulator = process.argv.includes('--emulator')
if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'
}

initializeApp({ projectId: 'finance-96f46' })
const db = getFirestore()

const BATCH_LIMIT = 499

async function migrate() {
  console.log(
    `Rejection field migration — ${useEmulator ? 'emulator' : 'production'}, ` +
      `${apply ? 'APPLYING' : 'dry run (pass --apply to write)'}\n`
  )

  const snap = await db
    .collection('requests')
    .where('status', 'in', ['rejected', 'force_rejected'])
    .get()

  console.log(`Found ${snap.size} rejected request(s).\n`)

  const unresolved: string[] = []
  const planned: { id: string; update: Record<string, unknown> }[] = []

  for (const d of snap.docs) {
    const data = d.data()
    const inferred = inferLegacyRejection({
      status: data.status,
      reviewedBy: data.reviewedBy,
      reviewedAt: data.reviewedAt,
      approvedBy: data.approvedBy,
      approvedAt: data.approvedAt,
      forceRejectedBy: data.forceRejectedBy,
      forceRejectedAt: data.forceRejectedAt,
      rejectedBy: data.rejectedBy,
      rejectedAt: data.rejectedAt
    })

    if (!inferred) {
      unresolved.push(d.id)
      continue
    }

    const alreadyClean =
      data.rejectedBy &&
      data.reviewedBy == null &&
      data.approvedBy == null &&
      data.approvalSignature == null &&
      data.forceRejectedBy === undefined
    if (alreadyClean) continue

    const update: Record<string, unknown> = {
      reviewedBy: null,
      reviewedAt: null,
      approvedBy: null,
      approvedAt: null,
      approvalSignature: null,
      rejectedBy: inferred.rejectedBy,
      rejectedAt: inferred.rejectedAt ?? null
    }
    if (data.forceRejectedBy !== undefined) update.forceRejectedBy = FieldValue.delete()
    if (data.forceRejectedAt !== undefined) update.forceRejectedAt = FieldValue.delete()

    planned.push({ id: d.id, update })
    console.log(
      `  ${d.id}  ${data.status}  payee=${data.payee ?? '?'}  ` +
        `rejectedBy=${inferred.rejectedBy.name}`
    )
  }

  console.log(`\n${planned.length} document(s) need updating.`)
  if (unresolved.length > 0) {
    console.log(
      `${unresolved.length} document(s) left untouched — no rejecter could be identified:\n` +
        unresolved.map((id) => `  ${id}`).join('\n')
    )
  }

  if (!apply || planned.length === 0) return

  let batch = db.batch()
  let ops = 0
  for (const { id, update } of planned) {
    batch.update(db.collection('requests').doc(id), update)
    ops++
    if (ops >= BATCH_LIMIT) {
      await batch.commit()
      batch = db.batch()
      ops = 0
    }
  }
  if (ops > 0) await batch.commit()
  console.log(`Updated ${planned.length} document(s).`)
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
