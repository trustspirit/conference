/**
 * Clear Firestore EMULATOR data
 * SAFETY: Only connects to localhost emulator, never production.
 */

import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'
initializeApp({ projectId: 'finance-96f46' })
const db = getFirestore()

async function clear() {
  console.log(`🔧 Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`)
  console.log('🗑️  Clearing...\n')
  for (const name of ['users', 'requests', 'settlements', 'settings']) {
    const snap = await db.collection(name).get()
    const batch = db.batch()
    snap.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
    console.log(`  ✓ ${name}: ${snap.size} deleted`)
  }
  console.log('\n✅ Cleared!')
  process.exit(0)
}
clear().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})
