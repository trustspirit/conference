import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  QueryClient
} from '@tanstack/react-query'
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  limit,
  startAfter,
  writeBatch,
  QueryDocumentSnapshot,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore'
import { getStorage, ref as storageRef, deleteObject } from 'firebase/storage'
import { db, app } from '@conference/firebase'
import { DELETABLE_STATUSES } from '../../lib/roles'
import { queryKeys } from './queryKeys'
import type { PaymentRequest, ReceiptDisplaySizes, RequestStatus } from '../../types'

const PAGE_SIZE = 20

/**
 * Invalidate every cache that depends on the requests collection for a project.
 * Covers `requests.all`, `requests.byUser`, `requests.approved`, `requests.infinite*`
 * (all share the `['requests', projectId]` prefix), `requests.byIds` (its own
 * `['requests', 'byIds', ...]` prefix — does NOT share the projectId prefix, so it
 * needs its own explicit invalidation), plus the derived dashboard stats and budget
 * usage queries. Call from every request mutation's onSuccess.
 */
export function invalidateRequestCaches(
  queryClient: QueryClient,
  projectId: string,
  requestId?: string
) {
  queryClient.invalidateQueries({ queryKey: ['requests', projectId] })
  queryClient.invalidateQueries({ queryKey: ['requests', 'byIds'] })
  if (requestId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.requests.detail(requestId) })
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats(projectId) })
  queryClient.invalidateQueries({ queryKey: queryKeys.budget.usage(projectId) })
}

/** Recursively strip undefined values from an object (Firestore rejects undefined) */
function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(stripUndefined) as T
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) cleaned[key] = stripUndefined(value)
    }
    return cleaned as T
  }
  return obj
}

export async function fetchAllRequests(
  projectId: string,
  committee?: 'operations' | 'preparation'
): Promise<PaymentRequest[]> {
  const committeeConstraint = committee ? [where('committee', '==', committee)] : []
  const q = query(
    collection(db, 'requests'),
    where('projectId', '==', projectId),
    ...committeeConstraint,
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PaymentRequest)
}

export function useRequests(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.requests.all(projectId!),
    queryFn: () => fetchAllRequests(projectId!),
    enabled: !!projectId
  })
}

export function useMyRequests(projectId: string | undefined, uid: string | undefined) {
  return useQuery({
    queryKey: queryKeys.requests.byUser(projectId!, uid!),
    queryFn: async () => {
      const q = query(
        collection(db, 'requests'),
        where('projectId', '==', projectId),
        where('requestedBy.uid', '==', uid),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PaymentRequest)
    },
    enabled: !!projectId && !!uid
  })
}

export function useApprovedRequests(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.requests.approved(projectId!),
    queryFn: async () => {
      const q = query(
        collection(db, 'requests'),
        where('projectId', '==', projectId),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PaymentRequest)
    },
    enabled: !!projectId
  })
}

export function useInfiniteRequests(
  projectId: string | undefined,
  status?: RequestStatus | RequestStatus[],
  sort?: { field: string; dir: 'asc' | 'desc' },
  committee?: 'operations' | 'preparation',
  corporateCardOnly?: boolean
) {
  // 법인카드 필터는 정렬을 createdAt desc 로 고정한다. 정렬 축을 전부 열면
  // projectId × status × committee × isCorporateCard × 정렬 5종 조합으로
  // 복합 인덱스가 약 40개 더 필요해진다.
  const sortField = corporateCardOnly ? 'createdAt' : (sort?.field ?? 'createdAt')
  const sortDir: 'asc' | 'desc' = corporateCardOnly ? 'desc' : (sort?.dir ?? 'desc')
  const sortKey = `${sortField}-${sortDir}`

  const statusKey = Array.isArray(status) ? status.join(',') : status
  const queryKey = statusKey
    ? queryKeys.requests.infiniteByStatus(
        projectId!,
        statusKey,
        sortKey,
        committee,
        corporateCardOnly
      )
    : queryKeys.requests.infinite(projectId!, sortKey, committee, corporateCardOnly)

  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const statusConstraint = status
        ? Array.isArray(status)
          ? [where('status', 'in', status)]
          : [where('status', '==', status)]
        : []
      const committeeConstraint = committee ? [where('committee', '==', committee)] : []
      // isCorporateCard 는 true 일 때만 문서에 기록된다(RequestFormPage.tsx:524).
      // 따라서 '== true' 는 정상 동작하지만 '== false' 는 필드가 없는 문서를 잡지 못한다.
      const corporateConstraint = corporateCardOnly
        ? [where('isCorporateCard', '==', true)]
        : []
      const constraints: QueryConstraint[] = [
        where('projectId', '==', projectId),
        ...statusConstraint,
        ...committeeConstraint,
        ...corporateConstraint,
        orderBy(sortField, sortDir)
      ]
      if (pageParam) constraints.push(startAfter(pageParam))
      constraints.push(limit(PAGE_SIZE))

      const q = query(collection(db, 'requests'), ...constraints)
      const snap = await getDocs(q)
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PaymentRequest)
      return { items, lastDoc: snap.docs[snap.docs.length - 1] ?? null }
    },
    initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
    getNextPageParam: (lastPage) =>
      lastPage.items.length < PAGE_SIZE ? undefined : lastPage.lastDoc,
    placeholderData: keepPreviousData,
    enabled: !!projectId
  })
}

