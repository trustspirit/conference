import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData
} from '@tanstack/react-query'
import {
  collection,
  deleteField,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import { queryKeys } from './queryKeys'
import type { Settlement, Committee, PaymentRequest, AppUser } from '../../types'
import { revertRequestAction } from '../../lib/settlementRevert'

const PAGE_SIZE = 20

export function useSettlements(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.settlements.all(projectId!),
    queryFn: async () => {
      const q = query(
        collection(db, 'settlements'),
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Settlement)
    },
    enabled: !!projectId
  })
}

export function useInfiniteSettlements(projectId: string | undefined, committee?: Committee) {
  return useInfiniteQuery({
    queryKey: queryKeys.settlements.infinite(projectId!, committee),
    queryFn: async ({ pageParam }) => {
      const constraints: QueryConstraint[] = [
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc')
      ]
      if (committee) constraints.push(where('committee', '==', committee))
      if (pageParam) constraints.push(startAfter(pageParam))
      constraints.push(limit(PAGE_SIZE))

      const q = query(collection(db, 'settlements'), ...constraints)
      const snap = await getDocs(q)
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Settlement)
      return { items, lastDoc: snap.docs[snap.docs.length - 1] ?? null }
    },
    initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
    getNextPageParam: (lastPage) =>
      lastPage.items.length < PAGE_SIZE ? undefined : lastPage.lastDoc,
    placeholderData: keepPreviousData,
    enabled: !!projectId
  })
}

export function useSettlement(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.settlements.detail(id!),
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'settlements', id!))
      if (!snap.exists()) return null
      return { id: snap.id, ...snap.data() } as Settlement
    },
    enabled: !!id
  })
}

export function useSettlementBatch(
  batchId: string | undefined,
  projectId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.settlements.batch(projectId!, batchId!),
    queryFn: async () => {
      const q = query(
        collection(db, 'settlements'),
        where('projectId', '==', projectId),
        where('batchId', '==', batchId)
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Settlement)
    },
    enabled: !!batchId && !!projectId
  })
}

/** Fetch request dates by IDs — returns a map of requestId → date string */
export async function fetchRequestDatesByIds(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const results = await Promise.all(
    ids.map(async (id) => {
      const snap = await getDoc(doc(db, 'requests', id))
      if (!snap.exists()) return null
      return [id, (snap.data().date as string) ?? ''] as [string, string]
    })
  )
  return new Map(results.filter((r): r is [string, string] => r !== null))
}

/** Load original requests by IDs (for settlement report individual forms) */
export function useRequestsByIds(requestIds: string[]) {
  return useQuery({
    queryKey: ['requests', 'byIds', ...requestIds],
    queryFn: async () => {
      if (requestIds.length === 0) return []
      const results = await Promise.all(
        requestIds.map(async (id) => {
          const snap = await getDoc(doc(db, 'requests', id))
          if (!snap.exists()) return null
          return { id: snap.id, ...snap.data() } as PaymentRequest
        })
      )
      return results.filter((r): r is PaymentRequest => r !== null)
    },
    enabled: requestIds.length > 0
  })
}

/** Load user profiles by UIDs (for bank book URLs in settlement reports) */
export function useUsersByUids(uids: string[]) {
  const uniqueUids = [...new Set(uids)].sort()
  return useQuery({
    queryKey: ['users', 'byUids', ...uniqueUids],
    queryFn: async () => {
      const map = new Map<string, AppUser>()
      await Promise.all(
        uniqueUids.map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, 'users', uid))
            if (snap.exists()) map.set(uid, { uid, ...snap.data() } as AppUser)
          } catch {
            /* skip */
          }
        })
      )
      return map
    },
    enabled: uniqueUids.length > 0
  })
}

