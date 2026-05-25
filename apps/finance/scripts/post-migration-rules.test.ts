import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  initializeTestEnvironment, RulesTestEnvironment, assertSucceeds, assertFails
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'fs'
import { setDoc, doc, updateDoc } from 'firebase/firestore'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'finance-postmig-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1', port: 8080
    }
  })
})
afterAll(async () => { await env.cleanup() })
beforeEach(async () => { await env.clearFirestore() })

async function seedPostMig(db: any) {
  // Post-migration shape — both legacy and new fields present
  await setDoc(doc(db, 'users/mock-admin-001'), {
    role: 'admin', systemRole: 'admin', projectIds: ['finance-default'], assignedProjectCount: 1
  })
  await setDoc(doc(db, 'users/mock-approver-001'), {
    role: 'approver_ops', systemRole: 'member', projectIds: ['finance-default'], assignedProjectCount: 1
  })
  await setDoc(doc(db, 'users/mock-user-001'), {
    role: 'user', systemRole: 'member', projectIds: ['finance-default'], assignedProjectCount: 1
  })
  await setDoc(doc(db, 'projects/finance-default'), {
    memberUids: ['mock-admin-001', 'mock-approver-001', 'mock-user-001'],
    memberRoles: {
      'mock-admin-001': 'admin',
      'mock-approver-001': 'approver_ops',
      'mock-user-001': 'user'
    },
    directorApprovalThreshold: 600000
  })
  // Another project where approver_ops is NOT a member (cross-project leak test)
  await setDoc(doc(db, 'projects/other-project'), {
    memberUids: [], memberRoles: {}, directorApprovalThreshold: 600000
  })
  await setDoc(doc(db, 'requests/r1'), {
    projectId: 'finance-default', status: 'reviewed', committee: 'operations',
    totalAmount: 50000, requestedBy: { uid: 'mock-user-001' }
  })
  await setDoc(doc(db, 'requests/r2'), {
    projectId: 'other-project', status: 'reviewed', committee: 'operations',
    totalAmount: 50000, requestedBy: { uid: 'someone' }
  })
}

describe('Post-migration rules behave correctly', () => {
  it('approver_ops in finance-default CAN approve own-project request', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await seedPostMig(ctx.firestore()) })
    const ctx = env.authenticatedContext('mock-approver-001')
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'requests/r1'), {
      status: 'approved', approvedBy: { uid: 'mock-approver-001' }, approvedAt: new Date(), approvalSignature: 'x'
    }))
  })

  it('approver_ops CANNOT approve a request in other-project (cross-project leak prevention)', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await seedPostMig(ctx.firestore()) })
    const ctx = env.authenticatedContext('mock-approver-001')
    await assertFails(updateDoc(doc(ctx.firestore(), 'requests/r2'), {
      status: 'approved', approvedBy: { uid: 'mock-approver-001' }, approvedAt: new Date(), approvalSignature: 'x'
    }))
  })

  it('user CANNOT approve own-project request', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await seedPostMig(ctx.firestore()) })
    const ctx = env.authenticatedContext('mock-user-001')
    await assertFails(updateDoc(doc(ctx.firestore(), 'requests/r1'), {
      status: 'approved', approvedBy: { uid: 'mock-user-001' }, approvedAt: new Date(), approvalSignature: 'x'
    }))
  })

  it('admin CAN edit memberRoles in own project', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await seedPostMig(ctx.firestore()) })
    const ctx = env.authenticatedContext('mock-admin-001')
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'projects/finance-default'), {
      'memberRoles.newuser': 'user'
    }))
  })

  it('admin CANNOT edit memberRoles of another project (where not admin)', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await seedPostMig(ctx.firestore()) })
    const ctx = env.authenticatedContext('mock-admin-001')
    await assertFails(updateDoc(doc(ctx.firestore(), 'projects/other-project'), {
      'memberRoles.x': 'user'
    }))
  })
})
