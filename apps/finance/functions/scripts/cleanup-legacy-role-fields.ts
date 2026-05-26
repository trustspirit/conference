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
  console.log('Cleanup complete.')
}

main().catch((e) => { console.error(e); process.exit(1) })
