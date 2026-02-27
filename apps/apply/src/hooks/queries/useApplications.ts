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
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import type { Application, ApplicationStatus } from '../../types'
import { APPLY_APPLICATIONS_COLLECTION } from '../../collections'
import { queryKeys } from './queryKeys'
import { useAuth } from '../../contexts/AuthContext'
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

  return useQuery({
    queryKey: appUser?.role === 'bishop'
      ? queryKeys.applications.byWard(appUser.ward)
      : appUser?.role === 'stake_president'
        ? queryKeys.applications.byStake(appUser.stake)
        : queryKeys.applications.all(),
    queryFn: async () => {
      let q
      if (appUser?.role === 'bishop') {
        q = query(collection(db, APPLY_APPLICATIONS_COLLECTION), where('ward', '==', appUser.ward), orderBy('createdAt', 'desc'))
      } else if (appUser?.role === 'stake_president') {
        q = query(collection(db, APPLY_APPLICATIONS_COLLECTION), where('stake', '==', appUser.stake), orderBy('createdAt', 'desc'))
      } else {
        q = query(collection(db, APPLY_APPLICATIONS_COLLECTION), orderBy('createdAt', 'desc'))
      }
      const snap = await getDocs(q)
      return snap.docs.map((d) => mapApplication(d.id, d.data()))
    },
    enabled: !!appUser && appUser.role !== 'applicant',
  })
}

export function useMyApplication() {
  const { appUser } = useAuth()

  return useQuery({
    queryKey: queryKeys.applications.byUser(appUser?.uid || ''),
    queryFn: async () => {
      const q = query(collection(db, APPLY_APPLICATIONS_COLLECTION), where('userId', '==', appUser!.uid))
      const snap = await getDocs(q)
      if (snap.empty) return null
      const d = snap.docs[0]
      return mapApplication(d.id, d.data())
    },
    enabled: !!appUser,
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

  return useMutation({
    mutationFn: async (data: Omit<Application, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'status' | 'memos'> & { status?: ApplicationStatus }) => {
      const { status, ...rest } = data
      const docRef = await addDoc(collection(db, APPLY_APPLICATIONS_COLLECTION), {
        ...rest,
        userId: appUser!.uid,
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
