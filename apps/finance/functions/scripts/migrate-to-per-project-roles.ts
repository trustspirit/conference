import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const DRY_RUN = !process.argv.includes('--commit')
const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'finance-96f46'

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID })
const db = getFirestore()

type LegacyUserRole =
  | 'user' | 'finance_ops' | 'approver_ops' | 'finance_prep'
  | 'approver_prep' | 'session_director' | 'logistic_admin'
  | 'executive' | 'admin' | 'super_admin'

function toSystemRole(role: LegacyUserRole | undefined): 'super_admin' | 'admin' | 'member' {
  if (role === 'super_admin') return 'super_admin'
  if (role === 'admin') return 'admin'
  return 'member'
}

/** Pure mapping logic — exported for unit testing. */
export function computeMigration(
  users: Map<string, { role?: string }>,
  projects: Map<string, { memberUids?: string[]; memberRoles?: Record<string, string> }>
): {
  userUpdates: Map<string, { systemRole: 'super_admin' | 'admin' | 'member'; assignedProjectCount: number }>
  projectUpdates: Map<string, Record<string, string>>
} {
  const projectUpdates = new Map<string, Record<string, string>>()
  const counts = new Map<string, number>()

  for (const [pid, data] of projects) {
    const uids = data.memberUids ?? []
    const memberRoles: Record<string, string> = { ...(data.memberRoles ?? {}) }
    for (const uid of uids) {
      const u = users.get(uid)
      if (!u) continue
      const role = u.role as LegacyUserRole | undefined
      if (!role || role === 'super_admin') continue
      if (!(uid in memberRoles)) memberRoles[uid] = role
    }
    projectUpdates.set(pid, memberRoles)
    for (const uid of Object.keys(memberRoles)) {
      counts.set(uid, (counts.get(uid) ?? 0) + 1)
    }
  }

  const userUpdates = new Map<string, { systemRole: 'super_admin' | 'admin' | 'member'; assignedProjectCount: number }>()
  for (const [uid, u] of users) {
    userUpdates.set(uid, {
      systemRole: toSystemRole(u.role as LegacyUserRole | undefined),
      assignedProjectCount: counts.get(uid) ?? 0
    })
  }

  return { userUpdates, projectUpdates }
}

async function main() {
  console.log(`Migration ${DRY_RUN ? 'DRY-RUN' : 'COMMIT'} against ${PROJECT_ID}`)

  const usersSnap = await db.collection('users').get()
  const projectsSnap = await db.collection('projects').get()

  const users = new Map(usersSnap.docs.map((d) => [d.id, d.data()]))
  const projects = new Map(projectsSnap.docs.map((d) => [d.id, d.data() as { memberUids?: string[]; memberRoles?: Record<string, string> }]))

  const { userUpdates, projectUpdates } = computeMigration(users, projects)

  console.log('--- USERS ---')
  for (const [uid, u] of userUpdates) {
    console.log(`  ${uid}: systemRole=${u.systemRole}, assignedProjectCount=${u.assignedProjectCount}`)
  }
  console.log('--- PROJECTS ---')
  for (const [pid, map] of projectUpdates) {
    console.log(`  ${pid}: ${JSON.stringify(map)}`)
  }

  if (DRY_RUN) {
    console.log('\nDRY-RUN complete. Re-run with --commit to apply.')
    return
  }

  const writer = db.bulkWriter()
  for (const [uid, u] of userUpdates) {
    writer.set(db.doc(`users/${uid}`), u, { merge: true })
  }
  for (const [pid, map] of projectUpdates) {
    writer.set(db.doc(`projects/${pid}`), { memberRoles: map }, { merge: true })
  }
  await writer.close()
  console.log('Commit complete.')
}

if (process.argv[1]?.endsWith('migrate-to-per-project-roles.ts')) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
