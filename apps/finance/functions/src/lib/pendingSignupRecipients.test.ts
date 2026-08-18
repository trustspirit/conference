import { describe, it, expect } from 'vitest'
import { resolvePendingSignupRecipients } from './pendingSignupRecipients'

describe('resolvePendingSignupRecipients', () => {
  it('returns every admin of the default project', () => {
    const result = resolvePendingSignupRecipients(
      'p1',
      { a: 'admin', b: 'finance_prep', c: 'admin' },
      ['sa1']
    )
    expect(result.sort()).toEqual(['a', 'c'])
  })

  it('ignores non-admin roles', () => {
    const result = resolvePendingSignupRecipients(
      'p1',
      { a: 'finance_prep', b: 'approver_ops', c: 'executive' },
      ['sa1']
    )
    expect(result).toEqual(['sa1'])
  })

  it('falls back to super admins when the default project has no admin', () => {
    expect(resolvePendingSignupRecipients('p1', {}, ['sa1', 'sa2'])).toEqual(['sa1', 'sa2'])
  })

  it('falls back to super admins when no default project is configured', () => {
    expect(resolvePendingSignupRecipients(null, null, ['sa1'])).toEqual(['sa1'])
  })

  it('falls back to super admins when the default project document is missing', () => {
    expect(resolvePendingSignupRecipients('p1', null, ['sa1'])).toEqual(['sa1'])
  })

  it('returns an empty list when there is nobody to notify', () => {
    expect(resolvePendingSignupRecipients(null, null, [])).toEqual([])
  })

  it('does not fall back when the default project has at least one admin', () => {
    expect(resolvePendingSignupRecipients('p1', { a: 'admin' }, ['sa1'])).toEqual(['a'])
  })

  it('prefers the project-admin branch when a super admin is also a project admin', () => {
    expect(resolvePendingSignupRecipients('p1', { sa1: 'admin' }, ['sa1'])).toEqual(['sa1'])
  })
})
