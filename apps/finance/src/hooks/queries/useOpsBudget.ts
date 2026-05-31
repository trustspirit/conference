import { useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import {
  collection, doc, setDoc, deleteDoc, serverTimestamp, onSnapshot,
  Timestamp, QueryDocumentSnapshot, DocumentData, FieldValue,
  query, where, getDocs, writeBatch,
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import { queryKeys } from './queryKeys'
import type {
  OpsBudgetCategory, OpsBudgetInclusion,
} from '../../types'
import { useRequests } from './useRequests'
import {
  diffIncludableItems, inclusionId,
} from '../../components/dashboard/opsBudgetSelectors'

// ---------- Mappers (exported for unit tests) ----------

export function mapInclusionDoc(id: string, data: DocumentData): OpsBudgetInclusion {
  const addedAt = data.addedAt
  return {
    id,
    categoryId: data.categoryId,
    requestId: data.requestId,
    itemIndex: data.itemIndex,
    snapshot: data.snapshot,
    addedBy: data.addedBy,
    addedAt: addedAt instanceof Timestamp ? addedAt.toDate()
           : (addedAt?.toDate ? addedAt.toDate() : new Date()),
  }
}

export function mapInclusionDocs(
  docs: ReadonlyArray<QueryDocumentSnapshot<DocumentData>>
): OpsBudgetInclusion[] {
  return docs.map((d) => mapInclusionDoc(d.id, d.data()))
}

// ---------- Shared-subscription ref-counting ----------
//
// Multiple calls to useOpsBudgetInclusions() with the same (queryClient, projectId)
// previously each opened their own onSnapshot listener — up to 3× fan-out for a single
// render tree (OpsBudgetTab + useOpsBudgetIncludableItems ×2). This module-level WeakMap
// ensures exactly one live listener per (queryClient, projectId) pair regardless of how
// many hook instances mount simultaneously.

interface SubEntry { count: number; unsub: () => void }

const subscriptions = new WeakMap<QueryClient, Map<string, SubEntry>>()

function getOrCreateSub(queryClient: QueryClient, projectId: string): SubEntry {
  let perClient = subscriptions.get(queryClient)
  if (!perClient) {
    perClient = new Map()
    subscriptions.set(queryClient, perClient)
  }

  const existing = perClient.get(projectId)
  if (existing) {
    existing.count++
    return existing
  }

  const colRef = collection(db, 'projects', projectId, 'opsBudgetInclusions')
  const unsub = onSnapshot(
    colRef,
    (snap) => {
      const data = mapInclusionDocs(snap.docs)
      queryClient.setQueryData(queryKeys.opsBudget.inclusions(projectId), data)
    },
    (_err) => {
      // Errors surface via the useQuery stub below returning stale/empty data;
      // we intentionally don't propagate into the cache to avoid overwriting good data.
    }
  )

  const entry: SubEntry = { count: 1, unsub }
  perClient.set(projectId, entry)
  return entry
}

function releaseSub(queryClient: QueryClient, projectId: string): void {
  const perClient = subscriptions.get(queryClient)
  if (!perClient) return
  const entry = perClient.get(projectId)
  if (!entry) return
  entry.count--
  if (entry.count <= 0) {
    entry.unsub()
    perClient.delete(projectId)
  }
}

// ---------- Realtime read ----------

/**
 * Subscribes to `projects/{pid}/opsBudgetInclusions` with `onSnapshot`.
 * Returns a stable react-query-shaped result so component code stays consistent.
 *
 * Multiple simultaneous callers (e.g. OpsBudgetTab + useOpsBudgetIncludableItems) share
 * a single Firestore listener via module-level ref-counting — no fan-out.
 */
export function useOpsBudgetInclusions(projectId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!projectId) return
    getOrCreateSub(queryClient, projectId)
    return () => releaseSub(queryClient, projectId)
  }, [projectId, queryClient])

  const query = useQuery<OpsBudgetInclusion[]>({
    queryKey: projectId
      ? queryKeys.opsBudget.inclusions(projectId)
      : ['opsBudget', 'none', 'inclusions'],
    queryFn: () => {
      const key = projectId
        ? queryKeys.opsBudget.inclusions(projectId)
        : (['opsBudget', 'none', 'inclusions'] as const)
      return Promise.resolve(queryClient.getQueryData<OpsBudgetInclusion[]>(key) ?? [])
    },
    enabled: !!projectId,
    staleTime: Infinity,
  })

  return query
}

/**
 * Computed list of items eligible for inclusion: operations-committee requests
 * in approved+settled status minus items already included anywhere.
 * Depends on `useRequests` (existing query — cached and shared with other views).
 */