export function useInfiniteMyRequests(
  projectId: string | undefined,
  uid: string | undefined,
  status?: RequestStatus | RequestStatus[]
) {
  const statusKey = Array.isArray(status) ? status.join(',') : status
  return useInfiniteQuery({
    queryKey: [...queryKeys.requests.infiniteByUser(projectId!, uid!), statusKey],
    queryFn: async ({ pageParam }) => {
      const statusConstraint = status
        ? Array.isArray(status)
          ? [where('status', 'in', status)]
          : [where('status', '==', status)]
        : []
      const constraints: QueryConstraint[] = [
        where('projectId', '==', projectId),
        where('requestedBy.uid', '==', uid),
        ...statusConstraint,
        orderBy('createdAt', 'desc')
      ]
      if (pageParam) constraints.push(startAfter(pageParam))
      constraints.push(limit(PAGE_SIZE))

      const q = query(collection(db, 'requests'), ...constraints)
      const snap = await getDocs(q)
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PaymentRequest)
      return { items, lastDoc: snap.docs[snap.docs.length - 1] ?? null }
    },
    initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
    getNextPageParam: (lastPage) =>
      lastPage.items.length < PAGE_SIZE ? undefined : lastPage.lastDoc,
    placeholderData: keepPreviousData,
    enabled: !!projectId && !!uid
  })
}

export function useRequest(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.requests.detail(id!),
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'requests', id!))
      if (!snap.exists()) return null
      return { id: snap.id, ...snap.data() } as PaymentRequest
    },
    enabled: !!id
  })
}

export function useCreateRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      data: Omit<PaymentRequest, 'id' | 'createdAt'> & { createdAt?: unknown }
    ) => {
      const docData = stripUndefined({ ...data, createdAt: serverTimestamp() })
      const ref = await addDoc(collection(db, 'requests'), docData)
      return ref.id
    },
    onSuccess: (id, variables) => {
      invalidateRequestCaches(queryClient, variables.projectId, id)
    }
  })
}

/**
 * Create multiple request docs atomically in one writeBatch. Used by the
 * currency-split flow so a mixed request's two single-currency docs both commit
 * or neither does. Returns the created doc ids in input order.
 */
export function useCreateRequests() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      requests: Array<Omit<PaymentRequest, 'id' | 'createdAt'> & { createdAt?: unknown }>
    ) => {
      const batch = writeBatch(db)
      const refs = requests.map(() => doc(collection(db, 'requests')))
      requests.forEach((data, i) => {
        batch.set(refs[i], stripUndefined({ ...data, createdAt: serverTimestamp() }))
      })
      await batch.commit()
      return refs.map((r) => r.id)
    },
    onSuccess: (ids, variables) => {
      const projectId = variables[0]?.projectId
      if (!projectId) return
      for (const id of ids) invalidateRequestCaches(queryClient, projectId, id)
    }
  })
}

