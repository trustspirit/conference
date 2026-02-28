import type { UserRole } from '../types'

const LEADER_ROLES: UserRole[] = ['bishop', 'stake_president']
const ADMIN_ROLES: UserRole[] = ['admin', 'session_leader']

export function isLeaderRole(role: UserRole | null | undefined): boolean {
  return !!role && LEADER_ROLES.includes(role)
}

export function isAdminRole(role: UserRole | null | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role)
}

export function canViewAllApplications(role: UserRole | null | undefined): boolean {
  return isAdminRole(role)
}

export function canViewWardApplications(role: UserRole | null | undefined): boolean {
  return role === 'bishop'
}

export function canViewStakeApplications(role: UserRole | null | undefined): boolean {
  return role === 'stake_president'
}

export function canUpdateApplicationStatus(role: UserRole | null | undefined): boolean {
  return isAdminRole(role)
}

export function canCreateMemo(role: UserRole | null | undefined): boolean {
  return isLeaderRole(role) || isAdminRole(role)
}

export function canManageRoles(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

export function canApproveStakeWardChange(
  approver: { role: UserRole | null | undefined; stake: string; ward: string },
  request: { requestedStake: string; requestedWard: string },
): boolean {
  if (approver.role === 'admin') return true
  // Stake president can approve requests targeting their stake
  if (approver.role === 'stake_president' && approver.stake === request.requestedStake) return true
  // Bishop can approve requests targeting their stake + ward
  if (approver.role === 'bishop' && approver.stake === request.requestedStake && approver.ward === request.requestedWard) return true
  return false
}

export function canDeleteUser(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

export function getDefaultRoute(role: UserRole | null | undefined): string {
  if (isAdminRole(role)) return '/admin/dashboard'
  if (isLeaderRole(role)) return '/leader/dashboard'
  if (role === 'applicant') return '/application'
  return '/login'
}
