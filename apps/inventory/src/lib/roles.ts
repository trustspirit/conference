import type { UserRole } from '../types'

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

export function isWriter(role: UserRole | null | undefined): boolean {
  return role === 'writer'
}

export function isViewer(role: UserRole | null | undefined): boolean {
  return role === 'viewer'
}

export function canWrite(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'writer'
}

export function canManageUsers(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

export function canManageProjects(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

export function canMoveItems(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

export function canViewDangling(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

export function getDefaultRoute(role: UserRole | null | undefined): string {
  if (role === 'admin') return '/items'
  if (role === 'writer') return '/items'
  if (role === 'viewer') return '/items'
  return '/login'
}
