import { describe, it, expect } from 'vitest'
import { can } from './permissions'

describe('ACTION_PERMISSIONS', () => {
  it('user can submit own request', () => {
    expect(can('user', 'request.create')).toBe(true)
  })
  it('user cannot review', () => {
    expect(can('user', 'request.review')).toBe(false)
  })
  it('finance_ops reviews operations only', () => {
    expect(can('finance_ops', 'request.review')).toBe(true)
  })
  it('approver_ops can final-approve', () => {
    expect(can('approver_ops', 'request.finalApprove')).toBe(true)
  })
  it('admin can manage project members', () => {
    expect(can('admin', 'project.manageMembers')).toBe(true)
  })
  it('user cannot manage project members', () => {
    expect(can('user', 'project.manageMembers')).toBe(false)
  })
  it('only admin can edit project settings', () => {
    expect(can('admin', 'project.editSettings')).toBe(true)
    expect(can('finance_prep', 'project.editSettings')).toBe(false)
  })
})

describe('opsBudget.access action', () => {
  it('finance_ops can access', () => {
    expect(can('finance_ops', 'opsBudget.access')).toBe(true)
  })
  it('approver_ops can access', () => {
    expect(can('approver_ops', 'opsBudget.access')).toBe(true)
  })
  it('session_director can access', () => {
    expect(can('session_director', 'opsBudget.access')).toBe(true)
  })
  it('admin can access', () => {
    expect(can('admin', 'opsBudget.access')).toBe(true)
  })
  it('finance_prep cannot access', () => {
    expect(can('finance_prep', 'opsBudget.access')).toBe(false)
  })
  it('user cannot access', () => {
    expect(can('user', 'opsBudget.access')).toBe(false)
  })
  it('executive cannot access (operations-only feature)', () => {
    expect(can('executive', 'opsBudget.access')).toBe(false)
  })
  it('logistic_admin cannot access', () => {
    expect(can('logistic_admin', 'opsBudget.access')).toBe(false)
  })
})
