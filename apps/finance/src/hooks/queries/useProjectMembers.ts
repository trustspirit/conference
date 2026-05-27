import { useQuery } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@conference/firebase'
import { useProject } from '../../contexts/ProjectContext'
import { AppUser, Project, ProjectRole } from '../../types'
import { queryKeys } from './queryKeys'

export interface ProjectMember extends AppUser {
  projectRole: ProjectRole
}

export function useProjectMembers() {
  const { currentProject } = useProject()
  const projectId = currentProject?.id
  return useQuery({
    enabled: !!projectId,
    queryKey: queryKeys.projects.members(projectId ?? ''),
    queryFn: async (): Promise<ProjectMember[]> => {
      if (!projectId) return []
      // Fetch project doc directly — avoid depending on potentially-stale context.
      // Without this, an invalidation after a role mutation can refetch with a stale
      // currentProject closure, returning the same old memberRoles.
      const projectSnap = await getDoc(doc(db, 'projects', projectId))
      if (!projectSnap.exists()) return []
      const projectData = projectSnap.data() as Project
      const roles = (projectData.memberRoles ?? {}) as Record<string, ProjectRole>
      const entries = Object.entries(roles)
      const users = await Promise.all(entries.map(async ([uid, projectRole]) => {
        const snap = await getDoc(doc(db, 'users', uid))
        if (!snap.exists()) return null
        return { ...(snap.data() as AppUser), uid, projectRole }
      }))
      return users.filter((u): u is ProjectMember => u !== null)
    }
  })
}
