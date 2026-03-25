import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from 'trust-ui-react'
import { useAuth } from '../../contexts/AuthContext'
import { useMoveItems, useBulkDeleteItems } from '../../hooks/queries/useItems'
import type { InventoryItem } from '../../types'

export function useItemsSelection(items: InventoryItem[]) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { appUser } = useAuth()
  const moveItemsMutation = useMoveItems()
  const bulkDeleteMutation = useBulkDeleteItems()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)))
    }
  }, [selectedIds.size, items])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleMove = useCallback(
    (targetProjectId: string) => {
      if (selectedIds.size === 0 || !appUser) return
      moveItemsMutation.mutate(
        {
          itemIds: Array.from(selectedIds),
          targetProjectId,
          editor: { uid: appUser.uid, name: appUser.name, email: appUser.email }
        },
        {
          onSuccess: () => {
            toast({ variant: 'success', message: t('items.itemsMoved') })
            setSelectedIds(new Set())
            setMoveDialogOpen(false)
          }
        }
      )
    },
    [selectedIds, appUser, moveItemsMutation, toast, t]
  )

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    if (!confirm(t('items.bulkDeleteConfirm', { count }))) return
    bulkDeleteMutation.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        toast({ variant: 'success', message: t('items.itemsDeleted', { count }) })
        setSelectedIds(new Set())
      }
    })
  }, [selectedIds, bulkDeleteMutation, toast, t])

  return {
    selectedIds,
    moveDialogOpen,
    setMoveDialogOpen,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    handleMove,
    handleBulkDelete,
    isDeleting: bulkDeleteMutation.isPending
  }
}
