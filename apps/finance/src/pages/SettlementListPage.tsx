import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { useInfiniteSettlements, fetchRequestDatesByIds } from '../hooks/queries/useSettlements'
import {
  exportSettlementsByBudgetCodeCsv,
  getSettlementCsvColumnLabel,
  DEFAULT_SETTLEMENT_CSV_COLUMNS,
  OPTIONAL_SETTLEMENT_CSV_COLUMNS,
  type SettlementCsvColumnKey
} from '../lib/csvExport'
import CsvExportDialog from '../components/CsvExportDialog'
import { formatFirestoreDate } from '../lib/utils'
import { Settlement, Committee } from '../types'
import { canAccessSettlement } from '../lib/roles'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import InfiniteScrollSentinel from '../components/InfiniteScrollSentinel'
import FinanceTable from '../components/table/FinanceTable'

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
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  // 무한스크롤로 새 배치가 로드될 때, 이전에 전체선택 상태였다면 새 배치도 선택에 포함
  const prevBatchLengthRef = useRef(0)
  useEffect(() => {
    const prev = prevBatchLengthRef.current
    prevBatchLengthRef.current = batches.length
    if (prev > 0 && batches.length > prev) {
      setSelectedBatchIds((current) => {
        if (current.size !== prev) return current
        return new Set(batches.map((b) => b.batchId))
      })
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

  const handleExportSettlements = async (selectedOptionals: Set<string>) => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const toExport = settlements.filter((s) => selectedBatchIds.has(s.batchId || s.id))
      const allRequestIds = [...new Set(toExport.flatMap((s) => s.requestIds))]
      const requestDateMap = await fetchRequestDatesByIds(allRequestIds)
      const columns = [
        ...DEFAULT_SETTLEMENT_CSV_COLUMNS,
        ...(selectedOptionals as Set<SettlementCsvColumnKey>)
      ]
      exportSettlementsByBudgetCodeCsv(toExport, requestDateMap, columns)
      setSelectedBatchIds(new Set())
      setExportDialogOpen(false)
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
            label:
              selectedBatchIds.size > 0
                ? `${t('common.exportCsv')} (${selectedBatchIds.size})`
                : t('common.exportCsv'),
            onClick: () => setExportDialogOpen(true),
            disabled: selectedBatchIds.size === 0
          },
          ...(canProcess
            ? [
                {
                  label: t('settlement.newSettlement'),
                  to: '/admin/settlement/new',
                  variant: 'primary' as const
                }
              ]
            : [])
        ]}
      />

      <div className="-mx-3 mb-4 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setCommitteeFilter(tab.value)
              setSelectedBatchIds(new Set())
            }}
            className={`shrink-0 px-4 py-1.5 rounded text-sm font-semibold border transition-colors ${
              committeeFilter === tab.value
                ? 'finance-tab-active'
                : 'bg-white text-[#667085] border-[#D8DDE5] hover:text-[#002C5F] hover:bg-[#F0F4F8]'
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
            <FinanceTable>
              <FinanceTable.Head>
                <tr>
                  <FinanceTable.Th className="w-10">
                    <input
                      type="checkbox"
                      checked={allBatchesSelected}
                      onChange={toggleAllBatches}
                      className="finance-checkbox"
                    />
                  </FinanceTable.Th>
                  <FinanceTable.Th>{t('settlement.settlementDate')}</FinanceTable.Th>
                  <FinanceTable.Th>{t('field.payee')}</FinanceTable.Th>
                  <FinanceTable.Th>{t('field.committee')}</FinanceTable.Th>
                  <FinanceTable.Th align="right">{t('field.totalAmount')}</FinanceTable.Th>
                  <FinanceTable.Th align="center">{t('settlement.requestCount')}</FinanceTable.Th>
                  <FinanceTable.Th align="center"></FinanceTable.Th>
                </tr>
              </FinanceTable.Head>
              <FinanceTable.Body>
                {batches.map((b) => (
                  <FinanceTable.Row key={b.batchId}>
                    <FinanceTable.Td>
                      <input
                        type="checkbox"
                        checked={selectedBatchIds.has(b.batchId)}
                        onChange={() => toggleBatch(b.batchId)}
                        className="finance-checkbox"
                      />
                    </FinanceTable.Td>
                    <FinanceTable.Td>{b.date}</FinanceTable.Td>
                    <FinanceTable.Td>
                      {payeeLabel(b)}
                      {b.isCorporateCard && (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#E8EEF5] text-[#002C5F]">
                          {t('form.requestTypeCorporateCard')}
                        </span>
                      )}
                    </FinanceTable.Td>
                    <FinanceTable.Td>{committeeLabel(b)}</FinanceTable.Td>
                    <FinanceTable.Td align="right" className="font-medium">
                      ₩{b.totalAmount.toLocaleString()}
                    </FinanceTable.Td>
                    <FinanceTable.Td align="center">
                      {t('form.itemCount', { count: b.totalRequests })}
                    </FinanceTable.Td>
                    <FinanceTable.Td align="center">
                      <Link
                        to={`/admin/settlement/${b.firstId}`}
                        className="text-[#002C5F] hover:underline text-sm"
                      >
                        {t('settlement.report')}
                      </Link>
                    </FinanceTable.Td>
                  </FinanceTable.Row>
                ))}
              </FinanceTable.Body>
            </FinanceTable>
          </div>

          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            {batches.map((b) => (
              <div key={b.batchId} className="finance-panel flex items-start gap-3 rounded-lg p-4">
                <input
                  type="checkbox"
                  checked={selectedBatchIds.has(b.batchId)}
                  onChange={() => toggleBatch(b.batchId)}
                  className="finance-checkbox mt-0.5"
                />
                <Link to={`/admin/settlement/${b.firstId}`} className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <span className="break-words text-sm font-medium">{payeeLabel(b)}</span>
                      {b.isCorporateCard && (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#E8EEF5] text-[#002C5F]">
                          {t('form.requestTypeCorporateCard')}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">{b.date}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-[#667085]">
                      {committeeLabel(b)} | {t('form.itemCount', { count: b.totalRequests })}
                    </span>
                    <span className="shrink-0 font-medium text-[#002C5F]">
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

      <CsvExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        defaultColumns={DEFAULT_SETTLEMENT_CSV_COLUMNS}
        optionalColumns={OPTIONAL_SETTLEMENT_CSV_COLUMNS}
        getColumnLabel={(key) => getSettlementCsvColumnLabel(key as SettlementCsvColumnKey)}
        onExport={handleExportSettlements}
        isExporting={isExporting}
      />
    </Layout>
  )
}
