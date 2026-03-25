import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Spinner from '../components/Spinner'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { useInfiniteItems } from '../hooks/queries/useItems'
import { useProjects } from '../hooks/queries/useProjects'
import { canWrite, canMoveItems } from '../lib/roles'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useItemsEdit } from './items/useItemsEdit'
import { useItemsSelection } from './items/useItemsSelection'
import { ItemsToolbar } from './items/ItemsToolbar'
import { EditModeBar } from './items/EditModeBar'
import { ItemsTable } from './items/ItemsTable'
import { MoveDialog } from './items/MoveDialog'
import type { SortKey, SortDir } from './items/types'

export default function ItemsPage() {
  const { t } = useTranslation()
  const { appUser } = useAuth()
  const { currentProject } = useProject()
  const { data: allProjects = [] } = useProjects()

  // Filter & sort state
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const debouncedSearch = useDebouncedValue(search, 300)

  // Paginated data
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteItems(
    currentProject?.id,
    debouncedSearch,
    locationFilter,
    sortKey,
    sortDir
  )
  const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data])
  const locations = useMemo(() => {
    const set = new Set(items.map((i) => i.location).filter((loc): loc is string => Boolean(loc)))
    return Array.from(set).sort()
  }, [items])

  // Edit hook — owns all edit state & logic
  const edit = useItemsEdit(items, {
    search: debouncedSearch,
    locationFilter,
    sortKey,
    sortDir
  })

  // Selection hook — owns selection, move, bulk delete
  const selection = useItemsSelection(items)

  // Permissions
  const writable = canWrite(appUser?.role)
  const movable = canMoveItems(appUser?.role)

  const handleSortChange = (key: SortKey, dir: SortDir) => {
    setSortKey(key)
    setSortDir(dir)
  }

  if (isLoading) return <Spinner />

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-gray-500">{t('projects.noProjects')}</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('items.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{currentProject.name}</p>
      </div>

      <ItemsToolbar
        search={search}
        onSearchChange={setSearch}
        locationFilter={locationFilter}
        onLocationFilterChange={setLocationFilter}
        locations={locations}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        writable={writable}
        editing={edit.editing}
        canMove={movable}
        selectedCount={selection.selectedIds.size}
        onStartEditing={edit.startEditing}
        isLoadingEdit={edit.isLoadingEdit}
        onExportCsv={edit.exportCsv}
        onImportCsv={edit.importCsv}
        fileInputRef={edit.fileInputRef}
        onOpenMoveDialog={() => selection.setMoveDialogOpen(true)}
        onBulkDelete={selection.handleBulkDelete}
        isDeleting={selection.isDeleting}
      />

      {edit.editing && (
        <EditModeBar
          addRow={edit.addRow}
          cancelEditing={edit.cancelEditing}
          saveEdits={edit.saveEdits}
          editSearch={edit.editSearch}
          onEditSearchChange={edit.setEditSearch}
          matchCount={edit.editMatchIndices.length}
        />
      )}

      <ItemsTable
        editing={edit.editing}
        canMove={movable}
        items={items}
        editRows={edit.editRows}
        selectedIds={selection.selectedIds}
        allProjects={allProjects}
        hasNextPage={hasNextPage ?? false}
        isFetchingNextPage={isFetchingNextPage}
        onFetchNextPage={fetchNextPage}
        toggleSelectAll={selection.toggleSelectAll}
        toggleSelect={selection.toggleSelect}
        updateEditRow={edit.updateEditRow}
        removeEditRow={edit.removeEditRow}
        editMatchIndices={edit.editMatchIndices}
      />

      <div className="mt-3 text-xs text-gray-400">
        {items.length} {t('items.title').toLowerCase()}
        {edit.isExporting && <span className="ml-2">({t('items.exporting')}...)</span>}
      </div>

      {selection.moveDialogOpen && (
        <MoveDialog
          selectedCount={selection.selectedIds.size}
          allProjects={allProjects}
          currentProjectId={currentProject.id}
          onClose={() => selection.setMoveDialogOpen(false)}
          onMove={selection.handleMove}
        />
      )}
    </div>
  )
}
