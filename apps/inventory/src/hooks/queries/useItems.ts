import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData
} from '@tanstack/react-query'
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  runTransaction,
  QueryConstraint,
  QueryDocumentSnapshot
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import { INVENTORY_ITEMS_COLLECTION } from '../../collections'
import { InventoryItem } from '../../types'
import { queryKeys, type ItemsFilterParams } from './queryKeys'
import { toDate } from '../../lib/firestore'
import type { SortKey, SortDir } from '../../pages/items/types'

function docToItem(d: { id: string; data(): Record<string, unknown> }): InventoryItem {
  const data = d.data()
  return {
    id: d.id,
    name: (data.name as string) || '',
    stock: (data.stock as number) || 0,
    location: (data.location as string) || '',
    projectIds: (data.projectIds as string[]) || [],
    lastEditedBy: (data.lastEditedBy as InventoryItem['lastEditedBy']) || null,
    lastEditedAt: data.lastEditedAt ? toDate(data.lastEditedAt) : null,
    createdBy: data.createdBy as InventoryItem['createdBy'],
    createdAt: toDate(data.createdAt)
  }
}

const PAGE_SIZE = 20

/**
 * Builds the shared filter + sort constraints used by both paginated and full-fetch queries.
 */
function buildFilterConstraints(
  projectId: string,
  search: string,
  locationFilter: string,
  sortKey: SortKey,
  sortDir: SortDir
): QueryConstraint[] {
  const constraints: QueryConstraint[] = [where('projectIds', 'array-contains', projectId)]

  if (locationFilter) {
    constraints.push(where('location', '==', locationFilter))
  }

  if (search) {
    const prefix = search.toLowerCase()
    constraints.push(where('nameLower', '>=', prefix))
    constraints.push(where('nameLower', '<=', prefix + '\uf8ff'))
  }

  // Map 'name' sort to the normalised field so ordering is case-insensitive.
  const firestoreSortField = sortKey === 'name' ? 'nameLower' : sortKey

  // Firestore requires the first orderBy to match the range field.
  // When prefix search is active (range on 'nameLower'), we must orderBy('nameLower') first,
  // then the user's chosen sort field (if different).
  if (search && firestoreSortField !== 'nameLower') {
    constraints.push(orderBy('nameLower'))
    constraints.push(orderBy(firestoreSortField, sortDir))
  } else {
    constraints.push(orderBy(firestoreSortField, sortDir))
  }

  return constraints
}

function buildItemsQuery(
  projectId: string,
  search: string,
  locationFilter: string,
  sortKey: SortKey,
  sortDir: SortDir,
  cursor: QueryDocumentSnapshot | null
) {
  const constraints = buildFilterConstraints(projectId, search, locationFilter, sortKey, sortDir)

  if (cursor) {
    constraints.push(startAfter(cursor))
  }

  constraints.push(limit(PAGE_SIZE))

  return query(collection(db, INVENTORY_ITEMS_COLLECTION), ...constraints)
}

interface ItemsPage {
  items: InventoryItem[]
  lastDoc: QueryDocumentSnapshot | null
}

export function useInfiniteItems(
  projectId: string | undefined,
  search: string,
  locationFilter: string,
  sortKey: SortKey,
  sortDir: SortDir
) {
  const params: ItemsFilterParams = {
    projectId: projectId || '',
    search,
    locationFilter,
    sortKey,
    sortDir
  }

  return useInfiniteQuery<
    ItemsPage,
    Error,
    InfiniteData<ItemsPage, QueryDocumentSnapshot | null>,
    readonly ['inventory-items', 'infinite', ItemsFilterParams],
    QueryDocumentSnapshot | null
  >({
    queryKey: queryKeys.items.infinite(params),
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      if (!projectId) return { items: [], lastDoc: null }
      const q = buildItemsQuery(projectId, search, locationFilter, sortKey, sortDir, pageParam)
      const snap = await getDocs(q)
      return {
        items: snap.docs.map(docToItem),
        lastDoc: snap.docs[snap.docs.length - 1] ?? null
      }
    },
    getNextPageParam: (lastPage) =>
      lastPage.items.length < PAGE_SIZE ? undefined : lastPage.lastDoc,
    enabled: !!projectId
  })
}

export async function fetchAllFilteredItems(
  projectId: string,
  search: string,
  locationFilter: string,
  sortKey: SortKey,
  sortDir: SortDir
): Promise<InventoryItem[]> {
  const constraints = buildFilterConstraints(projectId, search, locationFilter, sortKey, sortDir)
  const q = query(collection(db, INVENTORY_ITEMS_COLLECTION), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map(docToItem)
}

export function useItems(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.items.all(projectId || ''),
    queryFn: async () => {
      if (!projectId) return []
      const q = query(
        collection(db, INVENTORY_ITEMS_COLLECTION),
        where('projectIds', 'array-contains', projectId)
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => docToItem(d))
    },
    enabled: !!projectId
  })
}

export function useAllItems() {
  return useQuery({
    queryKey: queryKeys.items.allItems(),
    queryFn: async () => {
      const snap = await getDocs(collection(db, INVENTORY_ITEMS_COLLECTION))
      return snap.docs.map((d) => docToItem(d))
    }
  })
}

export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, INVENTORY_ITEMS_COLLECTION, id))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
    }
  })
}

export function useBulkDeleteItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
        const chunk = ids.slice(i, i + BATCH_LIMIT)
        const batch = writeBatch(db)
        for (const id of chunk) {
          batch.delete(doc(db, INVENTORY_ITEMS_COLLECTION, id))
        }
        await batch.commit()
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
    }
  })
}

const BATCH_LIMIT = 500

export function useBulkCreateItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      items: Omit<InventoryItem, 'id' | 'createdAt' | 'lastEditedAt' | 'lastEditedBy'>[]
    ) => {
      for (let i = 0; i < items.length; i += BATCH_LIMIT) {
        const chunk = items.slice(i, i + BATCH_LIMIT)
        const batch = writeBatch(db)
        for (const item of chunk) {
          const ref = doc(collection(db, INVENTORY_ITEMS_COLLECTION))
          batch.set(ref, {
            ...item,
            nameLower: item.name.toLowerCase(),
            lastEditedBy: null,
            lastEditedAt: null,
            createdAt: Timestamp.now()
          })
        }
        await batch.commit()
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
    }
  })
}

export function useMoveItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      itemIds,
      targetProjectId,
      removeFromProjectId,
      editor
    }: {
      itemIds: string[]
      targetProjectId: string
      removeFromProjectId?: string
      editor: { uid: string; name: string; email: string }
    }) => {
      await runTransaction(db, async (transaction) => {
        const snapshots = await Promise.all(
          itemIds.map((id) => transaction.get(doc(db, INVENTORY_ITEMS_COLLECTION, id)))
        )
        for (const snap of snapshots) {
          if (!snap.exists()) continue
          const data = snap.data()
          let projectIds: string[] = data.projectIds || []
          if (removeFromProjectId) {
            projectIds = projectIds.filter((id: string) => id !== removeFromProjectId)
          }
          if (!projectIds.includes(targetProjectId)) {
            projectIds.push(targetProjectId)
          }
          transaction.update(snap.ref, {
            projectIds,
            lastEditedBy: editor,
            lastEditedAt: Timestamp.now()
          })
        }
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
    }
  })
}
