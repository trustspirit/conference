import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  deleteField
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import { queryKeys } from './queryKeys'
import type { AppUser, Project } from '../../types'
import { effectiveSystemRole } from '../useProjectRole'

async function fetchProjects(appUser: AppUser): Promise<Project[]> {
  const sys = effectiveSystemRole(appUser)
  // super_admin and admin systemRole see all active projects.
  // (admin systemRole = "can create projects + may be admin in some projects"; we show
  //  all so they can switch between projects they've been assigned to + ones to manage.)
  if (sys === 'super_admin' || sys === 'admin') {
    const q = query(collection(db, 'projects'), where('isActive', '==', true))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Project).filter((p) => p.isActive)
  }

  // Regular members: only projects where they appear in memberRoles.
  // Firestore can't query map keys dynamically across the collection, so we fetch all
  // active projects then filter client-side. N is small in this app (typically <10).
  const q = query(collection(db, 'projects'), where('isActive', '==', true))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Project)
    .filter((p) => p.isActive && p.memberRoles && appUser.uid in p.memberRoles)
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
      const projectSnap = await getDoc(doc(db, 'projects', projectId))
      const memberUids: string[] = projectSnap.exists() ? projectSnap.data().memberUids || [] : []

      const batch = writeBatch(db)
      batch.set(
        doc(db, 'projects', projectId),
        {
          isActive: false,
          deletedAt: serverTimestamp()
        },
        { merge: true }
      )

      // Remove projectId from all members' projectIds
      const memberSnaps = await Promise.all(memberUids.map((uid) => getDoc(doc(db, 'users', uid))))
      memberSnaps.forEach((snap) => {
        if (snap.exists()) {
          const projectIds = (snap.data().projectIds || []).filter((id: string) => id !== projectId)
          batch.update(snap.ref, { projectIds })
        }
      })

      await batch.commit()
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
      const projectSnap = await getDoc(doc(db, 'projects', projectId))
      const memberUids: string[] = projectSnap.exists() ? projectSnap.data().memberUids || [] : []

      const batch = writeBatch(db)
      batch.set(
        doc(db, 'projects', projectId),
        {
          isActive: true,
          deletedAt: deleteField()
        },
        { merge: true }
      )

      // Re-add projectId to all members' projectIds
      const memberSnaps = await Promise.all(memberUids.map((uid) => getDoc(doc(db, 'users', uid))))
      memberSnaps.forEach((snap) => {
        if (snap.exists()) {
          const projectIds: string[] = snap.data().projectIds || []
          if (!projectIds.includes(projectId)) {
            batch.update(snap.ref, { projectIds: [...projectIds, projectId] })
          }
        }
      })

      await batch.commit()
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
      const batch = writeBatch(db)
      const newMemberUids = [
        ...params.currentMemberUids.filter((uid) => !params.removeUids.includes(uid)),
        ...params.addUids
      ]

      // Project doc: keep memberUids in sync AND update memberRoles
      const projectUpdate: Record<string, unknown> = { memberUids: newMemberUids }
      for (const uid of params.addUids) {
        projectUpdate[`memberRoles.${uid}`] = 'user'   // default role; admins can change later
      }
      for (const uid of params.removeUids) {
        projectUpdate[`memberRoles.${uid}`] = deleteField()
      }
      batch.update(doc(db, 'projects', params.projectId), projectUpdate)

      // Maintain legacy projectIds on user docs (unchanged behavior)
      const allUids = [...params.addUids, ...params.removeUids]
      const userSnaps = await Promise.all(allUids.map((uid) => getDoc(doc(db, 'users', uid))))

      params.addUids.forEach((uid, i) => {
        const userSnap = userSnaps[i]
        if (userSnap.exists()) {
          const projectIds = userSnap.data().projectIds || []
          if (!projectIds.includes(params.projectId)) {
            batch.update(doc(db, 'users', uid), { projectIds: [...projectIds, params.projectId] })
          }
        }
      })

      params.removeUids.forEach((uid, i) => {
        const userSnap = userSnaps[params.addUids.length + i]
        if (userSnap.exists()) {
          const projectIds = (userSnap.data().projectIds || []).filter(
            (id: string) => id !== params.projectId
          )
          batch.update(doc(db, 'users', uid), { projectIds })
        }
      })

      await batch.commit()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root() })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
    }
  })
}
