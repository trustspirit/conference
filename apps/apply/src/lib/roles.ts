import type { UserRole } from '../types'

const LEADER_ROLES: UserRole[] = ['bishop', 'stake_president']
const ADMIN_ROLES: UserRole[] = ['admin', 'session_leader']

export function isLeaderRole(role: UserRole | null | undefined): boolean {
  return !!role && LEADER_ROLES.includes(role)
}

export function isAdminRole(role: UserRole | null | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role)
}

export function isAdminOrSessionLeader(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'session_leader'
}

export function canViewAllApplications(role: UserRole | null | undefined): boolean {
  return isAdminOrSessionLeader(role)
}

export function canViewWardApplications(role: UserRole | null | undefined): boolean {
  return role === 'bishop'
}

export function canViewStakeApplications(role: UserRole | null | undefined): boolean {
  return role === 'stake_president'
}

export function canUpdateApplicationStatus(role: UserRole | null | undefined): boolean {
  return isAdminOrSessionLeader(role)
}

export function canCreateMemo(role: UserRole | null | undefined): boolean {
  return isLeaderRole(role) || isAdminRole(role)
}

export function canManageRoles(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

export function canApproveStakeWardChange(
  approverRole: UserRole | null | undefined,
  requestRole: UserRole,
): boolean {
  if (approverRole === 'admin') return true
  if (approverRole === 'stake_president' && requestRole === 'bishop') return true
  return false
}

export function canDeleteUser(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

export function getDefaultRoute(role: UserRole | null | undefined): string {
  if (isAdminOrSessionLeader(role)) return '/admin/dashboard'
  if (isLeaderRole(role)) return '/leader/dashboard'
  if (role === 'applicant') return '/application'
  return '/login'
}
