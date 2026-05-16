import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { useInfiniteSettlements, fetchRequestDatesByIds } from '../hooks/queries/useSettlements'
import { exportSettlementsByBudgetCodeCsv } from '../lib/csvExport'
import { formatFirestoreDate } from '../lib/utils'
import { Settlement, Committee } from '../types'
import { canAccessSettlement } from '../lib/roles'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import InfiniteScrollSentinel from '../components/InfiniteScrollSentinel'

type CommitteeFilter = 'all' | Committee

interface BatchGroup {
  batchId: string
  /** First settlement ID — used for linking to report page */
  firstId: string
  payees: string[]
  committees: string[]
  totalAmount: number
  totalRequests: number
  date: string
  settlementCount: number
  isCorporateCard?: boolean
}

function groupByBatch(settlements: Settlement[]): BatchGroup[] {
  const map = new Map<string, BatchGroup>()
  for (const s of settlements) {
    const key = s.batchId || s.id // fallback for legacy settlements without batchId
    const existing = map.get(key)
    if (existing) {
      if (!existing.payees.includes(s.payee)) existing.payees.push(s.payee)
      if (!existing.committees.includes(s.committee)) existing.committees.push(s.committee)
      existing.totalAmount += s.totalAmount
      existing.totalRequests += s.requestIds.length
      existing.settlementCount += 1
      existing.isCorporateCard = existing.isCorporateCard || !!s.isCorporateCard
    } else {
      map.set(key, {
        batchId: key,
        firstId: s.id,
        payees: [s.payee],
        committees: [s.committee],
        totalAmount: s.totalAmount,
        totalRequests: s.requestIds.length,
        date: formatFirestoreDate(s.createdAt),
        settlementCount: 1,
        isCorporateCard: s.isCorporateCard || false
      })
    }
  }
  return [...map.values()]
}

export default function SettlementListPage() {
  const { t } = useTranslation()
  const { appUser } = useAuth()
  const { currentProject } = useProject()
  const canProcess = canAccessSettlement(appUser?.role || 'user')
  const [committeeFilter, setCommitteeFilter] = useState<CommitteeFilter>('all')
  const {
    data,
    isLoading: loading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  } = useInfiniteSettlements(
    currentProject?.id,
    committeeFilter === 'all' ? undefined : committeeFilter
  )

  const settlements = data?.pages.flatMap((p) => p.items) ?? []
  const batches = useMemo(() => groupByBatch(settlements), [settlements])

  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set())

  // 무한스크롤로 새 배치가 로드될 때, 이전에 전체선택 상태였다면 새 배치도 선택에 포함
  const prevBatchLengthRef = useRef(0)
  useEffect(() => {
    const prev = prevBatchLengthRef.current
    prevBatchLengthRef.current = batches.length
    if (prev > 0 && selectedBatchIds.size === prev && batches.length > prev) {
      setSelectedBatchIds(new Set(batches.map((b) => b.batchId)))
    }
  }, [batches])

  const allBatchesSelected =
    batches.length > 0 && batches.every((b) => selectedBatchIds.has(b.batchId))

  const toggleAllBatches = () => {
    if (allBatchesSelected) {
      setSelectedBatchIds(new Set())
    } else {
      setSelectedBatchIds(new Set(batches.map((b) => b.batchId)))
    }
  }

  const toggleBatch = (batchId: string) => {
    setSelectedBatchIds((prev) => {
      const next = new Set(prev)
      if (next.has(batchId)) next.delete(batchId)
      else next.add(batchId)
      return next
    })
  }

  const [isExporting, setIsExporting] = useState(false)

  const handleExportSettlements = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const toExport = settlements.filter((s) => selectedBatchIds.has(s.batchId || s.id))
      const allRequestIds = [...new Set(toExport.flatMap((s) => s.requestIds))]
      const requestDateMap = await fetchRequestDatesByIds(allRequestIds)
      exportSettlementsByBudgetCodeCsv(toExport, requestDateMap)
      setSelectedBatchIds(new Set())
    } finally {
      setIsExporting(false)
    }
  }

  const FILTER_TABS: { value: CommitteeFilter; label: string }[] = [
    { value: 'all', label: t('status.all') },
    { value: 'operations', label: t('committee.operationsShort') },
    { value: 'preparation', label: t('committee.preparationShort') }
  ]

  const payeeLabel = (b: BatchGroup) =>
    b.payees.length === 1 ? b.payees[0] : `${t('settlement.multiPayee')} (${b.payees.length})`

  const committeeLabel = (b: BatchGroup) =>
    b.committees.length === 1
      ? b.committees[0] === 'operations'
        ? t('committee.operationsShort')
        : t('committee.preparationShort')
      : '-'

  return (
    <Layout>
      <PageHeader
        title={t('settlement.listTitle')}
        actions={[
          {
            label: isExporting
              ? t('common.exporting')
              : selectedBatchIds.size > 0
                ? `${t('common.exportCsv')} (${selectedBatchIds.size})`
                : t('common.exportCsv'),
            onClick: handleExportSettlements,
            disabled: selectedBatchIds.size === 0 || isExporting,
          },
          ...(canProcess
            ? [{ label: t('settlement.newSettlement'), to: '/admin/settlement/new', variant: 'purple' as const }]
            : []),
        ]}
      />

      <div className="flex gap-2 mb-4">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setCommitteeFilter(tab.value); setSelectedBatchIds(new Set()) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              committeeFilter === tab.value
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : batches.length === 0 ? (
        <EmptyState
          title={t('settlement.noSettlements')}
          description={t('settlement.description')}
          actionLabel={canProcess ? t('settlement.newSettlement') : undefined}
          actionTo={canProcess ? '/admin/settlement/new' : undefined}
        />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden sm:block">
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allBatchesSelected}
                        onChange={toggleAllBatches}
                        className="h-4 w-4 rounded border-gray-300 accent-purple-600"
                      />
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      {t('settlement.settlementDate')}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      {t('field.payee')}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      {t('field.committee')}
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">
                      {t('field.totalAmount')}
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">
                      {t('settlement.requestCount')}
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {batches.map((b) => (
                    <tr key={b.batchId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedBatchIds.has(b.batchId)}
                          onChange={() => toggleBatch(b.batchId)}
                          className="h-4 w-4 rounded border-gray-300 accent-purple-600"
                        />
                      </td>
                      <td className="px-4 py-3">{b.date}</td>
                      <td className="px-4 py-3">
                        {payeeLabel(b)}
                        {b.isCorporateCard && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                            {t('form.requestTypeCorporateCard')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{committeeLabel(b)}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        ₩{b.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {t('form.itemCount', { count: b.totalRequests })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          to={`/admin/settlement/${b.firstId}`}
                          className="text-purple-600 hover:underline text-sm"
                        >
                          {t('settlement.report')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            {batches.map((b) => (
              <div key={b.batchId} className="flex items-start gap-3 bg-white rounded-lg shadow p-4">
                <input
                  type="checkbox"
                  checked={selectedBatchIds.has(b.batchId)}
                  onChange={() => toggleBatch(b.batchId)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-purple-600 flex-shrink-0"
                />
                <Link
                  to={`/admin/settlement/${b.firstId}`}
                  className="flex-1 min-w-0"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{payeeLabel(b)}</span>
                      {b.isCorporateCard && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                          {t('form.requestTypeCorporateCard')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{b.date}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {committeeLabel(b)} | {t('form.itemCount', { count: b.totalRequests })}
                    </span>
                    <span className="font-medium text-purple-700">
                      ₩{b.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          <InfiniteScrollSentinel
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        </>
      )}
    </Layout>
  )
}
