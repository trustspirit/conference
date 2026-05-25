import { ProjectRole } from '../types'

export type Action =
  | 'request.create'
  | 'request.review'
  | 'request.finalApprove'
  | 'request.settle'
  | 'request.forceReject'
  | 'request.delete'
  | 'project.manageMembers'
  | 'project.editSettings'
  | 'project.viewDashboard'
  | 'settlement.read'
  | 'settlement.create'
  | 'receipts.access'

/**
 * Project-scoped permission matrix. `super_admin` is handled outside this matrix
 * by promoting their effective role to 'admin' on every project.
 */
export const ACTION_PERMISSIONS: Record<Action, ProjectRole[]> = {
  'request.create': [
    'user', 'finance_ops', 'approver_ops', 'finance_prep',
    'approver_prep', 'session_director', 'logistic_admin', 'executive', 'admin'
  ],
  'request.review': ['finance_ops', 'finance_prep', 'admin'],
  'request.finalApprove': [
    'approver_ops', 'approver_prep', 'session_director',
    'logistic_admin', 'executive', 'admin'
  ],
  'request.settle': ['finance_prep', 'admin'],
  'request.forceReject': ['finance_prep', 'admin'],
  'request.delete': [], // super_admin only — handled outside the matrix
  'project.manageMembers': ['admin'],
  'project.editSettings': ['admin'],
  'project.viewDashboard': [
    'admin', 'finance_prep', 'executive',
    'session_director', 'logistic_admin'
  ],
  'settlement.read': [
    'admin', 'finance_prep', 'executive',
    'session_director', 'logistic_admin', 'approver_ops', 'approver_prep'
  ],
  'settlement.create': ['finance_prep', 'admin'],
  'receipts.access': ['admin', 'finance_prep']
}

export function can(role: ProjectRole | null, action: Action): boolean {
  if (role == null) return false
  return ACTION_PERMISSIONS[action].includes(role)
}