/** Review a pending request (pending → reviewed) */
export function useReviewRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      requestId: string
      projectId: string
      reviewer: { uid: string; name: string; email: string }
    }) => {
      const ref = doc(db, 'requests', params.requestId)
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists() || snap.data().status !== 'pending') {
          throw new Error('already_processed')
        }
        tx.update(ref, {
          status: 'reviewed',
          reviewedBy: params.reviewer,
          reviewedAt: serverTimestamp()
        })
      })
    },
    onSuccess: (_data, variables) => {
      invalidateRequestCaches(queryClient, variables.projectId, variables.requestId)
    }
  })
}

/** Approve a reviewed request (reviewed → approved) */
export function useApproveRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      requestId: string
      projectId: string
      approver: { uid: string; name: string; email: string }
      signature: string
    }) => {
      const ref = doc(db, 'requests', params.requestId)
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists() || snap.data().status !== 'reviewed') {
          throw new Error('already_processed')
        }
        tx.update(ref, {
          status: 'approved',
          approvedBy: params.approver,
          approvalSignature: params.signature,
          approvedAt: serverTimestamp()
        })
      })
    },
    onSuccess: (_data, variables) => {
      invalidateRequestCaches(queryClient, variables.projectId, variables.requestId)
    }
  })
}

/** Reject a pending or reviewed request → rejected */
export function useRejectRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      requestId: string
      projectId: string
      approver: { uid: string; name: string; email: string }
      rejectionReason: string
    }) => {
      const ref = doc(db, 'requests', params.requestId)
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists()) throw new Error('not_found')
        const status = snap.data().status
        if (status !== 'pending' && status !== 'reviewed') {
          throw new Error('already_processed')
        }
        if (status === 'pending') {
          tx.update(ref, {
            status: 'rejected',
            reviewedBy: params.approver,
            reviewedAt: serverTimestamp(),
            rejectionReason: params.rejectionReason
          })
        } else {
          tx.update(ref, {
            status: 'rejected',
            approvedBy: params.approver,
            approvalSignature: null,
            approvedAt: serverTimestamp(),
            rejectionReason: params.rejectionReason
          })
        }
      })
    },
    onSuccess: (_data, variables) => {
      invalidateRequestCaches(queryClient, variables.projectId, variables.requestId)
    }
  })
}

/** Force-reject an approved request (approved → force_rejected) */
export function useForceRejectRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      requestId: string
      projectId: string
      approver: { uid: string; name: string; email: string }
      rejectionReason: string
    }) => {
      const ref = doc(db, 'requests', params.requestId)
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists() || snap.data().status !== 'approved') {
          throw new Error('already_processed')
        }
        tx.update(ref, {
          status: 'force_rejected',
          rejectionReason: params.rejectionReason,
          forceRejectedBy: params.approver,
          forceRejectedAt: serverTimestamp()
        })
      })
    },
    onSuccess: (_data, variables) => {
      invalidateRequestCaches(queryClient, variables.projectId, variables.requestId)
    }
  })
}

export function useCancelRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { requestId: string; projectId: string }) => {
      const ref = doc(db, 'requests', params.requestId)
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists() || snap.data().status !== 'pending') {
          throw new Error('already_processed')
        }
        tx.update(ref, { status: 'cancelled' })
      })
    },
    onSuccess: (_data, variables) => {
      invalidateRequestCaches(queryClient, variables.projectId, variables.requestId)
    }
  })
}

/** Super-admin only: roll back an approved request to reviewed (clears approval fields) */
export function useRollbackApproval() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { requestId: string; projectId: string }) => {
      const ref = doc(db, 'requests', params.requestId)
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists() || snap.data().status !== 'approved') {
          throw new Error('already_processed')
        }
        tx.update(ref, {
          status: 'reviewed',
          approvedBy: null,
          approvalSignature: null,
          approvedAt: null
        })
      })
    },
    onSuccess: (_data, variables) => {
      invalidateRequestCaches(queryClient, variables.projectId, variables.requestId)
    }
  })
}

