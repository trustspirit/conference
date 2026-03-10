import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { useInfiniteSettlements } from '../hooks/queries/useSettlements'
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
}

function groupByBatch(settlements: Settlement[], t: (key: string) => string): BatchGroup[] {
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
    fetchNextPage,
  } = useInfiniteSettlements(currentProject?.id, committeeFilter === 'all' ? undefined : committeeFilter)

  const settlements = data?.pages.flatMap(p => p.items) ?? []
  const batches = useMemo(() => groupByBatch(settlements, t), [settlements, t])

  const FILTER_TABS: { value: CommitteeFilter; label: string }[] = [
    { value: 'all', label: t('status.all') },
    { value: 'operations', label: t('committee.operationsShort') },
    { value: 'preparation', label: t('committee.preparationShort') },
  ]

  const payeeLabel = (b: BatchGroup) =>
    b.payees.length === 1 ? b.payees[0] : `${t('settlement.multiPayee')} (${b.payees.length})`

  const committeeLabel = (b: BatchGroup) =>
    b.committees.length === 1
      ? (b.committees[0] === 'operations' ? t('committee.operationsShort') : t('committee.preparationShort'))
      : '-'

  return (
    <Layout>
      <PageHeader
        title={t('settlement.listTitle')}
        action={canProcess ? { label: t('settlement.newSettlement'), to: '/admin/settlement/new', variant: 'purple' } : undefined}
      />

      <div className="flex gap-2 mb-4">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setCommitteeFilter(tab.value)}
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
          actionTo={canProcess ? "/admin/settlement/new" : undefined}
        />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden sm:block">
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('settlement.settlementDate')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('field.payee')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('field.committee')}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">{t('field.totalAmount')}</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">{t('settlement.requestCount')}</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {batches.map((b) => (
                    <tr key={b.batchId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{b.date}</td>
                      <td className="px-4 py-3">{payeeLabel(b)}</td>
                      <td className="px-4 py-3">{committeeLabel(b)}</td>
                      <td className="px-4 py-3 text-right font-medium">₩{b.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">{t('form.itemCount', { count: b.totalRequests })}</td>
                      <td className="px-4 py-3 text-center">
                        <Link to={`/admin/settlement/${b.firstId}`}
                          className="text-purple-600 hover:underline text-sm">{t('settlement.report')}</Link>
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
              <Link key={b.batchId} to={`/admin/settlement/${b.firstId}`}
                className="block bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{payeeLabel(b)}</span>
                  <span className="text-xs text-gray-400">{b.date}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {committeeLabel(b)} | {t('form.itemCount', { count: b.totalRequests })}
                  </span>
                  <span className="font-medium text-purple-700">₩{b.totalAmount.toLocaleString()}</span>
                </div>
              </Link>
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
