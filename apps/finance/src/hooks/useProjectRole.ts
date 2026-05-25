import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { AppUser, Project, ProjectRole, SystemRole } from '../types'
import { Action, can } from '../lib/permissions'

export function effectiveSystemRole(appUser: AppUser | null | undefined): SystemRole | null {
  if (!appUser) return null
  if (appUser.systemRole) return appUser.systemRole
  // Legacy fallback
  const legacy = (appUser as unknown as { role?: string }).role
  if (legacy === 'super_admin') return 'super_admin'
  if (legacy === 'admin') return 'admin'
  return 'member'
}

export function effectiveProjectRole(
  appUser: AppUser | null | undefined,
  project: Project | null | undefined
): ProjectRole | null {
  if (!appUser || !project) return null
  if (effectiveSystemRole(appUser) === 'super_admin') return 'admin'

  if (project.memberRoles) {
    return project.memberRoles[appUser.uid] ?? null
  }

  // Legacy fallback: memberUids + global role
  const legacyMembers = (project as unknown as { memberUids?: string[] }).memberUids ?? []
  if (!legacyMembers.includes(appUser.uid)) return null
  const legacy = (appUser as unknown as { role?: string }).role
  return (legacy as ProjectRole) ?? 'user'
}

export function useProjectRole(): ProjectRole | null {
  const { appUser } = useAuth()
  const { currentProject } = useProject()
  return effectiveProjectRole(appUser, currentProject)
}

export function useCan(action: Action): boolean {
  const role = useProjectRole()
  return can(role, action)
}