/** Best-effort delete of a list of Storage paths. Logs and swallows individual failures. */
async function deleteStoragePaths(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const storage = getStorage(app)
  await Promise.allSettled(
    paths.map(async (path) => {
      try {
        await deleteObject(storageRef(storage, path))
      } catch (err) {
        console.warn(`[deleteRequest] storage delete failed: ${path}`, err)
      }
    })
  )
}

/** Super-admin only: permanently delete a request in a deletable status.
 *  Runs the Firestore transaction first (atomic delete + clears `originalRequestId`
 *  on resubmissions that reference this request), then best-effort deletes the
 *  associated Storage assets. Reordered so a race-aborted transaction never
 *  leaves the doc behind with already-deleted receipt files.
 */
export function useDeleteRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { request: PaymentRequest; projectId: string }) => {
      const { request } = params

      // ── Phase A: Pre-query resubmissions that reference this request ──
      const resubQuery = query(
        collection(db, 'requests'),
        where('originalRequestId', '==', request.id)
      )
      const resubSnap = await getDocs(resubQuery)
      const resubIds = resubSnap.docs.map((d) => d.id)

      // ── Phase B: Firestore transaction (atomic delete + cascade) ──
      // Run before Storage cleanup so a status-changed race aborts cleanly without
      // touching files. If the transaction fails, no Storage paths are deleted.
      const targetRef = doc(db, 'requests', request.id)
      // Captured inside the transaction below — must come from the snapshot the
      // transaction actually read, not from `request` (the caller's React Query
      // cache copy), because the corporate-card split feature can move receipts/items
      // to another request after that copy was cached. Reassigned fresh on every
      // attempt (never appended to) so a retry can't double the list.
      let deletableReceipts: PaymentRequest['receipts'] = []
      let deletableItems: PaymentRequest['items'] = []
      await runTransaction(db, async (tx) => {
        const targetSnap = await tx.get(targetRef)
        if (!targetSnap.exists()) throw new Error('not_found')
        const targetData = targetSnap.data()
        const status = targetData.status as PaymentRequest['status']
        if (!DELETABLE_STATUSES.includes(status)) {
          throw new Error('not_deletable')
        }
        deletableReceipts = (targetData.receipts as PaymentRequest['receipts']) ?? []
        deletableItems = (targetData.items as PaymentRequest['items']) ?? []
        for (const childId of resubIds) {
          const childRef = doc(db, 'requests', childId)
          const childSnap = await tx.get(childRef)
          if (!childSnap.exists()) continue
          if (childSnap.data().originalRequestId === request.id) {
            tx.update(childRef, { originalRequestId: null })
          }
        }
        tx.delete(targetRef)
      })

      // ── Phase C: Storage cleanup (best-effort, after successful delete) ──
      // Failures here leave orphan files but the doc is already gone, so future
      // references are impossible. A janitor job can reap orphans later.
      const storagePaths: string[] = []
      for (const r of deletableReceipts) {
        if (r.storagePath) storagePaths.push(r.storagePath)
      }
      for (const item of deletableItems) {
        const p = item.transportDetail?.routeMapImage?.storagePath
        if (p) storagePaths.push(p)
      }
      await deleteStoragePaths(storagePaths)
    },
    onSuccess: (_data, variables) => {
      invalidateRequestCaches(queryClient, variables.projectId, variables.request.id)
    }
  })
}

/** Update the per-receipt PDF display-size map (e.g. flip storagePath → 'large').
 *  Staff-only at the Firestore rule level. 3-state model: a missing key inherits the
 *  project default (which may itself be 'large'); `'normal'` and `'large'` are both
 *  stored explicitly, since deleting a key would mean "inherit" rather than "normal".
 *  Pass an empty object to clear all overrides — every receipt then inherits the
 *  project default. */
export function useUpdateRequestReceiptDisplaySizes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      requestId: string
      projectId: string
      receiptDisplaySizes: ReceiptDisplaySizes
    }) => {
      await updateDoc(doc(db, 'requests', params.requestId), {
        receiptDisplaySizes: params.receiptDisplaySizes
      })
    },
    onSuccess: (_data, variables) => {
      invalidateRequestCaches(queryClient, variables.projectId, variables.requestId)
    }
  })
}
