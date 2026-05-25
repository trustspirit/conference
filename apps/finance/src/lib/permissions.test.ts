import { describe, it, expect } from 'vitest'
import { can, ACTION_PERMISSIONS } from './permissions'

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
