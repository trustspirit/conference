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
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import { getDisplayName, type RecommendationComment } from '../../types'
import { APPLY_RECOMMENDATION_COMMENTS_COLLECTION } from '../../collections'
import { queryKeys } from './queryKeys'
import { useAuth } from '../../contexts/AuthContext'
import { toDate } from './firestoreUtils'

function mapComment(id: string, data: Record<string, unknown>): RecommendationComment {
  return {
    ...data,
    id,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as RecommendationComment
}

export function useRecommendationComments(recommendationId: string) {
  return useQuery({
    queryKey: queryKeys.comments.byRecommendation(recommendationId),
    queryFn: async () => {
      const q = query(
        collection(db, APPLY_RECOMMENDATION_COMMENTS_COLLECTION),
        where('recommendationId', '==', recommendationId),
        orderBy('createdAt', 'desc'),
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => mapComment(d.id, d.data()))
    },
    enabled: !!recommendationId,
  })
}

export function useApplicationComments(applicationId: string) {
  return useQuery({
    queryKey: queryKeys.comments.byApplication(applicationId),
    queryFn: async () => {
      const q = query(
        collection(db, APPLY_RECOMMENDATION_COMMENTS_COLLECTION),
        where('applicationId', '==', applicationId),
        orderBy('createdAt', 'desc'),
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => mapComment(d.id, d.data()))
    },
    enabled: !!applicationId,
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()
  const { appUser } = useAuth()

  return useMutation({
    mutationFn: async (data: { recommendationId?: string; applicationId?: string; content: string }) => {
      const docRef = await addDoc(collection(db, APPLY_RECOMMENDATION_COMMENTS_COLLECTION), {
        ...data,
        authorId: appUser!.uid,
        authorName: getDisplayName(appUser),
        authorRole: appUser!.role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return docRef.id
    },
    onSuccess: (_data, variables) => {
      if (variables.recommendationId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.comments.byRecommendation(variables.recommendationId),
        })
      }
      if (variables.applicationId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.comments.byApplication(variables.applicationId),
        })
      }
    },
  })
}

export function useUpdateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      content,
      recommendationId,
      applicationId,
    }: {
      id: string
      content: string
      recommendationId?: string
      applicationId?: string
    }) => {
      await updateDoc(doc(db, APPLY_RECOMMENDATION_COMMENTS_COLLECTION, id), {
        content,
        updatedAt: serverTimestamp(),
      })
      return { recommendationId, applicationId }
    },
    onSuccess: (_data, variables) => {
      if (variables.recommendationId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.comments.byRecommendation(variables.recommendationId),
        })
      }
      if (variables.applicationId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.comments.byApplication(variables.applicationId),
        })
      }
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      recommendationId,
      applicationId,
    }: {
      id: string
      recommendationId?: string
      applicationId?: string
    }) => {
      await deleteDoc(doc(db, APPLY_RECOMMENDATION_COMMENTS_COLLECTION, id))
      return { recommendationId, applicationId }
    },
    onSuccess: (_data, variables) => {
      if (variables.recommendationId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.comments.byRecommendation(variables.recommendationId),
        })
      }
      if (variables.applicationId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.comments.byApplication(variables.applicationId),
        })
      }
    },
  })
}
