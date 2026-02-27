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
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import type { ApplicationMemo } from '../../types'
import { queryKeys } from './queryKeys'
import { useAuth } from '../../contexts/AuthContext'

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  if (typeof val === 'string') return new Date(val)
  return new Date()
}

function mapMemo(id: string, data: Record<string, unknown>): ApplicationMemo {
  return {
    ...data,
    id,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as ApplicationMemo
}

export function useMemos(applicationId: string) {
  return useQuery({
    queryKey: queryKeys.memos.byApplication(applicationId),
    queryFn: async () => {
      const q = query(
        collection(db, 'memos'),
        where('applicationId', '==', applicationId),
        orderBy('createdAt', 'desc'),
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => mapMemo(d.id, d.data()))
    },
    enabled: !!applicationId,
  })
}

export function useCreateMemo() {
  const queryClient = useQueryClient()
  const { appUser } = useAuth()

  return useMutation({
    mutationFn: async ({ applicationId, content }: { applicationId: string; content: string }) => {
      const docRef = await addDoc(collection(db, 'memos'), {
        applicationId,
        authorId: appUser!.uid,
        authorName: appUser!.name,
        authorRole: appUser!.role,
        content,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return docRef.id
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memos.byApplication(variables.applicationId) })
    },
  })
}

export function useUpdateMemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, content, applicationId }: { id: string; content: string; applicationId: string }) => {
      await updateDoc(doc(db, 'memos', id), {
        content,
        updatedAt: serverTimestamp(),
      })
      return applicationId
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memos.byApplication(variables.applicationId) })
    },
  })
}

export function useDeleteMemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, applicationId }: { id: string; applicationId: string }) => {
      await deleteDoc(doc(db, 'memos', id))
      return applicationId
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memos.byApplication(variables.applicationId) })
    },
  })
}