export function useOpsBudgetIncludableItems(projectId: string | undefined) {
  const requests = useRequests(projectId)
  const inclusions = useOpsBudgetInclusions(projectId)

  const data = useMemo(() => {
    if (!requests.data || !inclusions.data) return []
    return diffIncludableItems(requests.data, inclusions.data)
  }, [requests.data, inclusions.data])

  return {
    data,
    isLoading: requests.isLoading || inclusions.isLoading,
    error: requests.error ?? inclusions.error,
  }
}

// --------- Annotated "all operations items" (includable + already-included) ----------

export interface AnnotatedOperationsItem {
  requestId: string
  itemIndex: number
  snapshot: OpsBudgetInclusion['snapshot']
  source: {
    requestCreatedAt: Date | { toDate: () => Date }
    requestStatus: import('../../types').RequestStatus
  }
  /** null = not yet included anywhere; string = categoryId it belongs to */
  assignedCategoryId: string | null
}

/**
 * Pure function: merges requests + existing inclusions into a flat annotated list.
 * Exported for unit testing.
 */
export function annotateAllOperationsItems(
  requests: import('../../types').PaymentRequest[],
  inclusions: OpsBudgetInclusion[]
): AnnotatedOperationsItem[] {
  const inclusionMap = new Map<string, string>() // id → categoryId
  for (const inc of inclusions) {
    inclusionMap.set(inc.id, inc.categoryId)
  }

  const INCLUDABLE = new Set<import('../../types').RequestStatus>(['approved', 'settled'])
  const out: AnnotatedOperationsItem[] = []

  for (const req of requests) {
    if (req.committee !== 'operations') continue
    if (!INCLUDABLE.has(req.status)) continue
    req.items.forEach((it, itemIndex) => {
      const id = inclusionId(req.id, itemIndex)
      const currency = it.currency ?? 'KRW'
      out.push({
        requestId: req.id,
        itemIndex,
        snapshot: {
          amount: currency === 'USD' ? 0 : it.amount,
          amountUsd: currency === 'USD' ? it.amount : 0,
          currency,
          budgetCode: it.budgetCode,
          budgetDescKey: it.budgetDescKey,
          description: it.description,
          payee: req.payee,
          submitterName: req.requestedBy?.name ?? '',
          date: req.date,
          session: req.session,
          requestStatus: req.status,
        },
        source: {
          requestCreatedAt: req.createdAt,
          requestStatus: req.status,
        },
        assignedCategoryId: inclusionMap.get(id) ?? null,
      })
    })
  }

  return out.sort((a, b) => {
    const toMs = (d: unknown): number => {
      if (d instanceof Date) return d.getTime()
      const maybe = d as { toDate?: () => Date } | null
      if (maybe && typeof maybe.toDate === 'function') return maybe.toDate().getTime()
      return 0
    }
    const dt = toMs(b.source.requestCreatedAt) - toMs(a.source.requestCreatedAt)
    if (dt !== 0) return dt
    const cmp = a.requestId.localeCompare(b.requestId)
    if (cmp !== 0) return cmp
    return a.itemIndex - b.itemIndex
  })
}

/**
 * Like useOpsBudgetIncludableItems but includes already-included items,
 * annotated with their categoryId. Used by the picker's "show included" toggle.
 */
export function useOpsBudgetAllOperationsItems(projectId: string | undefined) {
  const requests = useRequests(projectId)
  const inclusions = useOpsBudgetInclusions(projectId)

  const data = useMemo(() => {
    if (!requests.data || !inclusions.data) return []
    return annotateAllOperationsItems(requests.data, inclusions.data)
  }, [requests.data, inclusions.data])

  return {
    data,
    isLoading: requests.isLoading || inclusions.isLoading,
    error: requests.error ?? inclusions.error,
  }
}

// ---------- Mutations ----------

interface AddInclusionParams {
  projectId: string
  categoryId: string
  requestId: string
  itemIndex: number
  snapshot: OpsBudgetInclusion['snapshot']
  addedBy: { uid: string; name: string; email: string }
}

export function useAddInclusion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (p: AddInclusionParams) => {
      const id = inclusionId(p.requestId, p.itemIndex)
      const ref = doc(db, 'projects', p.projectId, 'opsBudgetInclusions', id)
      await setDoc(ref, {
        categoryId: p.categoryId,
        requestId: p.requestId,
        itemIndex: p.itemIndex,
        snapshot: p.snapshot,
        addedBy: p.addedBy,
        addedAt: serverTimestamp(),
      })
    },
    onMutate: async (p) => {
      const key = queryKeys.opsBudget.inclusions(p.projectId)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<OpsBudgetInclusion[]>(key) ?? []
      const optimistic: OpsBudgetInclusion = {
        id: inclusionId(p.requestId, p.itemIndex),
        categoryId: p.categoryId,
        requestId: p.requestId,
        itemIndex: p.itemIndex,
        snapshot: p.snapshot,
        addedBy: p.addedBy,
        addedAt: new Date(),
      }
      queryClient.setQueryData<OpsBudgetInclusion[]>(key, [...previous, optimistic])
      return { previous }
    },
    onError: (_err, p, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.opsBudget.inclusions(p.projectId), ctx.previous)
      }
    },
    // onSettled is intentionally omitted: the realtime onSnapshot listener will reconcile
    // the cache with the server state automatically, so no manual invalidation is needed.
  })
}

