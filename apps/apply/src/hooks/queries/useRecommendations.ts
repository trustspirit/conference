import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import type { LeaderRecommendation, RecommendationStatus } from '../../types'
import { APPLY_RECOMMENDATIONS_COLLECTION } from '../../collections'
import { queryKeys } from './queryKeys'
import { useAuth } from '../../contexts/AuthContext'

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  if (typeof val === 'string') return new Date(val)
  return new Date()
}

function mapRecommendation(id: string, data: Record<string, unknown>): LeaderRecommendation {
  return {
    ...data,
    id,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as LeaderRecommendation
}

export function useRecommendations() {
  const { appUser } = useAuth()

  return useQuery({
    queryKey: appUser?.role === 'bishop'
      ? queryKeys.recommendations.byWard(appUser.ward)
      : appUser?.role === 'stake_president'
        ? queryKeys.recommendations.byStake(appUser.stake)
        : queryKeys.recommendations.all(),
    queryFn: async () => {
      let q
      if (appUser?.role === 'bishop') {
        q = query(collection(db, APPLY_RECOMMENDATIONS_COLLECTION), where('ward', '==', appUser.ward), orderBy('createdAt', 'desc'))
      } else if (appUser?.role === 'stake_president') {
        q = query(collection(db, APPLY_RECOMMENDATIONS_COLLECTION), where('stake', '==', appUser.stake), orderBy('createdAt', 'desc'))
      } else {
        q = query(collection(db, APPLY_RECOMMENDATIONS_COLLECTION), orderBy('createdAt', 'desc'))
      }
      const snap = await getDocs(q)
      return snap.docs.map((d) => mapRecommendation(d.id, d.data()))
    },
    enabled: !!appUser && appUser.role !== 'applicant',
  })
}

export function useMyRecommendations() {
  const { appUser } = useAuth()

  return useQuery({
    queryKey: queryKeys.recommendations.byLeader(appUser?.uid || ''),
    queryFn: async () => {
      const q = query(
        collection(db, APPLY_RECOMMENDATIONS_COLLECTION),
        where('leaderId', '==', appUser!.uid),
        orderBy('createdAt', 'desc'),
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => mapRecommendation(d.id, d.data()))
    },
    enabled: !!appUser,
  })
}

export function useRecommendationDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.recommendations.detail(id),
    queryFn: async () => {
      const snap = await getDoc(doc(db, APPLY_RECOMMENDATIONS_COLLECTION, id))
      if (!snap.exists()) return null
      return mapRecommendation(snap.id, snap.data())
    },
    enabled: !!id,
  })
}

export function useCreateRecommendation() {
  const queryClient = useQueryClient()
  const { appUser } = useAuth()

  return useMutation({
    mutationFn: async (
      data: Omit<LeaderRecommendation, 'id' | 'createdAt' | 'updatedAt' | 'leaderId' | 'status' | 'comments'>,
    ) => {
      const docRef = await addDoc(collection(db, APPLY_RECOMMENDATIONS_COLLECTION), {
        ...data,
        leaderId: appUser!.uid,
        status: 'draft' as RecommendationStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return docRef.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] })
    },
  })
}

export function useUpdateRecommendation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<LeaderRecommendation> & { id: string }) => {
      await updateDoc(doc(db, APPLY_RECOMMENDATIONS_COLLECTION, id), {
        ...data,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] })
    },
  })
}

export function useUpdateRecommendationStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RecommendationStatus }) => {
      await updateDoc(doc(db, APPLY_RECOMMENDATIONS_COLLECTION, id), {
        status,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] })
    },
  })
}

export function useDeleteRecommendation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, APPLY_RECOMMENDATIONS_COLLECTION, id))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] })
    },
  })
}
