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
      // Prefer memberRoles. If absent (legacy project), fall back to memberUids
      // and resolve each user's role from their user doc (NOT default-to-'user').
      const usingNew = !!currentProject.memberRoles
      const uids = usingNew
        ? Object.keys(currentProject.memberRoles!)
        : ((currentProject as unknown as { memberUids?: string[] }).memberUids ?? [])
      const users = await Promise.all(uids.map(async (uid) => {
        const snap = await getDoc(doc(db, 'users', uid))
        if (!snap.exists()) return null
        const data = snap.data() as AppUser
        const projectRole = usingNew
          ? currentProject.memberRoles![uid]
          : ((data as unknown as { role?: ProjectRole }).role ?? 'user')
        return { ...data, uid, projectRole }
      }))
      return users.filter((u): u is ProjectMember => u !== null)
    }
  })
}
