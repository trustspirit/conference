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
  type QueryConstraint,
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import type { LeaderRecommendation, RecommendationStatus } from '../../types'
import { APPLY_RECOMMENDATIONS_COLLECTION } from '../../collections'
import { queryKeys } from './queryKeys'
import { useAuth } from '../../contexts/AuthContext'
import { useConference } from '../../contexts/ConferenceContext'
import { isAdminRole } from '../../lib/roles'
import { toDate } from './firestoreUtils'

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
  const { currentConference } = useConference()
  const conferenceId = currentConference?.id
  const isAdmin = isAdminRole(appUser?.role)

  return useQuery({
    queryKey: [...(appUser?.role === 'bishop'
      ? queryKeys.recommendations.byWard(appUser.ward)
      : appUser?.role === 'stake_president'
        ? queryKeys.recommendations.byStake(appUser.stake)
        : queryKeys.recommendations.all()), conferenceId ?? 'all'],
    queryFn: async () => {
      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]
      // Admin without a selected conference sees all; others are always scoped
      if (!isAdmin && conferenceId) {
        constraints.unshift(where('conferenceId', '==', conferenceId))
      } else if (isAdmin && conferenceId) {
        constraints.unshift(where('conferenceId', '==', conferenceId))
      }
      if (appUser?.role === 'bishop') {
        constraints.unshift(where('ward', '==', appUser.ward))
      } else if (appUser?.role === 'stake_president') {
        constraints.unshift(where('stake', '==', appUser.stake))
      }
      const q = query(collection(db, APPLY_RECOMMENDATIONS_COLLECTION), ...constraints)
      const snap = await getDocs(q)
      return snap.docs.map((d) => mapRecommendation(d.id, d.data()))
    },
    enabled: !!appUser && appUser.role !== 'applicant' && (isAdmin || !!conferenceId),
  })
}

export function useMyRecommendations() {
  const { appUser } = useAuth()
  const { currentConference } = useConference()
  const conferenceId = currentConference?.id

  return useQuery({
    queryKey: [...queryKeys.recommendations.byLeader(appUser?.uid || ''), conferenceId],
    queryFn: async () => {
      const constraints: QueryConstraint[] = [where('leaderId', '==', appUser!.uid), orderBy('createdAt', 'desc')]
      if (conferenceId) constraints.unshift(where('conferenceId', '==', conferenceId))
      const q = query(collection(db, APPLY_RECOMMENDATIONS_COLLECTION), ...constraints)
      const snap = await getDocs(q)
      return snap.docs.map((d) => mapRecommendation(d.id, d.data()))
    },
    enabled: !!appUser && !!conferenceId,
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
  const { currentConference } = useConference()

  return useMutation({
    mutationFn: async (
      data: Omit<LeaderRecommendation, 'id' | 'createdAt' | 'updatedAt' | 'leaderId' | 'status' | 'comments'> & { status?: RecommendationStatus },
    ) => {
      const { status, ...rest } = data
      const docRef = await addDoc(collection(db, APPLY_RECOMMENDATIONS_COLLECTION), {
        ...rest,
        leaderId: appUser!.uid,
        conferenceId: currentConference?.id || '',
        status: status || ('draft' as RecommendationStatus),
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
