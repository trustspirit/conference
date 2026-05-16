import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import type { Committee, RequestStatus, PaymentRequest } from '../types'
import { formatFirestoreTime } from '../lib/utils'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'
import InfiniteScrollSentinel from '../components/InfiniteScrollSentinel'
import Tooltip from '../components/Tooltip'
import { useTranslation } from 'react-i18next'
import { Select, Dialog, Button } from 'trust-ui-react'
import { canSeeCommitteeRequests, DEFAULT_APPROVAL_THRESHOLD } from '../lib/roles'
import { useInfiniteRequests, fetchAllRequests } from '../hooks/queries/useRequests'
import {
  exportRequestsCsv,
  exportRequestsByBudgetCodeCsv,
  DEFAULT_CSV_COLUMNS,
  OPTIONAL_CSV_COLUMNS,
  getCsvColumnLabel,
  type CsvColumnKey
} from '../lib/csvExport'

type SortKey = 'date' | 'payee' | 'totalAmount' | 'status'
type SortDir = 'asc' | 'desc'

function SortIcon({
  columnKey,
  sortKey,
  sortDir
}: {
  columnKey: SortKey
  sortKey: SortKey
  sortDir: SortDir
}) {
  if (sortKey !== columnKey) return null
  return (
    <svg
      className="inline-block w-3 h-3 ml-1 text-blue-600"
      viewBox="0 0 12 12"
      fill="currentColor"
    >
      {sortDir === 'asc' ? <path d="M6 3l4 6H2l4-6z" /> : <path d="M6 9L2 3h8l-4 6z" />}
    </svg>
  )
}

