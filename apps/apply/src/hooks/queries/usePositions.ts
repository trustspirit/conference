import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import type { Position } from '../../types'
import { APPLY_POSITIONS_COLLECTION } from '../../collections'
import { queryKeys } from './queryKeys'
import { toDate } from './firestoreUtils'

function mapPosition(id: string, data: Record<string, unknown>): Position {
  return {
    ...data,
    id,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Position
}

export function usePositions(conferenceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.positions.byConference(conferenceId ?? ''),
    queryFn: async () => {
      const q = query(
        collection(db, APPLY_POSITIONS_COLLECTION),
        where('conferenceId', '==', conferenceId),
      )
      const snap = await getDocs(q)
      return snap.docs
        .map((d) => mapPosition(d.id, d.data()))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    },
    enabled: !!conferenceId,
  })
}

export function useCreatePosition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { conferenceId: string; name: string; description: string; eligibilityRequirements?: string[] }) => {
      const docRef = await addDoc(collection(db, APPLY_POSITIONS_COLLECTION), {
        conferenceId: data.conferenceId,
        name: data.name,
        description: data.description,
        eligibilityRequirements: data.eligibilityRequirements ?? [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return docRef.id
    },
    onSuccess: (_id, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.byConference(variables.conferenceId) })
    },
  })
}

export function useUpdatePosition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { id: string; conferenceId: string } & Partial<Omit<Position, 'id' | 'conferenceId' | 'createdAt'>>) => {
      const { id, conferenceId: _, ...updates } = data
      await updateDoc(doc(db, APPLY_POSITIONS_COLLECTION, id), {
        ...updates,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.byConference(variables.conferenceId) })
    },
  })
}

export function useDeletePosition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { id: string; conferenceId: string }) => {
      await deleteDoc(doc(db, APPLY_POSITIONS_COLLECTION, data.id))
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.byConference(variables.conferenceId) })
    },
  })
}
