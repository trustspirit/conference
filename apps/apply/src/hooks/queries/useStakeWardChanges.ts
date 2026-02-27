import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@conference/firebase'
import type { StakeWardChangeRequest } from '../../types'
import { queryKeys } from './queryKeys'
import { useAuth } from '../../contexts/AuthContext'

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  if (typeof val === 'string') return new Date(val)
  return new Date()
}

function mapRequest(id: string, data: Record<string, unknown>): StakeWardChangeRequest {
  return {
    ...data,
    id,
    requestedAt: toDate(data.requestedAt),
    approvedAt: data.approvedAt ? toDate(data.approvedAt) : undefined,
  } as StakeWardChangeRequest
}

export function useStakeWardChangeRequests() {
  return useQuery({
    queryKey: queryKeys.stakeWardChanges.pending(),
    queryFn: async () => {
      const q = query(
        collection(db, 'stakeWardChangeRequests'),
        where('status', '==', 'pending'),
        orderBy('requestedAt', 'desc'),
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => mapRequest(d.id, d.data()))
    },
  })
}

export function useCreateStakeWardChangeRequest() {
  const queryClient = useQueryClient()
  const { appUser } = useAuth()

  return useMutation({
    mutationFn: async ({ stake, ward }: { stake: string; ward: string }) => {
      const docRef = await addDoc(collection(db, 'stakeWardChangeRequests'), {
        userId: appUser!.uid,
        userName: appUser!.name,
        userEmail: appUser!.email,
        userRole: appUser!.role,
        currentStake: appUser!.stake,
        currentWard: appUser!.ward,
        requestedStake: stake,
        requestedWard: ward,
        status: 'pending',
        requestedAt: serverTimestamp(),
      })
      return docRef.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stakeWardChanges.all() })
    },
  })
}

export function useApproveStakeWardChange() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, approved }: { requestId: string; approved: boolean }) => {
      const approveFn = httpsCallable(functions, 'approveStakeWardChange')
      await approveFn({ requestId, approved })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stakeWardChanges.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
    },
  })
}
