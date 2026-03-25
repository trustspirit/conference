import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  writeBatch,
  runTransaction
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import { INVENTORY_ITEMS_COLLECTION } from '../../collections'
import { InventoryItem } from '../../types'
import { queryKeys } from './queryKeys'

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  if (typeof val === 'string') return new Date(val)
  return new Date()
}

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
      return snap.docs.map((d) =>
        docToItem(d)
      )
    },
    enabled: !!projectId
  })
}

export function useAllItems() {
  return useQuery({
    queryKey: queryKeys.items.allItems(),
    queryFn: async () => {
      const snap = await getDocs(collection(db, INVENTORY_ITEMS_COLLECTION))
      return snap.docs.map((d) =>
        docToItem(d)
      )
    }
  })
}

export function useCreateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      item: Omit<InventoryItem, 'id' | 'createdAt' | 'lastEditedAt' | 'lastEditedBy'>
    ) => {
      const ref = doc(collection(db, INVENTORY_ITEMS_COLLECTION))
      await setDoc(ref, {
        ...item,
        lastEditedBy: null,
        lastEditedAt: null,
        createdAt: Timestamp.now()
      })
      return ref.id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
    }
  })
}

export function useUpdateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      editor,
      ...fields
    }: Partial<InventoryItem> & {
      id: string
      editor: { uid: string; name: string; email: string }
    }) => {
      await updateDoc(doc(db, INVENTORY_ITEMS_COLLECTION, id), {
        ...fields,
        lastEditedBy: editor,
        lastEditedAt: Timestamp.now()
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
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
          itemIds.map((id) => getDoc(doc(db, INVENTORY_ITEMS_COLLECTION, id)))
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
