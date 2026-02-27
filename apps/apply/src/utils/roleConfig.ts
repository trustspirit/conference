import type { UserRole } from '../types'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'roles.admin',
  session_leader: 'roles.sessionLeader',
  stake_president: 'roles.stakePresident',
  bishop: 'roles.bishop',
  applicant: 'roles.applicant',
}

// Sort order: higher = more senior
export const ROLE_SORT_ORDER: Record<UserRole, number> = {
  admin: 5,
  session_leader: 4,
  stake_president: 3,
  bishop: 2,
  applicant: 1,
}

export function sortByRole<T extends { role: UserRole | null }>(users: T[]): T[] {
  return [...users].sort((a, b) => {
    const orderA = a.role ? ROLE_SORT_ORDER[a.role] : 0
    const orderB = b.role ? ROLE_SORT_ORDER[b.role] : 0
    return orderB - orderA
  })
}
