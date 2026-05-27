// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  initializeTestEnvironment, RulesTestEnvironment,
  assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'fs'
import { setDoc, doc, deleteDoc, getDoc } from 'firebase/firestore'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'finance-opsbudget-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1', port: 8080,
    },
  })
})
afterAll(async () => { await env.cleanup() })
beforeEach(async () => { await env.clearFirestore() })

async function seed(fn: (db: any) => Promise<void>) {
  await env.withSecurityRulesDisabled(async (ctx) => { await fn(ctx.firestore()) })
}

const projectShell = (memberRoles: Record<string, string>) => ({
  memberRoles, isActive: true, directorApprovalThreshold: 100000,
  budgetConfig: { totalBudget: 0, byCode: {} },
})

const incPayload = (categoryId: string, requestId: string, itemIndex: number) => ({
  categoryId, requestId, itemIndex,
  snapshot: {
    amount: 1000, amountUsd: 0, currency: 'KRW', budgetCode: 5862,
    description: 'x', payee: 'p', date: '2026-05-01',
    session: 'S1', requestStatus: 'approved',
  },
  addedBy: { uid: 'u1', name: 'n', email: 'e' },
  addedAt: new Date(),
})

describe('opsBudget field update on projects/{pid}', () => {
  it('finance_ops can update opsBudget field only', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uF'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uF: 'finance_ops' }))
    })
    const ctx = env.authenticatedContext('uF')
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'projects/p1'),
      { opsBudget: { categories: [], updatedAt: new Date(),
                     updatedBy: { uid: 'uF', name: 'n', email: 'e' } } },
      { merge: true }))
  })

  it('finance_ops cannot update other project fields', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uF'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uF: 'finance_ops' }))
    })
    const ctx = env.authenticatedContext('uF')
    await assertFails(setDoc(doc(ctx.firestore(), 'projects/p1'),
      { name: 'renamed' }, { merge: true }))
  })

  it('finance_prep cannot update opsBudget (not an ops role)', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uP'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uP: 'finance_prep' }))
    })
    const ctx = env.authenticatedContext('uP')
    await assertFails(setDoc(doc(ctx.firestore(), 'projects/p1'),
      { opsBudget: { categories: [], updatedAt: new Date(),
                     updatedBy: { uid: 'uP', name: 'n', email: 'e' } } },
      { merge: true }))
  })

  it('admin can update any field including opsBudget', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uA'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uA: 'admin' }))
    })
    const ctx = env.authenticatedContext('uA')
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'projects/p1'),
      { opsBudget: { categories: [], updatedAt: new Date(),
                     updatedBy: { uid: 'uA', name: 'n', email: 'e' } } },
      { merge: true }))
  })

  it('finance_ops cannot update opsBudget together with another field', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uF'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uF: 'finance_ops' }))
    })
    const ctx = env.authenticatedContext('uF')
    await assertFails(setDoc(doc(ctx.firestore(), 'projects/p1'),
      { name: 'renamed',
        opsBudget: { categories: [], updatedAt: new Date(),
                     updatedBy: { uid: 'uF', name: 'n', email: 'e' } } },
      { merge: true }))
  })
})

