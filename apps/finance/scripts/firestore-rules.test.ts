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

  it('non-member CANNOT create a request in a project they do not belong to', async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users/userX'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/projA'), {
        memberRoles: {},   // userX not in
        directorApprovalThreshold: 100000
      })
    })
    const ctx = env.authenticatedContext('userX')
    await assertFails(setDoc(doc(ctx.firestore(), 'requests/r-new'), {
      projectId: 'projA', status: 'pending', committee: 'operations',
      totalAmount: 1000, requestedBy: { uid: 'userX' },
      approvedBy: null, approvalSignature: null, reviewedBy: null
    }))
  })

  it('non-executive director CANNOT approve another director\'s request', async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users/dirA'), { systemRole: 'member' })
      await setDoc(doc(db, 'users/dirB'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'), {
        memberRoles: { dirA: 'session_director', dirB: 'session_director' },
        directorApprovalThreshold: 100000
      })
      await setDoc(doc(db, 'requests/r1'), {
        projectId: 'p1', status: 'reviewed', committee: 'operations',
        totalAmount: 50000, requestedBy: { uid: 'dirA' }
      })
    })
    // dirB (also session_director) tries to approve dirA's request → should DENY
    const ctx = env.authenticatedContext('dirB')
    await assertFails(updateDoc(doc(ctx.firestore(), 'requests/r1'), {
      status: 'approved', approvedBy: { uid: 'dirB' }, approvedAt: new Date(), approvalSignature: 'x'
    }))
  })

  it('executive CAN approve a director\'s request', async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users/dirA'), { systemRole: 'member' })
      await setDoc(doc(db, 'users/exec'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'), {
        memberRoles: { dirA: 'session_director', exec: 'executive' },
        directorApprovalThreshold: 100000
      })
      await setDoc(doc(db, 'requests/r1'), {
        projectId: 'p1', status: 'reviewed', committee: 'operations',
        totalAmount: 50000, requestedBy: { uid: 'dirA' }
      })
    })
    const ctx = env.authenticatedContext('exec')
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'requests/r1'), {
      status: 'approved', approvedBy: { uid: 'exec' }, approvedAt: new Date(), approvalSignature: 'x'
    }))
  })
})
