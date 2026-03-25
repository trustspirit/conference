import { useTranslation } from 'react-i18next'
import type { SortKey, SortDir } from './types'

interface Props {
  search: string
  onSearchChange: (value: string) => void
  locationFilter: string
  onLocationFilterChange: (value: string) => void
  locations: string[]
  sortKey: SortKey
  sortDir: SortDir
  onSortChange: (key: SortKey, dir: SortDir) => void
  writable: boolean
  editing: boolean
  canMove: boolean
  selectedCount: number
  onStartEditing: () => void
  isLoadingEdit: boolean
  onExportCsv: () => void
  onImportCsv: (e: React.ChangeEvent<HTMLInputElement>) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onOpenMoveDialog: () => void
  onBulkDelete: () => void
  isDeleting: boolean
}

export function ItemsToolbar({
  search,
  onSearchChange,
  locationFilter,
  onLocationFilterChange,
  locations,
  sortKey,
  sortDir,
  onSortChange,
  writable,
  editing,
  canMove,
  selectedCount,
  onStartEditing,
  isLoadingEdit,
  onExportCsv,
  onImportCsv,
  fileInputRef,
  onOpenMoveDialog,
  onBulkDelete,
  isDeleting
}: Props) {
  const { t } = useTranslation()

  const sortLabel: Record<SortKey, string> = {
    name: t('items.name'),
    stock: t('items.stock'),
    location: t('items.location'),
    createdAt: t('items.createdAt')
  }

  const hasSelection = selectedCount > 0 && !editing

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 sm:max-w-xs">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('items.search')}
          disabled={editing}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <select
        value={locationFilter}
        onChange={(e) => onLocationFilterChange(e.target.value)}
        disabled={editing}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">{t('items.allLocations')}</option>
        {locations.map((loc) => (
          <option key={loc} value={loc}>
            {loc}
          </option>
        ))}
      </select>
      <select
        value={`${sortKey}:${sortDir}`}
        onChange={(e) => {
          const [key, dir] = e.target.value.split(':') as [SortKey, SortDir]
          onSortChange(key, dir)
        }}
        disabled={editing}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {(Object.keys(sortLabel) as SortKey[]).flatMap((key) =>
          (['asc', 'desc'] as SortDir[]).map((dir) => (
            <option key={`${key}:${dir}`} value={`${key}:${dir}`}>
              {sortLabel[key]} {dir === 'asc' ? '↑' : '↓'}
            </option>
          ))
        )}
      </select>
      <div className="flex gap-2 ml-auto">
        {writable && !editing && (
          <>
            <button
              onClick={onStartEditing}
              disabled={isLoadingEdit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoadingEdit ? '...' : t('items.edit')}
            </button>
            <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {t('items.importCsv')}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={onImportCsv}
                className="hidden"
              />
            </label>
          </>
        )}
        <button
          onClick={onExportCsv}
          disabled={editing}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {t('items.exportCsv')}
        </button>
        {hasSelection && (
          <>
            {canMove && (
              <button
                onClick={onOpenMoveDialog}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                {t('items.moveItems')} ({selectedCount})
              </button>
            )}
            {writable && (
              <button
                onClick={onBulkDelete}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {t('items.deleteSelected')} ({selectedCount})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
