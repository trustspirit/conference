import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteField,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@conference/firebase'
import type { Conference } from '../../types'
import { APPLY_CONFERENCES_COLLECTION } from '../../collections'
import { queryKeys } from './queryKeys'
import { toDate } from './firestoreUtils'

function mapConference(id: string, data: Record<string, unknown>): Conference {
  return {
    ...data,
    id,
    deadline: data.deadline ? toDate(data.deadline) : null,
    isClosed: !!data.isClosed,
    deactivatedAt: data.deactivatedAt ? toDate(data.deactivatedAt) : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Conference
}

export function useConferences() {
  return useQuery({
    queryKey: queryKeys.conferences.all(),
    queryFn: async () => {
      const q = query(
        collection(db, APPLY_CONFERENCES_COLLECTION),
        where('isActive', '==', true),
      )
      const snap = await getDocs(q)
      return snap.docs
        .map((d) => mapConference(d.id, d.data()))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },
  })
}

export function useCreateConference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; description: string; deadline: string | null; createdBy: string }) => {
      const docRef = await addDoc(collection(db, APPLY_CONFERENCES_COLLECTION), {
        name: data.name,
        description: data.description,
        deadline: data.deadline ? Timestamp.fromDate(new Date(data.deadline)) : null,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: data.createdBy,
      })
      return docRef.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conferences.all() })
    },
  })
}

export function useUpdateConference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { id: string } & Partial<Omit<Conference, 'id' | 'createdAt' | 'createdBy'>>) => {
      const { id, ...updates } = data
      await updateDoc(doc(db, APPLY_CONFERENCES_COLLECTION, id), {
        ...updates,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conferences.all() })
    },
  })
}

export function useDeleteConference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await updateDoc(doc(db, APPLY_CONFERENCES_COLLECTION, id), {
        isActive: false,
        deactivatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conferences.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.conferences.deactivated() })
    },
  })
}

export function useRestoreConference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await updateDoc(doc(db, APPLY_CONFERENCES_COLLECTION, id), {
        isActive: true,
        deactivatedAt: deleteField(),
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conferences.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.conferences.deactivated() })
    },
  })
}

export function useDeactivatedConferences() {
  return useQuery({
    queryKey: queryKeys.conferences.deactivated(),
    queryFn: async () => {
      const q = query(
        collection(db, APPLY_CONFERENCES_COLLECTION),
        where('isActive', '==', false),
      )
      const snap = await getDocs(q)
      return snap.docs
        .map((d) => mapConference(d.id, d.data()))
        .sort((a, b) => {
          const aTime = a.deactivatedAt?.getTime() ?? 0
          const bTime = b.deactivatedAt?.getTime() ?? 0
          return bTime - aTime
        })
    },
  })
}

export function usePermanentlyDeleteConference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (conferenceId: string) => {
      const fn = httpsCallable(functions, 'permanentlyDeleteConference')
      await fn({ conferenceId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conferences.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.conferences.deactivated() })
    },
  })
}
