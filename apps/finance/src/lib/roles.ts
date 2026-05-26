import { ProjectRole, Committee, RequestStatus } from '../types'

/** Default amount threshold: requests above this require director/executive/admin approval */
export const DEFAULT_APPROVAL_THRESHOLD = 600000

/** Check if role has admin-level privileges */
export function isAdmin(role: ProjectRole): boolean {
  return role === 'admin'
}

/** Can review requests (finance_ops for operations, finance_prep for all) */
export function canReview(role: ProjectRole): boolean {
  return ['finance_ops', 'finance_prep', 'admin'].includes(role)
}

/** Can review a specific committee's requests */
export function canReviewCommittee(role: ProjectRole, committee: Committee): boolean {
  if (isAdmin(role) || role === 'finance_prep') return true
  if (role === 'finance_ops' && committee === 'operations') return true
  return false
}

/** Can final-approve requests (reviewed->approved) */
export function canFinalApprove(role: ProjectRole): boolean {
  return [
    'approver_ops',
    'approver_prep',
    'session_director',
    'logistic_admin',
    'executive',
    'admin'
  ].includes(role)
}

/** Can final-approve a specific committee's requests (ignoring amount) */
export function canFinalApproveCommittee(role: ProjectRole, committee: Committee): boolean {
  if (isAdmin(role) || role === 'executive') return true
  if (role === 'session_director' && committee === 'operations') return true
  if (role === 'logistic_admin' && committee === 'preparation') return true
  if (role === 'approver_ops' && committee === 'operations') return true
  if (role === 'approver_prep' && committee === 'preparation') return true
  return false
}

/**
 * Can final-approve a specific request considering both committee and amount.
 * `amountUsd > 0` is treated as above-threshold (the KRW threshold cannot evaluate USD safely),
 * so any USD-containing request requires director/executive approval.
 */
export function canFinalApproveRequest(
  role: ProjectRole,
  committee: Committee,
  amount: number,
  threshold = DEFAULT_APPROVAL_THRESHOLD,
  amountUsd = 0
): boolean {
  if (!canFinalApproveCommittee(role, committee)) return false
  const aboveKrwThreshold = threshold > 0 && amount > threshold
  if (aboveKrwThreshold || amountUsd > 0) {
    return (
      isAdmin(role) ||
      role === 'executive' ||
      role === 'session_director' ||
      role === 'logistic_admin'
    )
  }
  return true
}

/** Can final-approve a request filed by a director (session_director/logistic_admin) — only executive/admin */
export function canApproveDirectorRequest(role: ProjectRole): boolean {
  return isAdmin(role) || role === 'executive'
}

/** Can force-reject approved requests (finance_prep, admin only) */
export function canForceReject(role: ProjectRole): boolean {
  return role === 'finance_prep' || isAdmin(role)
}

/** Can see a committee's requests in admin views (reviewer or final approver) */
export function canSeeCommitteeRequests(role: ProjectRole, committee: Committee): boolean {
  return canReviewCommittee(role, committee) || canFinalApproveCommittee(role, committee)
}

/** Can access dashboard and budget settings */
export function canAccessDashboard(role: ProjectRole): boolean {
  return (
    isAdmin(role) ||
    role === 'finance_prep' ||
    role === 'executive' ||
    role === 'session_director' ||
    role === 'logistic_admin'
  )
}

/** Can access receipts management */
export function canAccessReceipts(role: ProjectRole): boolean {
  return isAdmin(role) || role === 'finance_prep'
}

/** Can view user directory */
export function canManageUsers(role: ProjectRole): boolean {
  return isAdmin(role)
}

/** Can process settlements (create, settle) */
export function canAccessSettlement(role: ProjectRole): boolean {
  return isAdmin(role) || role === 'finance_prep'
}

/** Can view settlement list and reports (read-only) */
export function canAccessSettlementRead(role: ProjectRole): boolean {
  return [
    'admin',
    'finance_prep',
    'executive',
    'session_director',
    'logistic_admin',
    'approver_ops',
    'approver_prep'
  ].includes(role)
}

/** Can access admin menu (any non-user role) */
export function isStaff(role: ProjectRole): boolean {
  return role !== 'user'
}

/** All roles for dropdown (super_admin is NOT included — only settable via Firestore) */
export const ALL_ROLES: ProjectRole[] = [
  'user',
  'finance_ops',
  'approver_ops',
  'finance_prep',
  'approver_prep',
  'session_director',
  'logistic_admin',
  'executive',
  'admin'
]

/** Can create vendor requests (prep committee all + ops finance/approver + admins) */
export function canCreateVendorRequest(role: ProjectRole, committee?: Committee): boolean {
  if (isAdmin(role)) return true
  if (
    ['finance_prep', 'approver_prep', 'logistic_admin', 'finance_ops', 'approver_ops'].includes(
      role
    )
  )
    return true
  // General users in preparation committee can also create vendor requests
  if (role === 'user' && committee === 'preparation') return true
  return false
}

/** Statuses a super_admin may permanently delete (initial/terminal states only) */
export const DELETABLE_STATUSES: readonly RequestStatus[] = [
  'pending',
  'rejected',
  'cancelled',
  'force_rejected'
] as const
