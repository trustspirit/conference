import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  deleteField
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import { queryKeys } from './queryKeys'
import type { AppUser, Project } from '../../types'
import { effectiveSystemRole } from '../useProjectRole'

async function fetchProjects(appUser: AppUser): Promise<Project[]> {
  const sys = effectiveSystemRole(appUser)
  const q = query(collection(db, 'projects'), where('isActive', '==', true))
  const snap = await getDocs(q)
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Project)

  // super_admin: system operator sees every active project for oversight.
  if (sys === 'super_admin') return all

  // Everyone else (including systemRole=admin) only sees projects they belong to.
  // Firestore can't query map keys dynamically across the collection, so filter client-side.
  return all.filter((p) => p.memberRoles && appUser.uid in p.memberRoles)
}

export function useProjects(appUser: AppUser | null) {
  return useQuery({
    queryKey: appUser ? queryKeys.projects.all(appUser.uid) : ['projects', 'none'],
    queryFn: () => fetchProjects(appUser!),
    enabled: !!appUser
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { project: Omit<Project, 'id'>; projectId: string }) => {
      await setDoc(doc(db, 'projects', params.projectId), params.project)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root() })
    }
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { projectId: string; data: Partial<Project> }) => {
      await setDoc(doc(db, 'projects', params.projectId), params.data, { merge: true })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root() })
    }
  })
}

export function useDeletedProjects(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.projects.deleted(),
    queryFn: async () => {
      const q = query(collection(db, 'projects'), where('isActive', '==', false))
      const snap = await getDocs(q)
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Project).filter((p) => p.deletedAt)
    },
    enabled: options?.enabled
  })
}

export function useSoftDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      await setDoc(
        doc(db, 'projects', projectId),
        { isActive: false, deletedAt: serverTimestamp() },
        { merge: true }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root() })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
    }
  })
}

export function useRestoreProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      await setDoc(
        doc(db, 'projects', projectId),
        { isActive: true, deletedAt: deleteField() },
        { merge: true }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root() })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
    }
  })
}

export function useUpdateProjectMembers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      projectId: string
      addUids: string[]
      removeUids: string[]
      currentMemberUids: string[]
    }) => {
      const projectUpdate: Record<string, unknown> = {}
      for (const uid of params.addUids) {
        projectUpdate[`memberRoles.${uid}`] = 'user' // default role; admins can change later
      }
      for (const uid of params.removeUids) {
        projectUpdate[`memberRoles.${uid}`] = deleteField()
      }
      if (Object.keys(projectUpdate).length > 0) {
        await updateDoc(doc(db, 'projects', params.projectId), projectUpdate)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root() })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
    }
  })
}
