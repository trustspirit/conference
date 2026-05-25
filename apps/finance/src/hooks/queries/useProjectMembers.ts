import { useQuery } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@conference/firebase'
import { useProject } from '../../contexts/ProjectContext'
import { AppUser, ProjectRole } from '../../types'
import { queryKeys } from './queryKeys'

export interface ProjectMember extends AppUser {
  projectRole: ProjectRole
}

export function useProjectMembers() {
  const { currentProject } = useProject()
  return useQuery({
    enabled: !!currentProject,
    queryKey: queryKeys.projects.members(currentProject?.id ?? ''),
    queryFn: async (): Promise<ProjectMember[]> => {
      if (!currentProject) return []
      // Prefer memberRoles, fall back to memberUids during dual-shape phase.
      const map = currentProject.memberRoles
        ?? Object.fromEntries(
          ((currentProject as unknown as { memberUids?: string[] }).memberUids ?? [])
            .map((uid) => [uid, 'user' as ProjectRole])
        )
      const entries = Object.entries(map) as [string, ProjectRole][]
      const users = await Promise.all(entries.map(async ([uid, projectRole]) => {
        const snap = await getDoc(doc(db, 'users', uid))
        if (!snap.exists()) return null
        return { ...(snap.data() as AppUser), uid, projectRole }
      }))
      return users.filter((u): u is ProjectMember => u !== null)
    }
  })
}
