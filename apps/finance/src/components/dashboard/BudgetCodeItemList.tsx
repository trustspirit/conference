import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { UNIQUE_BUDGET_CODES } from '../../constants/budgetCodes'
import { BUDGET_COUNTED_STATUSES } from '../../lib/budgetStatuses'
import StatusBadge from '../StatusBadge'
import {
  flattenRequestsToItems,
  filterByBudgetCode,
  searchItems,
  sortItems,
  type SortKey,
  type SortDirection,
} from './budgetCodeItemSelectors'
import type { PaymentRequest } from '../../types'

const PAGE_SIZE = 50

interface Props {
  requests: PaymentRequest[]
  usdToKrwRate: number
}

type CodeFilter = number | 'all'

export default function BudgetCodeItemList({ requests, usdToKrwRate }: Props) {
  const { t } = useTranslation()
  const [codeFilter, setCodeFilter] = useState<CodeFilter>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const allRows = useMemo(
    () => flattenRequestsToItems(requests, usdToKrwRate, BUDGET_COUNTED_STATUSES),
    [requests, usdToKrwRate]
  )

  const filtered = useMemo(() => {
    const byCode = filterByBudgetCode(allRows, codeFilter)
    const bySearch = searchItems(byCode, search)
    return sortItems(bySearch, sortKey, sortDir)
  }, [allRows, codeFilter, search, sortKey, sortDir])

  const onHeaderClick = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'submitterName' ? 'asc' : 'desc')
    }
  }

  const sortArrow = (key: SortKey) => (key === sortKey ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '')

  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [codeFilter, search, sortKey, sortDir])

  const visibleRows = filtered.slice(0, visible)
  const hasMore = filtered.length > visibleRows.length

  return (
    <section className="finance-panel rounded-lg mb-6 p-4">
      <h3 className="text-sm font-semibold text-finance-primary mb-3">
        {t('dashboard.budgetCodeItemList.title')}
      </h3>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-3" role="tablist" aria-label={t('dashboard.byBudgetCode')}>
        <FilterChip
          active={codeFilter === 'all'}
          label={t('dashboard.budgetCodeItemList.filterAll')}
          onClick={() => setCodeFilter('all')}
        />
        {UNIQUE_BUDGET_CODES.map((code) => (
          <FilterChip
            key={code}
            active={codeFilter === code}
            label={`${code} · ${t(`budgetCode.${code}`)}`}
            onClick={() => setCodeFilter(code)}
          />
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('dashboard.budgetCodeItemList.searchPlaceholder')}
        className="w-full mb-3 px-3 py-1.5 text-sm border border-finance-border-soft rounded bg-transparent placeholder:text-finance-muted focus:outline-none focus:ring-1 focus:ring-finance-primary"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-finance-muted py-8 text-center">
          {t('dashboard.budgetCodeItemList.emptyForFilter')}
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-finance-muted border-b border-finance-border-soft">
                  <Th onClick={() => onHeaderClick('createdAt')}>
                    {t('dashboard.budgetCodeItemList.columns.date')}{sortArrow('createdAt')}
                  </Th>
                  <Th onClick={() => onHeaderClick('submitterName')}>
                    {t('dashboard.budgetCodeItemList.columns.submitter')}{sortArrow('submitterName')}
                  </Th>
                  <Th>{t('dashboard.budgetCodeItemList.columns.committee')}</Th>
                  <Th>{t('dashboard.budgetCodeItemList.columns.code')}</Th>
                  <Th>{t('dashboard.budgetCodeItemList.columns.description')}</Th>
                  <Th onClick={() => onHeaderClick('amountKrw')} className="text-right">
                    {t('dashboard.budgetCodeItemList.columns.amount')}{sortArrow('amountKrw')}
                  </Th>
                  <Th>{t('dashboard.budgetCodeItemList.columns.status')}</Th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr
                    key={`${row.requestId}__${row.itemIndex}`}
                    className="border-b border-finance-border-soft hover:bg-finance-surface"
                  >
                    <Td>{row.createdAt.toISOString().slice(0, 10)}</Td>
                    <Td>{row.submitterName}</Td>
                    <Td>{t(`committee.${row.committee}`)}</Td>
                    <Td>
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex w-fit items-center rounded border border-finance-border bg-finance-surface px-1.5 py-0.5 text-[11px] font-semibold text-finance-body">
                          {row.budgetCode} · {t(`budgetCode.${row.budgetCode}`)}
                        </span>
                        {row.budgetDescKey && (
                          <span className="text-[11px] text-finance-muted">
                            {t(`budgetCode.items.${row.budgetDescKey}`)}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td className="max-w-xs truncate" title={row.description}>
                      {row.description}
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      <div>₩{row.amountKrw.toLocaleString('en-US')}</div>
                      {row.amountUsd > 0 && (
                        <div className="text-[11px] text-finance-muted">
                          (${row.amountUsd.toLocaleString('en-US')} USD)
                        </div>
                      )}
                    </Td>
                    <Td>
                      <Link
                        to={`/requests/${row.requestId}`}
                        className="inline-flex"
                        aria-label={`Open request ${row.requestId}`}
                      >
                        <StatusBadge status={row.status} />
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="sm:hidden space-y-2">
            {visibleRows.map((row) => (
              <li key={`${row.requestId}__${row.itemIndex}`} className="border border-finance-border-soft rounded p-3">
                <Link to={`/requests/${row.requestId}`} className="block">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-finance-muted">
                      {row.createdAt.toISOString().slice(0, 10)} · {row.submitterName}
                    </span>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="inline-flex items-center rounded border border-finance-border bg-finance-surface px-1.5 py-0.5 text-[11px] font-semibold">
                      {row.budgetCode} · {t(`budgetCode.${row.budgetCode}`)}
                    </span>
                    <span className="text-sm font-semibold">₩{row.amountKrw.toLocaleString('en-US')}</span>
                  </div>
                  <p className="text-xs text-finance-muted truncate">{row.description}</p>
                </Link>
              </li>
            ))}
          </ul>

          {hasMore && (
            <div className="pt-3 flex justify-center">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="text-sm px-3 py-1.5 rounded border border-finance-border-soft hover:bg-finance-surface"
              >
                {t('dashboard.budgetCodeItemList.loadMore')} ({filtered.length - visible})
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
        active
          ? 'bg-finance-primary text-white'
          : 'text-finance-muted hover:bg-finance-border-soft border border-finance-border-soft'
      }`}
    >
      {label}
    </button>
  )
}

function Th({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  const interactive = !!onClick
  return (
    <th
      onClick={onClick}
      className={`px-2 py-2 font-medium text-xs ${interactive ? 'cursor-pointer select-none hover:text-finance-primary' : ''} ${className}`}
    >
      {children}
    </th>
  )
}

function Td({ children, className = '', title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <td className={`px-2 py-2 align-top ${className}`} title={title}>
      {children}
    </td>
  )
}
