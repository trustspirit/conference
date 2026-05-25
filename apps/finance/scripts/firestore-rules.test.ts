// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  initializeTestEnvironment, RulesTestEnvironment, assertSucceeds, assertFails
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'fs'
import { setDoc, doc, updateDoc } from 'firebase/firestore'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'finance-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1', port: 8080
    }
  })
})

afterAll(async () => { await env.cleanup() })
beforeEach(async () => { await env.clearFirestore() })

async function seed(env: RulesTestEnvironment, fn: (db: any) => Promise<void>) {
  await env.withSecurityRulesDisabled(async (ctx) => { await fn(ctx.firestore()) })
}

describe('firestore.rules — new-shape', () => {
  it('approver_ops in project A cannot approve request in project B', async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users/userA'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/projA'), {
        memberRoles: { userA: 'approver_ops' }, directorApprovalThreshold: 100000
      })
      await setDoc(doc(db, 'projects/projB'), {
        memberRoles: {}, directorApprovalThreshold: 100000
      })
      await setDoc(doc(db, 'requests/r1'), {
        projectId: 'projB', status: 'reviewed', committee: 'operations',
        totalAmount: 50000, requestedBy: { uid: 'someone' }
      })
    })
    const ctx = env.authenticatedContext('userA')
    await assertFails(updateDoc(doc(ctx.firestore(), 'requests/r1'), {
      status: 'approved', approvedBy: { uid: 'userA' }, approvedAt: new Date(), approvalSignature: 'x'
    }))
  })

  it('approver_ops in project A can approve request in project A', async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users/userA'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/projA'), {
        memberRoles: { userA: 'approver_ops' }, directorApprovalThreshold: 100000
      })
      await setDoc(doc(db, 'requests/r1'), {
        projectId: 'projA', status: 'reviewed', committee: 'operations',
        totalAmount: 50000, requestedBy: { uid: 'someone' }
      })
    })
    const ctx = env.authenticatedContext('userA')
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'requests/r1'), {
      status: 'approved', approvedBy: { uid: 'userA' }, approvedAt: new Date(), approvalSignature: 'x'
    }))
  })

  it('super_admin succeeds even without memberRoles entry', async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users/su'), { systemRole: 'super_admin' })
      await setDoc(doc(db, 'projects/p1'), { memberRoles: {}, directorApprovalThreshold: 100000 })
      await setDoc(doc(db, 'requests/r1'), {
        projectId: 'p1', status: 'reviewed', committee: 'operations',
        totalAmount: 1000, requestedBy: { uid: 'someone' }
      })
    })
    const ctx = env.authenticatedContext('su')
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'requests/r1'), {
      status: 'approved', approvedBy: { uid: 'su' }, approvedAt: new Date(), approvalSignature: 'x'
    }))
  })

  it('project admin can edit memberRoles; other project admin cannot', async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users/adminA'), { systemRole: 'admin' })
      await setDoc(doc(db, 'users/adminB'), { systemRole: 'admin' })
      await setDoc(doc(db, 'projects/projA'), { memberRoles: { adminA: 'admin' } })
      await setDoc(doc(db, 'projects/projB'), { memberRoles: { adminB: 'admin' } })
    })
    await assertSucceeds(updateDoc(
      doc(env.authenticatedContext('adminA').firestore(), 'projects/projA'),
      { 'memberRoles.someuser': 'user' }
    ))
    await assertFails(updateDoc(
      doc(env.authenticatedContext('adminA').firestore(), 'projects/projB'),
      { 'memberRoles.someuser': 'user' }
    ))
  })

  it('regular user cannot edit own systemRole', async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users/u1'), { systemRole: 'member' })
    })
    await assertFails(updateDoc(
      doc(env.authenticatedContext('u1').firestore(), 'users/u1'),
      { systemRole: 'admin' }
    ))
  })
})

describe('firestore.rules — legacy fallback', () => {
  it('legacy role+memberUids still authorizes', async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users/userA'), { role: 'approver_ops' })  // legacy shape
      await setDoc(doc(db, 'projects/projA'), {
        memberUids: ['userA'], directorApprovalThreshold: 100000   // legacy shape
      })
      await setDoc(doc(db, 'requests/r1'), {
        projectId: 'projA', status: 'reviewed', committee: 'operations',
        totalAmount: 50000, requestedBy: { uid: 'someone' }
      })
    })
    await assertSucceeds(updateDoc(
      doc(env.authenticatedContext('userA').firestore(), 'requests/r1'),
      { status: 'approved', approvedBy: { uid: 'userA' }, approvedAt: new Date(), approvalSignature: 'x' }
    ))
  })

  it('legacy: approver_ops in project A cannot approve in project B (no memberUids match)', async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users/userA'), { role: 'approver_ops' })
      await setDoc(doc(db, 'projects/projA'), { memberUids: ['userA'], directorApprovalThreshold: 100000 })
      await setDoc(doc(db, 'projects/projB'), { memberUids: [], directorApprovalThreshold: 100000 })
      await setDoc(doc(db, 'requests/r1'), {
        projectId: 'projB', status: 'reviewed', committee: 'operations',
        totalAmount: 50000, requestedBy: { uid: 'someone' }
      })
    })
    await assertFails(updateDoc(
      doc(env.authenticatedContext('userA').firestore(), 'requests/r1'),
      { status: 'approved', approvedBy: { uid: 'userA' }, approvedAt: new Date(), approvalSignature: 'x' }
    ))
  })
})