interface RemoveInclusionParams {
  projectId: string
  inclusionId: string
}

export function useRemoveInclusion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (p: RemoveInclusionParams) => {
      const ref = doc(db, 'projects', p.projectId, 'opsBudgetInclusions', p.inclusionId)
      await deleteDoc(ref)
    },
    onMutate: async (p) => {
      const key = queryKeys.opsBudget.inclusions(p.projectId)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<OpsBudgetInclusion[]>(key) ?? []
      queryClient.setQueryData<OpsBudgetInclusion[]>(
        key,
        previous.filter((i) => i.id !== p.inclusionId)
      )
      return { previous }
    },
    onError: (_err, p, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.opsBudget.inclusions(p.projectId), ctx.previous)
      }
    },
    // onSettled is intentionally omitted: realtime listener reconciles automatically.
  })
}

// ---------- Delete category with cascading inclusion removal ----------

interface DeleteCategoryWithInclusionsParams {
  projectId: string
  categoryId: string
  nextCategories: OpsBudgetCategory[]   // project.opsBudget.categories AFTER removing this id
  updatedBy: { uid: string; name: string; email: string }
  totalKrw?: number
}

export function useDeleteCategoryWithInclusions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (p: DeleteCategoryWithInclusionsParams) => {
      // Step 1: fetch all inclusions in this category
      const colRef = collection(db, 'projects', p.projectId, 'opsBudgetInclusions')
      const q = query(colRef, where('categoryId', '==', p.categoryId))
      const snap = await getDocs(q)

      // Step 2: build batch — update project doc + delete each inclusion
      const batch = writeBatch(db)
      const projectRef = doc(db, 'projects', p.projectId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opsBudgetPayload: any = {
        opsBudget: {
          categories: p.nextCategories,
          updatedAt: serverTimestamp(),
          updatedBy: p.updatedBy,
          ...(p.totalKrw !== undefined ? { totalKrw: p.totalKrw } : {}),
        },
      }
      batch.set(projectRef, opsBudgetPayload, { merge: true })
      for (const d of snap.docs) {
        batch.delete(d.ref)
      }
      await batch.commit()
    },
    onMutate: async (p) => {
      // Optimistically remove inclusions matching this category
      const incKey = queryKeys.opsBudget.inclusions(p.projectId)
      await queryClient.cancelQueries({ queryKey: incKey })
      const previous = queryClient.getQueryData<OpsBudgetInclusion[]>(incKey) ?? []
      queryClient.setQueryData<OpsBudgetInclusion[]>(
        incKey,
        previous.filter((i) => i.categoryId !== p.categoryId)
      )
      return { previous }
    },
    onError: (_e, p, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKeys.opsBudget.inclusions(p.projectId), ctx.previous)
      }
    },
    onSettled: (_d, _e, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opsBudget.inclusions(vars.projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.opsBudget.includableItems(vars.projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(vars.projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root() })
    },
  })
}

interface UpdateCategoriesParams {
  projectId: string
  categories: OpsBudgetCategory[]
  totalKrw?: number    // if provided, written; if omitted, field is preserved via merge
  updatedBy: { uid: string; name: string; email: string }
}

export function useUpdateOpsBudgetCategories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (p: UpdateCategoriesParams) => {
      const ref = doc(db, 'projects', p.projectId)
      const payload: {
        opsBudget: {
          categories: OpsBudgetCategory[]
          totalKrw?: number
          updatedAt: FieldValue
          updatedBy: { uid: string; name: string; email: string }
        }
      } = {
        opsBudget: {
          categories: p.categories,
          updatedAt: serverTimestamp(),
          updatedBy: p.updatedBy,
          ...(p.totalKrw !== undefined ? { totalKrw: p.totalKrw } : {}),
        },
      }
      await setDoc(ref, payload, { merge: true })
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(vars.projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root() })
    },
    // Optimistic update omitted for category mutations: the category data lives in the
    // project document which requires the current user uid to key the cache. Categories
    // are also edited infrequently, and the useProject realtime listener reconciles the
    // cache within milliseconds of the setDoc call completing.
  })
}