describe('opsBudgetInclusions subcollection', () => {
  it('finance_ops can create inclusion with matching deterministic id', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uF'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uF: 'finance_ops' }))
      await setDoc(doc(db, 'requests/req1'), {
        projectId: 'p1', committee: 'operations', status: 'approved',
        requestedBy: { uid: 'someone' }, totalAmount: 1000,
      })
    })
    const ctx = env.authenticatedContext('uF')
    await assertSucceeds(setDoc(
      doc(ctx.firestore(), 'projects/p1/opsBudgetInclusions/req1__0'),
      incPayload('c1', 'req1', 0)
    ))
  })

  it('rejects inclusion when id does not match requestId__itemIndex', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uF'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uF: 'finance_ops' }))
    })
    const ctx = env.authenticatedContext('uF')
    await assertFails(setDoc(
      doc(ctx.firestore(), 'projects/p1/opsBudgetInclusions/forged__0'),
      incPayload('c1', 'req1', 0)
    ))
  })

  it('finance_prep cannot create inclusion', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uP'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uP: 'finance_prep' }))
    })
    const ctx = env.authenticatedContext('uP')
    await assertFails(setDoc(
      doc(ctx.firestore(), 'projects/p1/opsBudgetInclusions/req1__0'),
      incPayload('c1', 'req1', 0)
    ))
  })

  it('any project member can read inclusions', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uU'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uU: 'user' }))
      await setDoc(doc(db, 'projects/p1/opsBudgetInclusions/req1__0'),
        incPayload('c1', 'req1', 0))
    })
    const ctx = env.authenticatedContext('uU')
    await assertSucceeds(getDoc(
      doc(ctx.firestore(), 'projects/p1/opsBudgetInclusions/req1__0')))
  })

  it('approver_ops can delete inclusion', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uAo'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uAo: 'approver_ops' }))
      await setDoc(doc(db, 'projects/p1/opsBudgetInclusions/req1__0'),
        incPayload('c1', 'req1', 0))
    })
    const ctx = env.authenticatedContext('uAo')
    await assertSucceeds(deleteDoc(
      doc(ctx.firestore(), 'projects/p1/opsBudgetInclusions/req1__0')))
  })

  it('update on existing inclusion is rejected (delete+create only)', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uF'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uF: 'finance_ops' }))
      await setDoc(doc(db, 'projects/p1/opsBudgetInclusions/req1__0'),
        incPayload('c1', 'req1', 0))
    })
    const ctx = env.authenticatedContext('uF')
    await assertFails(setDoc(
      doc(ctx.firestore(), 'projects/p1/opsBudgetInclusions/req1__0'),
      { ...incPayload('c1', 'req1', 0), categoryId: 'c2' },
      { merge: true }))
  })

  it('rejects inclusion when source request does not exist', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uF'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uF: 'finance_ops' }))
      // NOTE: no requests/req1 doc
    })
    const ctx = env.authenticatedContext('uF')
    await assertFails(setDoc(
      doc(ctx.firestore(), 'projects/p1/opsBudgetInclusions/req1__0'),
      incPayload('c1', 'req1', 0)
    ))
  })

  it('rejects inclusion when source request belongs to different project', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uF'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uF: 'finance_ops' }))
      await setDoc(doc(db, 'requests/req1'), {
        projectId: 'otherProject', committee: 'operations', status: 'approved',
        requestedBy: { uid: 'x' }, totalAmount: 1,
      })
    })
    const ctx = env.authenticatedContext('uF')
    await assertFails(setDoc(
      doc(ctx.firestore(), 'projects/p1/opsBudgetInclusions/req1__0'),
      incPayload('c1', 'req1', 0)
    ))
  })

  it('rejects inclusion when source request is preparation committee', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uF'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uF: 'finance_ops' }))
      await setDoc(doc(db, 'requests/req1'), {
        projectId: 'p1', committee: 'preparation', status: 'approved',
        requestedBy: { uid: 'x' }, totalAmount: 1,
      })
    })
    const ctx = env.authenticatedContext('uF')
    await assertFails(setDoc(
      doc(ctx.firestore(), 'projects/p1/opsBudgetInclusions/req1__0'),
      incPayload('c1', 'req1', 0)
    ))
  })

  it('rejects inclusion when source request is pending (not approved/settled)', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uF'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uF: 'finance_ops' }))
      await setDoc(doc(db, 'requests/req1'), {
        projectId: 'p1', committee: 'operations', status: 'pending',
        requestedBy: { uid: 'x' }, totalAmount: 1,
      })
    })
    const ctx = env.authenticatedContext('uF')
    await assertFails(setDoc(
      doc(ctx.firestore(), 'projects/p1/opsBudgetInclusions/req1__0'),
      incPayload('c1', 'req1', 0)
    ))
  })

  it('rejects inclusion when itemIndex in payload does not match doc id', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uF'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uF: 'finance_ops' }))
      await setDoc(doc(db, 'requests/req1'), {
        projectId: 'p1', committee: 'operations', status: 'approved',
        requestedBy: { uid: 'x' }, totalAmount: 1,
      })
    })
    const ctx = env.authenticatedContext('uF')
    // doc id is req1__0 but payload says itemIndex=1
    await assertFails(setDoc(
      doc(ctx.firestore(), 'projects/p1/opsBudgetInclusions/req1__0'),
      { ...incPayload('c1', 'req1', 0), itemIndex: 1 }
    ))
  })

  it('session_director can create inclusion (operations-managing role)', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uSD'), { systemRole: 'member' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({ uSD: 'session_director' }))
      await setDoc(doc(db, 'requests/req1'), {
        projectId: 'p1', committee: 'operations', status: 'approved',
        requestedBy: { uid: 'someone' }, totalAmount: 1000,
      })
    })
    const ctx = env.authenticatedContext('uSD')
    await assertSucceeds(setDoc(
      doc(ctx.firestore(), 'projects/p1/opsBudgetInclusions/req1__0'),
      incPayload('c1', 'req1', 0)
    ))
  })

  it('super_admin can read and create inclusion without project membership', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/uSA'), { systemRole: 'super_admin' })
      await setDoc(doc(db, 'projects/p1'),
        projectShell({}))  // empty memberRoles
      await setDoc(doc(db, 'projects/p1/opsBudgetInclusions/req1__0'),
        incPayload('c1', 'req1', 0))
      await setDoc(doc(db, 'requests/req1'), {
        projectId: 'p1', committee: 'operations', status: 'approved',
        requestedBy: { uid: 'someone' }, totalAmount: 1000,
      })
      await setDoc(doc(db, 'requests/req2'), {
        projectId: 'p1', committee: 'operations', status: 'approved',
        requestedBy: { uid: 'someone' }, totalAmount: 1000,
      })
    })
    const ctx = env.authenticatedContext('uSA')
    await assertSucceeds(getDoc(
      doc(ctx.firestore(), 'projects/p1/opsBudgetInclusions/req1__0')))
    await assertSucceeds(setDoc(
      doc(ctx.firestore(), 'projects/p1/opsBudgetInclusions/req2__0'),
      incPayload('c1', 'req2', 0)))
  })
})
