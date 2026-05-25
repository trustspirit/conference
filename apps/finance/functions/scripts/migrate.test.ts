import { describe, it, expect, vi } from 'vitest'

// Stub firebase-admin so import of the migration module doesn't try to initialize a real app.
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  applicationDefault: vi.fn(() => ({}))
}))
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: vi.fn(), doc: vi.fn(), bulkWriter: vi.fn() }))
}))

import { computeMigration } from './migrate-to-per-project-roles'

describe('computeMigration', () => {
  it('maps roles 1:1 and skips super_admin in memberRoles', () => {
    const users = new Map<string, { role?: string }>([
      ['u1', { role: 'approver_ops' }],
      ['u2', { role: 'super_admin' }],
      ['u3', { role: 'user' }]
    ])
    const projects = new Map<string, { memberUids?: string[] }>([
      ['p1', { memberUids: ['u1', 'u2', 'u3'] }],
      ['p2', { memberUids: ['u1'] }]
    ])
    const r = computeMigration(users, projects)
    expect(r.userUpdates.get('u1')).toEqual({ systemRole: 'member', assignedProjectCount: 2 })
    expect(r.userUpdates.get('u2')).toEqual({ systemRole: 'super_admin', assignedProjectCount: 0 })
    expect(r.userUpdates.get('u3')).toEqual({ systemRole: 'member', assignedProjectCount: 1 })
    expect(r.projectUpdates.get('p1')).toEqual({ u1: 'approver_ops', u3: 'user' })
    expect(r.projectUpdates.get('p2')).toEqual({ u1: 'approver_ops' })
  })

  it('is idempotent — running twice yields the same result', () => {
    const users = new Map<string, { role?: string }>([['u1', { role: 'admin' }]])
    const projects = new Map<string, { memberUids?: string[]; memberRoles?: Record<string, string> }>([
      ['p1', { memberUids: ['u1'], memberRoles: { u1: 'admin' } }]
    ])
    const a = computeMigration(users, projects)
    const b = computeMigration(users, projects)
    expect(b).toEqual(a)
  })

  it('preserves pre-existing memberRoles entries', () => {
    const users = new Map<string, { role?: string }>([['u1', { role: 'user' }]])
    const projects = new Map<string, { memberUids?: string[]; memberRoles?: Record<string, string> }>([
      ['p1', { memberUids: ['u1'], memberRoles: { u1: 'executive' } }]
    ])
    const r = computeMigration(users, projects)
    expect(r.projectUpdates.get('p1')).toEqual({ u1: 'executive' })
  })
})
