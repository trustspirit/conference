import { useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { InventoryItem } from '../../types'
import type { Project } from '../../types'
import type { EditRow } from './types'

interface Props {
  editing: boolean
  canMove: boolean
  items: InventoryItem[]
  editRows: EditRow[]
  selectedIds: Set<string>
  allProjects: Project[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onFetchNextPage: () => void
  toggleSelectAll: () => void
  toggleSelect: (id: string) => void
  updateEditRow: (index: number, field: keyof EditRow, value: string | number) => void
  removeEditRow: (index: number) => void
  editMatchIndices: number[]
}

export function ItemsTable({
  editing,
  canMove,
  items,
  editRows,
  selectedIds,
  allProjects,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
  toggleSelectAll,
  toggleSelect,
  updateEditRow,
  removeEditRow,
  editMatchIndices
}: Props) {
  const { t } = useTranslation()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const firstMatchRef = useRef<HTMLTableRowElement>(null)

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        onFetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, onFetchNextPage]
  )

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || editing) return

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: '200px'
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleIntersection, editing])

  // Scroll to first matching row when edit search changes
  useEffect(() => {
    if (editMatchIndices.length > 0 && firstMatchRef.current) {
      firstMatchRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [editMatchIndices])

  const matchSet = new Set(editMatchIndices)
  const firstMatchIdx = editMatchIndices[0] ?? -1

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {canMove && !editing && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === items.length && items.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              <th className="px-4 py-3 font-semibold text-gray-600">{t('items.name')}</th>
              <th className="px-4 py-3 font-semibold text-gray-600">{t('items.stock')}</th>
              <th className="px-4 py-3 font-semibold text-gray-600">{t('items.location')}</th>
              {!editing && (
                <>
                  <th className="px-4 py-3 font-semibold text-gray-600">
                    {t('items.lastEditedBy')}
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600">{t('items.projects')}</th>
                </>
              )}
              {editing && <th className="w-16 px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {editing
              ? editRows.map((row, idx) => {
                  const isMatch = matchSet.has(idx)
                  const isFirstMatch = idx === firstMatchIdx
                  return (
                    <tr
                      key={row.id}
                      ref={isFirstMatch ? firstMatchRef : undefined}
                      className={`border-b border-gray-50 ${
                        isMatch
                          ? 'bg-yellow-50 ring-1 ring-inset ring-yellow-300'
                          : row.isNew
                            ? 'bg-green-50/50'
                            : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-1">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateEditRow(idx, 'name', e.target.value)}
                          className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder={t('items.name')}
                        />
                      </td>
                      <td className="px-4 py-1">
                        <input
                          type="number"
                          value={row.stock}
                          onChange={(e) =>
                            updateEditRow(idx, 'stock', parseInt(e.target.value) || 0)
                          }
                          className="w-24 rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min={0}
                        />
                      </td>
                      <td className="px-4 py-1">
                        <input
                          type="text"
                          value={row.location}
                          onChange={(e) => updateEditRow(idx, 'location', e.target.value)}
                          className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder={t('items.location')}
                        />
                      </td>
                      <td className="px-4 py-1">
                        <button
                          onClick={() => removeEditRow(idx)}
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })
              : items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    {canMove && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.stock === 0
                            ? 'bg-red-100 text-red-700'
                            : item.stock < 5
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.location}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {item.lastEditedBy ? (
                        <span>{item.lastEditedBy.name}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.projectIds.map((pid) => {
                          const proj = allProjects.find((p) => p.id === pid)
                          return (
                            <span
                              key={pid}
                              className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                            >
                              {proj?.name || pid.slice(0, 6)}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!editing && items.length === 0 && (
          <div className="p-12 text-center text-sm text-gray-400">{t('items.noItems')}</div>
        )}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="flex justify-center py-4">
        {isFetchingNextPage && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        )}
      </div>
    </>
  )
}
