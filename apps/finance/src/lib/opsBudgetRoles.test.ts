import { describe, it, expect } from 'vitest'
import {
  canViewOpsBudgetTab,
  canViewProjectOverviewTab,
  canManageOpsBudget
} from './opsBudgetRoles'

describe('canViewOpsBudgetTab', () => {
  it('admin true', () => { expect(canViewOpsBudgetTab('admin')).toBe(true) })
  it('finance_ops true', () => { expect(canViewOpsBudgetTab('finance_ops')).toBe(true) })
  it('approver_ops true', () => { expect(canViewOpsBudgetTab('approver_ops')).toBe(true) })
  it('session_director true', () => { expect(canViewOpsBudgetTab('session_director')).toBe(true) })
  it('finance_prep false', () => { expect(canViewOpsBudgetTab('finance_prep')).toBe(false) })
  it('executive false', () => { expect(canViewOpsBudgetTab('executive')).toBe(false) })
  it('logistic_admin false', () => { expect(canViewOpsBudgetTab('logistic_admin')).toBe(false) })
  it('user false', () => { expect(canViewOpsBudgetTab('user')).toBe(false) })
  it('null false', () => { expect(canViewOpsBudgetTab(null)).toBe(false) })
})

describe('canViewProjectOverviewTab', () => {
  it('admin true', () => { expect(canViewProjectOverviewTab('admin')).toBe(true) })
  it('finance_prep true', () => { expect(canViewProjectOverviewTab('finance_prep')).toBe(true) })
  it('executive true', () => { expect(canViewProjectOverviewTab('executive')).toBe(true) })
  it('session_director true', () => { expect(canViewProjectOverviewTab('session_director')).toBe(true) })
  it('logistic_admin true', () => { expect(canViewProjectOverviewTab('logistic_admin')).toBe(true) })
  it('finance_ops false', () => { expect(canViewProjectOverviewTab('finance_ops')).toBe(false) })
  it('approver_ops false', () => { expect(canViewProjectOverviewTab('approver_ops')).toBe(false) })
  it('user false', () => { expect(canViewProjectOverviewTab('user')).toBe(false) })
  it('null false', () => { expect(canViewProjectOverviewTab(null)).toBe(false) })
})

describe('canManageOpsBudget', () => {
  it('matches canViewOpsBudgetTab (no view/edit split in v1)', () => {
    const roles = [
      'admin','finance_ops','approver_ops','session_director',
      'finance_prep','executive','logistic_admin','user'
    ] as const
    for (const r of roles) {
      expect(canManageOpsBudget(r)).toBe(canViewOpsBudgetTab(r))
    }
  })
})
