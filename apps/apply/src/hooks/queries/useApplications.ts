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
import type { Application, ApplicationStatus } from '../../types'
import { APPLY_APPLICATIONS_COLLECTION } from '../../collections'
import { queryKeys } from './queryKeys'
import { useAuth } from '../../contexts/AuthContext'
import { useConference } from '../../contexts/ConferenceContext'
import { toDate } from './firestoreUtils'

function mapApplication(id: string, data: Record<string, unknown>): Application {
  return {
    ...data,
    id,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Application
}

export function useApplications() {
  const { appUser } = useAuth()
  const { currentConference } = useConference()
  const conferenceId = currentConference?.id

  return useQuery({
    queryKey: [...(appUser?.role === 'bishop'
      ? queryKeys.applications.byWard(appUser.ward)
      : appUser?.role === 'stake_president'
        ? queryKeys.applications.byStake(appUser.stake)
        : queryKeys.applications.all()), conferenceId],
    queryFn: async () => {
      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]
      if (conferenceId) constraints.unshift(where('conferenceId', '==', conferenceId))
      if (appUser?.role === 'bishop') {
        constraints.unshift(where('ward', '==', appUser.ward))
      } else if (appUser?.role === 'stake_president') {
        constraints.unshift(where('stake', '==', appUser.stake))
      }
      const q = query(collection(db, APPLY_APPLICATIONS_COLLECTION), ...constraints)
      const snap = await getDocs(q)
      return snap.docs.map((d) => mapApplication(d.id, d.data()))
    },
    enabled: !!appUser && appUser.role !== 'applicant' && !!conferenceId,
  })
}

export function useMyApplication() {
  const { appUser } = useAuth()
  const { currentConference } = useConference()
  const conferenceId = currentConference?.id

  return useQuery({
    queryKey: [...queryKeys.applications.byUser(appUser?.uid || ''), conferenceId],
    queryFn: async () => {
      const constraints: QueryConstraint[] = [where('userId', '==', appUser!.uid)]
      if (conferenceId) constraints.push(where('conferenceId', '==', conferenceId))
      const q = query(collection(db, APPLY_APPLICATIONS_COLLECTION), ...constraints)
      const snap = await getDocs(q)
      if (snap.empty) return null
      const d = snap.docs[0]
      return mapApplication(d.id, d.data())
    },
    enabled: !!appUser && !!conferenceId,
  })
}

export function useApplicationDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.applications.detail(id),
    queryFn: async () => {
      const snap = await getDoc(doc(db, APPLY_APPLICATIONS_COLLECTION, id))
      if (!snap.exists()) return null
      return mapApplication(snap.id, snap.data())
    },
    enabled: !!id,
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()
  const { appUser } = useAuth()
  const { currentConference } = useConference()

  return useMutation({
    mutationFn: async (data: Omit<Application, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'status' | 'memos'> & { status?: ApplicationStatus }) => {
      const { status, ...rest } = data
      const docRef = await addDoc(collection(db, APPLY_APPLICATIONS_COLLECTION), {
        ...rest,
        userId: appUser!.uid,
        conferenceId: currentConference?.id || '',
        status: status || ('awaiting' as ApplicationStatus),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return docRef.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}

export function useUpdateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Application> & { id: string }) => {
      await updateDoc(doc(db, APPLY_APPLICATIONS_COLLECTION, id), {
        ...data,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ApplicationStatus }) => {
      await updateDoc(doc(db, APPLY_APPLICATIONS_COLLECTION, id), {
        status,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}

export function useDeleteApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, APPLY_APPLICATIONS_COLLECTION, id))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}