export default function AdminRequestsPage() {
  const { t } = useTranslation()
  const { appUser } = useAuth()
  const { currentProject } = useProject()
  const role = appUser?.role || 'user'
  const [filter, setFilter] = useState<RequestStatus | 'all'>('all')
  const [committeeFilter, setCommitteeFilter] = useState<Committee | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const firestoreStatus: RequestStatus | RequestStatus[] | undefined =
    filter === 'all' ? undefined : filter === 'rejected' ? ['rejected', 'force_rejected'] : filter
  const sortParam = useMemo(() => ({ field: sortKey, dir: sortDir }), [sortKey, sortDir])

  const firestoreCommittee = committeeFilter === 'all' ? undefined : committeeFilter

  const { data, isLoading, isFetching, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteRequests(currentProject?.id, firestoreStatus, sortParam, firestoreCommittee)

  const [isExporting, setIsExporting] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [selectedOptionalColumns, setSelectedOptionalColumns] = useState<Set<CsvColumnKey>>(
    new Set()
  )
  const [exportMode, setExportMode] = useState<'byRequest' | 'byBudgetCode'>('byRequest')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleOptionalColumn = (key: CsvColumnKey) => {
    setSelectedOptionalColumns((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleExportCsv = useCallback(async () => {
    if (!currentProject?.id || isExporting) return
    setIsExporting(true)
    try {
      let toExport: PaymentRequest[]
      if (selectedIds.size > 0) {
        toExport = accessible.filter((r) => selectedIds.has(r.id))
      } else {
        const all = await fetchAllRequests(currentProject.id, firestoreCommittee)
        toExport = all.filter(
          (r) => canSeeCommitteeRequests(role, r.committee) && r.status !== 'cancelled'
        )
      }
      const columns = [...DEFAULT_CSV_COLUMNS, ...selectedOptionalColumns]
      if (exportMode === 'byBudgetCode') {
        exportRequestsByBudgetCodeCsv(toExport, columns)
      } else {
        exportRequestsCsv(toExport, columns)
      }
      setExportDialogOpen(false)
    } catch {
      alert(t('common.loadError'))
    } finally {
      setIsExporting(false)
    }
  }, [currentProject?.id, role, firestoreCommittee, selectedOptionalColumns, exportMode, selectedIds, accessible, t])

  const allRequests = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data])

  const threshold = currentProject?.directorApprovalThreshold ?? DEFAULT_APPROVAL_THRESHOLD

  // Hide original requests that have been resubmitted (replaced by newer version)
  const resubmittedIds = useMemo(
    () => new Set(allRequests.filter((r) => r.originalRequestId).map((r) => r.originalRequestId!)),
    [allRequests]
  )

  const accessible = useMemo(() => {
    const filtered =
      filter === 'all'
        ? allRequests.filter(
            (r) =>
              canSeeCommitteeRequests(role, r.committee) &&
              r.status !== 'cancelled' &&
              !resubmittedIds.has(r.id)
          )
        : allRequests.filter(
            (r) => canSeeCommitteeRequests(role, r.committee) && !resubmittedIds.has(r.id)
          )
    // Stable secondary sort by createdAt within same primary sort value
    const toTime = (d: unknown): number => {
      if (!d) return 0
      if (d instanceof Date) return d.getTime()
      if (typeof d === 'object' && d !== null && 'toDate' in d)
        return (d as { toDate: () => Date }).toDate().getTime()
      return 0
    }
    return filtered.slice().sort((a, b) => {
      const aKey = String((a as unknown as Record<string, unknown>)[sortKey] ?? '')
      const bKey = String((b as unknown as Record<string, unknown>)[sortKey] ?? '')
      if (aKey !== bKey) return 0 // already sorted by Firestore
      return sortDir === 'desc'
        ? toTime(b.createdAt) - toTime(a.createdAt)
        : toTime(a.createdAt) - toTime(b.createdAt)
    })
  }, [allRequests, filter, committeeFilter, role, sortKey, sortDir, resubmittedIds])

  const allSelected =
    accessible.length > 0 && accessible.every((r) => selectedIds.has(r.id))

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(accessible.map((r) => r.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'date' ? 'desc' : 'asc')
    }
  }

  const filterTabs = ['all', 'pending', 'reviewed', 'approved', 'settled', 'rejected'] as const

  const committeeTabs = useMemo(() => {
    const canOps = canSeeCommitteeRequests(role, 'operations')
    const canPrep = canSeeCommitteeRequests(role, 'preparation')
    if (canOps && canPrep) return ['all', 'operations', 'preparation'] as const
    return null
  }, [role])

  // Remarks column content
  const renderRemarks = (req: (typeof allRequests)[0]) => {
    const parts: React.ReactNode[] = []

    // Resubmission badge + original link
    if (req.originalRequestId) {
      parts.push(
        <span key="resub-group" className="inline-flex items-center gap-1">
          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
            {t('approval.resubmitted')}
          </span>
          <Link
            to={`/request/${req.originalRequestId}`}
            className="text-[10px] text-amber-600 hover:text-amber-800 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {t('approval.viewOriginal')}
          </Link>
        </span>
      )
    }

    if (
      req.reviewedBy &&
      (req.status === 'reviewed' || req.status === 'approved' || req.status === 'settled') &&
      !(req.approvedBy && req.reviewedBy.uid === req.approvedBy.uid)
    ) {
      parts.push(
        <Tooltip
          key="reviewed"
          text={`${t('approval.reviewedBy')}: ${req.reviewedBy.name}`}
          maxWidth="160px"
        />
      )
    }
    if (req.approvedBy && (req.status === 'approved' || req.status === 'settled')) {
      parts.push(
        <Tooltip
          key="approved"
          text={`${t('field.approvedBy')}: ${req.approvedBy.name}`}
          maxWidth="160px"
        />
      )
    }
    if (req.approvedBy && req.status === 'rejected' && req.rejectionReason) {
      parts.push(
        <Tooltip
          key="rejected"
          text={`${req.approvedBy.name}: ${req.rejectionReason}`}
          maxWidth="160px"
          className="text-red-500"
        />
      )
    }
    if (req.status === 'force_rejected' && req.rejectionReason) {
      parts.push(
        <Tooltip
          key="force"
          text={req.rejectionReason}
          maxWidth="160px"
          className="text-orange-600"
        />
      )
    }
    if ((req.status === 'reviewed' || req.status === 'pending') && req.totalAmount > threshold) {
      parts.push(
        <Tooltip
          key="director"
          text={t('approval.directorRequired')}
          maxWidth="160px"
          className="text-orange-600"
        />
      )
    }

    return parts.length > 0 ? (
      <div className="flex flex-wrap items-center gap-1">{parts}</div>
    ) : null
  }

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-bold">{t('nav.adminRequests')}</h2>
          <div className="flex items-center gap-2">
            {committeeTabs?.map((c) => (
              <button
                key={c}
                onClick={() => { setCommitteeFilter(c); setSelectedIds(new Set()) }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  committeeFilter === c
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c === 'all' ? t('status.all') : t(`committee.${c}Short`)}
              </button>
            ))}
            <button
              onClick={() => setExportDialogOpen(true)}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
            >
              {selectedIds.size > 0
                ? `${t('common.exportCsv')} (${selectedIds.size})`
                : t('common.exportCsv')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {filterTabs.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setSelectedIds(new Set()) }}
            className={`px-4 py-2.5 rounded text-sm ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {t(`status.${f}`, f)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {/* Desktop table view */}
          <div className="hidden sm:block">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                        />
                      </th>
                      {(
                        [
                          { key: 'date' as SortKey, label: t('field.date'), align: 'text-left' },
                          { key: 'payee' as SortKey, label: t('field.payee'), align: 'text-left' },
                          { key: null, label: t('field.committee'), align: 'text-left' },
                          {
                            key: 'totalAmount' as SortKey,
                            label: t('field.totalAmount'),
                            align: 'text-right'
                          },
                          {
                            key: 'status' as SortKey,
                            label: t('status.label'),
                            align: 'text-center'
                          },
                          { key: null, label: t('field.remarks'), align: 'text-left' }
                        ] as const
                      ).map((col, i) => (
                        <th
                          key={i}
                          className={`${col.align} px-4 py-3 font-medium select-none ${
                            col.key
                              ? `cursor-pointer hover:text-gray-900 ${sortKey === col.key ? 'text-blue-600' : 'text-gray-600'}`
                              : 'text-gray-600'
                          }`}
                          onClick={col.key ? () => handleSort(col.key!) : undefined}
                        >
                          {col.label}
                          {col.key && (
                            <SortIcon columnKey={col.key} sortKey={sortKey} sortDir={sortDir} />
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y transition-opacity ${isFetching && !isFetchingNextPage ? 'opacity-40' : ''}`}
                  >
                    {accessible.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(req.id)}
                            onChange={() => toggleOne(req.id)}
                            className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/request/${req.id}`}
                            state={{ from: '/admin/requests' }}
                            className="text-blue-600 hover:underline"
                          >
                            {req.date}
                          </Link>
                          {formatFirestoreTime(req.createdAt) && (
                            <span className="ml-1.5 text-xs text-gray-400">
                              {formatFirestoreTime(req.createdAt)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{req.payee}</td>
                        <td className="px-4 py-3">{t(`committee.${req.committee}Short`)}</td>
                        <td className="px-4 py-3 text-right">
                          ₩{req.totalAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={req.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{renderRemarks(req)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Mobile: sort selector + card view */}
          <div className="sm:hidden">
            <div className="flex items-center gap-2 mb-3">
              <Select
                options={[
                  { value: 'date-desc', label: `${t('field.date')} \u2193` },
                  { value: 'date-asc', label: `${t('field.date')} \u2191` },
                  { value: 'payee-asc', label: `${t('field.payee')} \u2191` },
                  { value: 'payee-desc', label: `${t('field.payee')} \u2193` },
                  { value: 'totalAmount-desc', label: `${t('field.totalAmount')} \u2193` },
                  { value: 'totalAmount-asc', label: `${t('field.totalAmount')} \u2191` },
                  { value: 'status-asc', label: `${t('status.label')} \u2191` },
                  { value: 'status-desc', label: `${t('status.label')} \u2193` }
                ]}
                value={`${sortKey}-${sortDir}`}
                onChange={(v) => {
                  const [k, d] = (v as string).split('-') as [SortKey, SortDir]
                  setSortKey(k)
                  setSortDir(d)
                }}
              />
            </div>

            <div
              className={`space-y-3 transition-opacity ${isFetching && !isFetchingNextPage ? 'opacity-40' : ''}`}
            >
              {accessible.map((req) => {
                const remarks = renderRemarks(req)
                return (
                <div key={req.id} className="flex items-start gap-3 bg-white rounded-lg shadow p-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(req.id)}
                    onChange={() => toggleOne(req.id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-blue-600 flex-shrink-0"
                  />
                  <Link
                    to={`/request/${req.id}`}
                    state={{ from: '/admin/requests' }}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{req.payee}</span>
                      <StatusBadge status={req.status} />
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
                      <span>
                        {req.date}
                        {formatFirestoreTime(req.createdAt) && (
                          <span className="ml-1 text-xs text-gray-400">
                            {formatFirestoreTime(req.createdAt)}
                          </span>
                        )}
                      </span>
                      <span>{t(`committee.${req.committee}Short`)}</span>
                    </div>
                    <div className="text-right font-semibold text-gray-900">
                      ₩{req.totalAmount.toLocaleString()}
                    </div>
                    {remarks && (
                      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                        {remarks}
                      </div>
                    )}
                  </Link>
                </div>
                )
              })}
            </div>
          </div>

          <InfiniteScrollSentinel
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        </>
      )}

      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        size="sm"
      >
        <Dialog.Title onClose={() => setExportDialogOpen(false)}>
          {t('common.exportColumns')}
        </Dialog.Title>
        <Dialog.Content>
          <div className="mb-4">
            <div className="flex gap-4">
              {(['byRequest', 'byBudgetCode'] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="exportMode"
                    value={mode}
                    checked={exportMode === mode}
                    onChange={() => setExportMode(mode)}
                    className="accent-blue-600"
                  />
                  {t(`common.export${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
                </label>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">{t('common.defaultColumns')}</p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_CSV_COLUMNS.map((key) => (
                <span
                  key={key}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded text-sm"
                >
                  {getCsvColumnLabel(key)}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">{t('common.optionalColumns')}</p>
            <div className="flex flex-wrap gap-2">
              {OPTIONAL_CSV_COLUMNS.map((key) => (
                <button
                  key={key}
                  onClick={() => toggleOptionalColumn(key)}
                  className={`px-2.5 py-1 rounded text-sm border transition-colors ${
                    selectedOptionalColumns.has(key)
                      ? 'bg-green-50 text-green-700 border-green-300'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {selectedOptionalColumns.has(key) ? '✓ ' : ''}
                  {getCsvColumnLabel(key)}
                </button>
              ))}
            </div>
          </div>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleExportCsv} disabled={isExporting}>
            {isExporting ? t('common.exporting') : t('common.exportCsv')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Layout>
  )
}
