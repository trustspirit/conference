import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import type { Conference } from '../../types'
import { APPLY_CONFERENCES_COLLECTION } from '../../collections'
import { queryKeys } from './queryKeys'
import { toDate } from './firestoreUtils'

function mapConference(id: string, data: Record<string, unknown>): Conference {
  return {
    ...data,
    id,
    deadline: data.deadline ? toDate(data.deadline) : null,
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
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => mapConference(d.id, d.data()))
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
        eligibilityRequirements: [],
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
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conferences.all() })
    },
  })
}
