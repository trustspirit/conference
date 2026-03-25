import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from 'trust-ui-react'
import { doc, collection, Timestamp, writeBatch } from 'firebase/firestore'
import { db } from '@conference/firebase'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useProject } from '../../contexts/ProjectContext'
import {
  useDeleteItem,
  useBulkCreateItems,
  fetchAllFilteredItems
} from '../../hooks/queries/useItems'
import { INVENTORY_ITEMS_COLLECTION } from '../../collections'
import type { InventoryItem } from '../../types'
import type { EditRow, SortKey, SortDir } from './types'

interface EditFilters {
  search: string
  locationFilter: string
  sortKey: SortKey
  sortDir: SortDir
}

export function useItemsEdit(items: InventoryItem[], filters: EditFilters) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { appUser } = useAuth()
  const { currentProject } = useProject()
  const queryClient = useQueryClient()
  const deleteItem = useDeleteItem()
  const bulkCreate = useBulkCreateItems()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editRows, setEditRows] = useState<EditRow[]>([])
  const [editOriginalItems, setEditOriginalItems] = useState<InventoryItem[]>([])
  const [isLoadingEdit, setIsLoadingEdit] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [editSearch, setEditSearch] = useState('')

  // Clean up when exiting edit mode
  useEffect(() => {
    if (!editing) {
      setEditOriginalItems([])
      setEditSearch('')
    }
  }, [editing])

  // Items used for save comparison
  const referenceItems = editing ? editOriginalItems : items

  const startEditing = useCallback(async () => {
    if (!currentProject) return
    setIsLoadingEdit(true)
    try {
      const allItems = await fetchAllFilteredItems(
        currentProject.id,
        filters.search,
        filters.locationFilter,
        filters.sortKey,
        filters.sortDir
      )
      setEditOriginalItems(allItems)
      setEditRows(
        allItems.map((i) => ({
          id: i.id,
          name: i.name,
          stock: i.stock,
          location: i.location
        }))
      )
      setEditing(true)
    } finally {
      setIsLoadingEdit(false)
    }
  }, [currentProject, filters.search, filters.locationFilter, filters.sortKey, filters.sortDir])

  const cancelEditing = useCallback(() => {
    setEditing(false)
    setEditRows([])
  }, [])

  const addRow = useCallback(() => {
    setEditRows((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, name: '', stock: 0, location: '', isNew: true }
    ])
  }, [])

  const updateEditRow = useCallback(
    (index: number, field: keyof EditRow, value: string | number) => {
      setEditRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
    },
    []
  )

  const removeEditRow = useCallback(
    (index: number) => {
      setEditRows((current) => {
        const row = current[index]
        if (row.isNew) {
          return current.filter((_, i) => i !== index)
        }
        if (confirm(t('items.deleteConfirm'))) {
          deleteItem.mutate(row.id, {
            onSuccess: () => {
              setEditRows((prev) => prev.filter((r) => r.id !== row.id))
              toast({ variant: 'success', message: t('items.itemDeleted') })
            }
          })
        }
        return current
      })
    },
    [deleteItem, t, toast]
  )

  const saveEdits = useCallback(async () => {
    if (!appUser || !currentProject) return
    const editor = { uid: appUser.uid, name: appUser.name, email: appUser.email }
    try {
      const batch = writeBatch(db)
      for (const row of editRows) {
        if (row.isNew) {
          if (!row.name.trim()) continue
          const ref = doc(collection(db, INVENTORY_ITEMS_COLLECTION))
          batch.set(ref, {
            name: row.name,
            nameLower: row.name.toLowerCase(),
            stock: row.stock,
            location: row.location,
            projectIds: [currentProject.id],
            createdBy: editor,
            lastEditedBy: null,
            lastEditedAt: null,
            createdAt: Timestamp.now()
          })
        } else {
          const original = referenceItems.find((i) => i.id === row.id)
          if (
            original &&
            (original.name !== row.name ||
              original.stock !== row.stock ||
              original.location !== row.location)
          ) {
            batch.update(doc(db, INVENTORY_ITEMS_COLLECTION, row.id), {
              name: row.name,
              nameLower: row.name.toLowerCase(),
              stock: row.stock,
              location: row.location,
              lastEditedBy: editor,
              lastEditedAt: Timestamp.now()
            })
          }
        }
      }
      await batch.commit()
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      toast({ variant: 'success', message: t('items.itemSaved') })
      setEditing(false)
      setEditRows([])
    } catch {
      toast({ variant: 'danger', message: t('items.saveFailed') })
    }
  }, [editRows, referenceItems, appUser, currentProject, queryClient, toast, t])

  const exportCsv = useCallback(async () => {
    if (!currentProject) return
    setIsExporting(true)
    try {
      const allItems = await fetchAllFilteredItems(
        currentProject.id,
        filters.search,
        filters.locationFilter,
        filters.sortKey,
        filters.sortDir
      )
      const header = 'name,stock,location'
      const rows = allItems.map(
        (i) => `"${i.name.replace(/"/g, '""')}",${i.stock},"${i.location.replace(/"/g, '""')}"`
      )
      const csv = [header, ...rows].join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventory-${currentProject.name || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast({ variant: 'success', message: t('items.csvExported') })
    } catch {
      toast({ variant: 'danger', message: t('items.exportFailed') })
    } finally {
      setIsExporting(false)
    }
  }, [currentProject, filters.search, filters.locationFilter, filters.sortKey, filters.sortDir, toast, t])

  const importCsv = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !appUser || !currentProject) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        const lines = text.split('\n').filter((l) => l.trim())
        if (lines.length < 2) {
          toast({ variant: 'danger', message: t('items.invalidCsv') })
          return
        }
        const newItems = lines
          .slice(1)
          .map((line) => {
            const parts = line.match(/(".*?"|[^,]+)/g) || []
            const clean = (s: string) =>
              s?.replace(/^"|"$/g, '').replace(/""/g, '"').trim() || ''
            return {
              name: clean(parts[0] || ''),
              stock: parseInt(parts[1]?.trim() || '0', 10) || 0,
              location: clean(parts[2] || ''),
              projectIds: [currentProject.id],
              createdBy: { uid: appUser.uid, name: appUser.name, email: appUser.email }
            }
          })
          .filter((i) => i.name)

        bulkCreate.mutate(newItems, {
          onSuccess: () => toast({ variant: 'success', message: t('items.csvImported') }),
          onError: () => toast({ variant: 'danger', message: t('items.importFailed') })
        })
      }
      reader.readAsText(file)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [appUser, currentProject, bulkCreate, toast, t]
  )

  // Edit-mode search match indices
  const editMatchIndices = useMemo(() => {
    if (!editSearch) return []
    const q = editSearch.toLowerCase()
    return editRows.reduce<number[]>((acc, row, i) => {
      if (row.name.toLowerCase().includes(q) || row.location.toLowerCase().includes(q)) {
        acc.push(i)
      }
      return acc
    }, [])
  }, [editSearch, editRows])

  return {
    // State
    editing,
    editRows,
    editSearch,
    setEditSearch,
    editMatchIndices,
    isLoadingEdit,
    isExporting,
    fileInputRef,
    // Actions
    startEditing,
    cancelEditing,
    addRow,
    updateEditRow,
    removeEditRow,
    saveEdits,
    exportCsv,
    importCsv
  }
}
