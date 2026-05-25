import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { AppUser, Project, ProjectRole, SystemRole } from '../types'
import { Action, can } from '../lib/permissions'

export function effectiveSystemRole(appUser: AppUser | null | undefined): SystemRole | null {
  if (!appUser) return null
  return appUser.systemRole ?? null
}

export function effectiveProjectRole(
  appUser: AppUser | null | undefined,
  project: Project | null | undefined
): ProjectRole | null {
  if (!appUser || !project) return null
  if (effectiveSystemRole(appUser) === 'super_admin') return 'admin'
  return project.memberRoles?.[appUser.uid] ?? null
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
