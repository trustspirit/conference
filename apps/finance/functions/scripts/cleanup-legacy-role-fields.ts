/**
 * Phase H cleanup — permanently deletes legacy fields from Firestore:
 *   users/{uid}.role, users/{uid}.projectIds, projects/{id}.memberUids
 *
 * Prerequisite: Phase G code must be deployed to production. Verify by:
 *   1. New sign-ups should not create users with `role`/`projectIds` fields.
 *   2. New project creation should not write `memberUids`.
 *   If either still happens, this cleanup will be undone by the next write.
 *
 * Do NOT re-run `migrate-to-per-project-roles.ts` after this script. That script
 * reads legacy fields to populate the new shape; after this cleanup legacy fields
 * are gone, so a re-run would be a no-op at best (and confusing).
 *
 * Usage:
 *   pnpm --filter @conference/finance cleanup:legacy-roles            # dry-run
 *   pnpm --filter @conference/finance cleanup:legacy-roles:commit     # apply
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const DRY_RUN = !process.argv.includes('--commit')
const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'finance-96f46'

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID })
const db = getFirestore()

async function main() {
  console.log(`Phase H cleanup ${DRY_RUN ? 'DRY-RUN' : 'COMMIT'} against ${PROJECT_ID}`)

  const usersSnap = await db.collection('users').get()
  const projectsSnap = await db.collection('projects').get()

  // Identify which docs have legacy fields
  const usersToClean = usersSnap.docs.filter((d) => {
    const data = d.data()
    return data.role !== undefined || data.projectIds !== undefined
  })
  const projectsToClean = projectsSnap.docs.filter((d) => d.data().memberUids !== undefined)

  console.log(`\nUsers with legacy fields: ${usersToClean.length}/${usersSnap.size}`)
  for (const d of usersToClean) {
    const data = d.data()
    const fields: string[] = []
    if (data.role !== undefined) fields.push('role')
    if (data.projectIds !== undefined) fields.push('projectIds')
    console.log(`  ${d.id}: will delete [${fields.join(', ')}]`)
  }

  console.log(`\nProjects with legacy memberUids: ${projectsToClean.length}/${projectsSnap.size}`)
  for (const d of projectsToClean) {
    console.log(`  ${d.id}: will delete memberUids`)
  }

  if (DRY_RUN) {
    console.log('\nDRY-RUN complete. Re-run with --commit to apply.')
    return
  }

  const writer = db.bulkWriter()
  let failCount = 0
  writer.onWriteError((error) => {
    // BulkWriter retries automatically; this handler logs each failure and decides
    // whether to keep retrying. Default retry policy is 5 attempts with exponential backoff.
    if (error.failedAttempts >= 5) {
      console.error(
        `Write FAILED permanently for ${error.documentRef.path}: ${error.message}`
      )
      failCount++
      return false // give up
    }
    return true // retry
  })

  for (const d of usersToClean) {
    const update: Record<string, unknown> = {}
    const data = d.data()
    if (data.role !== undefined) update.role = FieldValue.delete()
    if (data.projectIds !== undefined) update.projectIds = FieldValue.delete()
    writer.update(d.ref, update)
  }
  for (const d of projectsToClean) {
    writer.update(d.ref, { memberUids: FieldValue.delete() })
  }
  await writer.close()
  console.log(`\nCommit complete. ${failCount} permanent write failure(s).`)

  // Post-write verification: refetch and confirm no legacy fields remain.
  console.log('\nVerifying...')
  const verifyUsers = await db.collection('users').get()
  const remainingUsers = verifyUsers.docs.filter(
    (d) => d.data().role !== undefined || d.data().projectIds !== undefined
  )
  const verifyProjects = await db.collection('projects').get()
  const remainingProjects = verifyProjects.docs.filter((d) => d.data().memberUids !== undefined)

  if (remainingUsers.length === 0 && remainingProjects.length === 0 && failCount === 0) {
    console.log('✓ Verification passed. No legacy fields remain.')
  } else {
    console.warn(
      `⚠️ Verification: ${remainingUsers.length} users + ${remainingProjects.length} projects ` +
        `still have legacy fields. Re-run the script (it is idempotent).`
    )
    if (remainingUsers.length > 0) {
      console.warn('  Affected users:', remainingUsers.map((d) => d.id).join(', '))
    }
    if (remainingProjects.length > 0) {
      console.warn('  Affected projects:', remainingProjects.map((d) => d.id).join(', '))
    }
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