export function useCreateSettlement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      projectId: string
      settlements: Array<Omit<Settlement, 'id' | 'createdAt'>>
    }) => {
      await runTransaction(db, async (tx) => {
        // 1) 모든 요청의 현재 상태를 읽어서 approved인지 확인
        const allRequestIds = params.settlements.flatMap((s) => s.requestIds)
        const requestSnaps = await Promise.all(
          allRequestIds.map((id) => tx.get(doc(db, 'requests', id)))
        )
        for (const snap of requestSnaps) {
          if (!snap.exists()) throw new Error(`Request ${snap.id} not found`)
          if (snap.data().status !== 'approved') {
            throw new Error(`Request ${snap.id} is no longer approved (status: ${snap.data().status})`)
          }
        }

        // 2) 정산 문서 생성 + 요청 상태 업데이트
        for (const settlement of params.settlements) {
          const settlementRef = doc(collection(db, 'settlements'))
          tx.set(settlementRef, {
            ...settlement,
            createdAt: serverTimestamp()
          })

          for (const requestId of settlement.requestIds) {
            tx.update(doc(db, 'requests', requestId), {
              status: 'settled',
              settlementId: settlementRef.id
            })
          }
        }
      })
    },
    onSuccess: async (_data, variables) => {
      // type: 'all' + await so the destination page (/admin/settlements) sees
      // fresh data immediately after navigation, not stale-with-background-refetch.
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ['requests', variables.projectId],
          type: 'all'
        }),
        queryClient.refetchQueries({
          queryKey: ['settlements', variables.projectId],
          type: 'all'
        }),
        queryClient.refetchQueries({
          queryKey: queryKeys.dashboard.stats(variables.projectId),
          type: 'all'
        }),
        queryClient.refetchQueries({
          queryKey: queryKeys.budget.usage(variables.projectId),
          type: 'all'
        })
      ])
    }
  })
}

/**
 * Revert an entire settlement batch: delete all settlement docs sharing the
 * batchId and restore their requests to 'approved' (clearing settlementId).
 * Intended for super_admin only — caller is responsible for the role check.
 */
export function useRevertSettlementBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      batchId: string
      projectId: string
    }): Promise<{ deletedSettlementIds: string[] }> => {
      // Fetch batch IDs outside the transaction (transactions can't run queries).
      const batchSnap = await getDocs(
        query(
          collection(db, 'settlements'),
          where('projectId', '==', params.projectId),
          where('batchId', '==', params.batchId)
        )
      )
      if (batchSnap.empty) throw new Error('Settlement batch not found')

      const settlementIds = batchSnap.docs.map((d) => d.id)
      const requestIds = [
        ...new Set(
          batchSnap.docs.flatMap((d) => (d.data().requestIds as string[] | undefined) ?? [])
        )
      ]

      // Op-count guard: reads (settlements + requests) + writes (deletes + updates).
      const totalOps = (settlementIds.length + requestIds.length) * 2
      if (totalOps > 500) {
        throw new Error('Batch too large to revert in a single transaction')
      }

      await runTransaction(db, async (tx) => {
        const settlementRefs = settlementIds.map((id) => doc(db, 'settlements', id))
        const requestRefs = requestIds.map((id) => doc(db, 'requests', id))

        const settlementSnaps = await Promise.all(settlementRefs.map((ref) => tx.get(ref)))
        const requestSnaps = await Promise.all(requestRefs.map((ref) => tx.get(ref)))

        for (const snap of requestSnaps) {
          if (!snap.exists()) continue
          const data = snap.data()
          // Revert only requests whose settlementId belongs to this batch; a
          // request re-settled into another batch (or already reverted) is skipped.
          if (revertRequestAction(data.status, data.settlementId, settlementIds) !== 'revert') {
            continue
          }
          tx.update(snap.ref, {
            status: 'approved',
            settlementId: deleteField()
          })
        }

        for (const snap of settlementSnaps) {
          if (snap.exists()) tx.delete(snap.ref)
        }
      })

      return { deletedSettlementIds: settlementIds }
    },
    onSuccess: async (data, variables) => {
      // Drop per-settlement detail caches outright — the docs no longer exist,
      // so showing stale "found" data on direct navigation would be misleading.
      // Detail key (`['settlements', id]`) does not share a prefix with our
      // list/batch keys (`['settlements', projectId, ...]`), so we must remove
      // them explicitly.
      for (const id of data.deletedSettlementIds) {
        queryClient.removeQueries({ queryKey: queryKeys.settlements.detail(id), exact: true })
      }

      // type: 'all' + await so the destination page (/admin/settlements) sees
      // fresh data immediately after navigation, not stale-with-background-refetch.
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ['requests', variables.projectId],
          type: 'all'
        }),
        queryClient.refetchQueries({
          queryKey: ['settlements', variables.projectId],
          type: 'all'
        }),
        queryClient.refetchQueries({
          queryKey: queryKeys.dashboard.stats(variables.projectId),
          type: 'all'
        }),
        queryClient.refetchQueries({
          queryKey: queryKeys.budget.usage(variables.projectId),
          type: 'all'
        })
      ])
    }
  })
}
