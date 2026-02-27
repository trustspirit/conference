import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@conference/firebase'
import type { AppUser, UserRole, LeaderStatus } from '../../types'
import { queryKeys } from './queryKeys'

function mapUser(id: string, data: Record<string, unknown>): AppUser {
  return { ...data, uid: id } as AppUser
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: async () => {
      const q = query(collection(db, 'users'), orderBy('name'))
      const snap = await getDocs(q)
      return snap.docs.map((d) => mapUser(d.id, d.data()))
    },
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ uid, role }: { uid: string; role: UserRole }) => {
      await updateDoc(doc(db, 'users', uid), { role })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
    },
  })
}

export function useUpdateLeaderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ uid, leaderStatus }: { uid: string; leaderStatus: LeaderStatus }) => {
      await updateDoc(doc(db, 'users', uid), { leaderStatus })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (uid: string) => {
      const deleteUserFn = httpsCallable(functions, 'deleteUser')
      await deleteUserFn({ uid })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
    },
  })
}
