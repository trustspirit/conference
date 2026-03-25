import { useState, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from 'trust-ui-react'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import {
  useItems,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useBulkCreateItems,
  useMoveItems
} from '../hooks/queries/useItems'
import { useProjects } from '../hooks/queries/useProjects'
import { canWrite, canMoveItems } from '../lib/roles'
import Spinner from '../components/Spinner'

type SortKey = 'name' | 'stock' | 'location' | 'createdAt'
type SortDir = 'asc' | 'desc'

interface EditRow {
  id: string
  name: string
  stock: number
  location: string
  isNew?: boolean
}

export default function ItemsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { appUser } = useAuth()
  const { currentProject } = useProject()
  const { data: items = [], isLoading } = useItems(currentProject?.id)
  const { data: allProjects = [] } = useProjects()
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const deleteItem = useDeleteItem()
  const bulkCreate = useBulkCreateItems()
  const moveItems = useMoveItems()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [editing, setEditing] = useState(false)
  const [editRows, setEditRows] = useState<EditRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [moveTargetProject, setMoveTargetProject] = useState('')

  const writable = canWrite(appUser?.role)
  const canMove = canMoveItems(appUser?.role)

  const locations = useMemo(() => {
    const set = new Set(items.map((i) => i.location).filter(Boolean))
    return Array.from(set).sort()
  }, [items])

  const filtered = useMemo(() => {
    let result = [...items]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q)
      )
    }
    if (locationFilter) {
      result = result.filter((i) => i.location === locationFilter)
    }
    result.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortKey === 'stock') cmp = a.stock - b.stock
      else if (sortKey === 'location') cmp = a.location.localeCompare(b.location)
      else if (sortKey === 'createdAt') cmp = a.createdAt.getTime() - b.createdAt.getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [items, search, locationFilter, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 text-gray-400">
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  const startEditing = () => {
    setEditRows(
      filtered.map((i) => ({
        id: i.id,
        name: i.name,
        stock: i.stock,
        location: i.location
      }))
    )
    setEditing(true)
  }

  const addRow = () => {
    setEditRows((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, name: '', stock: 0, location: '', isNew: true }
    ])
  }

  const updateEditRow = (index: number, field: keyof EditRow, value: string | number) => {
    setEditRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  const removeEditRow = (index: number) => {
    const row = editRows[index]
    if (row.isNew) {
      setEditRows((prev) => prev.filter((_, i) => i !== index))
    } else {
      if (confirm(t('items.deleteConfirm'))) {
        deleteItem.mutate(row.id, {
          onSuccess: () => {
            setEditRows((prev) => prev.filter((_, i) => i !== index))
            toast({ variant: 'success', message: t('items.itemDeleted') })
          }
        })
      }
    }
  }

  const saveEdits = async () => {
    if (!appUser || !currentProject) return
    const editor = { uid: appUser.uid, name: appUser.name, email: appUser.email }
    try {
      for (const row of editRows) {
        if (row.isNew) {
          if (!row.name.trim()) continue
          await createItem.mutateAsync({
            name: row.name,
            stock: row.stock,
            location: row.location,
            projectIds: [currentProject.id],
            createdBy: editor
          })
        } else {
          const original = items.find((i) => i.id === row.id)
          if (
            original &&
            (original.name !== row.name ||
              original.stock !== row.stock ||
              original.location !== row.location)
          ) {
            await updateItem.mutateAsync({
              id: row.id,
              name: row.name,
              stock: row.stock,
              location: row.location,
              editor
            })
          }
        }
      }
      toast({ variant: 'success', message: t('items.itemSaved') })
      setEditing(false)
      setEditRows([])
    } catch {
      toast({ variant: 'danger', message: 'Save failed' })
    }
  }

  const cancelEditing = () => {
    setEditing(false)
    setEditRows([])
  }

  // CSV Export
  const exportCsv = () => {
    const header = 'name,stock,location'
    const rows = filtered.map(
      (i) => `"${i.name.replace(/"/g, '""')}",${i.stock},"${i.location.replace(/"/g, '""')}"`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-${currentProject?.name || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ variant: 'success', message: t('items.csvExported') })
  }

  // CSV Import
  const importCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          const clean = (s: string) => s?.replace(/^"|"$/g, '').replace(/""/g, '"').trim() || ''
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
        onError: () => toast({ variant: 'danger', message: 'Import failed' })
      })
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Move items
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)))
    }
  }

  const handleMove = () => {
    if (!moveTargetProject || selectedIds.size === 0 || !appUser) return
    moveItems.mutate(
      {
        itemIds: Array.from(selectedIds),
        targetProjectId: moveTargetProject,
        editor: { uid: appUser.uid, name: appUser.name, email: appUser.email }
      },
      {
        onSuccess: () => {
          toast({ variant: 'success', message: t('items.itemsMoved') })
          setSelectedIds(new Set())
          setMoveDialogOpen(false)
          setMoveTargetProject('')
        }
      }
    )
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('items.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{currentProject.name}</p>
      </div>

      {/* Toolbar */}
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('items.search')}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">{t('items.allLocations')}</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <div className="flex gap-2 ml-auto">
          {writable && !editing && (
            <>
              <button
                onClick={startEditing}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {t('items.edit')}
              </button>
              <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                {t('items.importCsv')}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={importCsv}
                  className="hidden"
                />
              </label>
            </>
          )}
          <button
            onClick={exportCsv}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('items.exportCsv')}
          </button>
          {canMove && !editing && selectedIds.size > 0 && (
            <button
              onClick={() => setMoveDialogOpen(true)}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              {t('items.moveItems')} ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Edit mode bar */}
      {editing && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-blue-50 p-3">
          <span className="text-sm font-medium text-blue-800">{t('items.editing')}</span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={addRow}
              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              + {t('items.addRow')}
            </button>
            <button
              onClick={cancelEditing}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('items.cancel')}
            </button>
            <button
              onClick={saveEdits}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('items.save')}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {canMove && !editing && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              <th
                className="cursor-pointer px-4 py-3 font-semibold text-gray-600"
                onClick={() => toggleSort('name')}
              >
                {t('items.name')}
                <SortIcon col="name" />
              </th>
              <th
                className="cursor-pointer px-4 py-3 font-semibold text-gray-600"
                onClick={() => toggleSort('stock')}
              >
                {t('items.stock')}
                <SortIcon col="stock" />
              </th>
              <th
                className="cursor-pointer px-4 py-3 font-semibold text-gray-600"
                onClick={() => toggleSort('location')}
              >
                {t('items.location')}
                <SortIcon col="location" />
              </th>
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
              ? editRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-50 ${row.isNew ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}
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
                        onChange={(e) => updateEditRow(idx, 'stock', parseInt(e.target.value) || 0)}
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
                ))
              : filtered.map((item) => (
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
        {!editing && filtered.length === 0 && (
          <div className="p-12 text-center text-sm text-gray-400">{t('items.noItems')}</div>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-400">
        {filtered.length} / {items.length} {t('items.title').toLowerCase()}
      </div>

      {/* Move Dialog */}
      {moveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">{t('items.moveToProject')}</h3>
            <p className="mb-4 text-sm text-gray-500">
              {t('items.selectedCount', { count: selectedIds.size })}
            </p>
            <select
              value={moveTargetProject}
              onChange={(e) => setMoveTargetProject(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">{t('items.moveToProject')}</option>
              {allProjects
                .filter((p) => p.id !== currentProject?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMoveDialogOpen(false)
                  setMoveTargetProject('')
                }}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('items.cancel')}
              </button>
              <button
                onClick={handleMove}
                disabled={!moveTargetProject}
                className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {t('items.assignToProject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
