import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useToast } from 'trust-ui-react'
import { useRemoveInclusion } from '../../hooks/queries/useOpsBudget'
import type { OpsBudgetCategory, OpsBudgetInclusion, RequestStatus } from '../../types'
import { effectiveKrwForSnapshot } from './opsBudgetSelectors'
import { OPS_BUDGET_PAGE_SIZE, LoadMoreButton } from './listPaging'

const PAGE_SIZE = OPS_BUDGET_PAGE_SIZE

interface Props {
  projectId: string
  categories: OpsBudgetCategory[]
  inclusions: OpsBudgetInclusion[]
  usdToKrwRate: number
}

const STALE_STATUSES: ReadonlySet<RequestStatus> = new Set(['cancelled', 'force_rejected'])

function CategoryChip({ category }: { category: OpsBudgetCategory | undefined }) {
  if (!category) return <span className="text-finance-muted text-xs">—</span>
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: `${category.color ?? '#888'}20`,
        color: category.color ?? '#444',
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: category.color ?? '#888' }}
      />
      {category.name}
    </span>
  )
}

/** Single-select category filter chip. `color` undefined renders no dot (the "All" chip). */
function FilterChip({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean
  label: string
  color?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap border transition-colors ${
        active
          ? 'border-finance-primary bg-finance-primary/10 text-finance-primary font-semibold'
          : 'border-finance-border-soft text-finance-muted hover:bg-finance-border-soft'
      }`}
    >
      {color && (
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      )}
      {label}
    </button>
  )
}

export default function OpsBudgetIncludedList({
  projectId,
  categories,
  inclusions,
  usdToKrwRate,
}: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const remove = useRemoveInclusion()
  // null = "전체" (all categories). Default shows all included items.
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  )

  const filtered = useMemo(() => {
    let list = [...inclusions].sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime())
    if (selectedCategoryId) {
      list = list.filter((i) => i.categoryId === selectedCategoryId)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((i) => {
        const cat = categoryMap.get(i.categoryId)
        return (
          (i.snapshot.submitterName || '').toLowerCase().includes(q) ||
          i.snapshot.payee.toLowerCase().includes(q) ||
          i.snapshot.description.toLowerCase().includes(q) ||
          i.snapshot.session.toLowerCase().includes(q) ||
          (cat?.name ?? '').toLowerCase().includes(q)
        )
      })
    }
    return list
  }, [inclusions, selectedCategoryId, search, categoryMap])

  // Reset pagination whenever the filter narrows/changes.
  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [selectedCategoryId, search])

  const visibleRows = filtered.slice(0, visible)
  const hasMore = filtered.length > visibleRows.length

  const subtotalKrw = filtered.reduce(
    (s, i) => s + effectiveKrwForSnapshot(i.snapshot, usdToKrwRate),
    0
  )
  const subtotalUsd = filtered.reduce(
    (s, i) => s + (i.snapshot.currency === 'USD' ? i.snapshot.amountUsd : 0),
    0
  )

  const handleRemove = async (incId: string) => {
    if (!window.confirm(t('dashboard.opsBudget.confirmRemove'))) return
    try {
      await remove.mutateAsync({ projectId, inclusionId: incId })
      toast({ variant: 'success', message: t('dashboard.opsBudget.removed') })
    } catch (err) {
      toast({ variant: 'danger', message: `${t('common.saveError')}: ${(err as Error).message}` })
    }
  }

  const renderRow = (inc: OpsBudgetInclusion) => {
    const stale = STALE_STATUSES.has(inc.snapshot.requestStatus)
    const cat = categoryMap.get(inc.categoryId)
    return (
      <li key={inc.id} className="flex items-center gap-3 p-2 border border-finance-border-soft rounded">
        <button
          type="button"
          className="shrink-0"
          onClick={() => setSelectedCategoryId(inc.categoryId)}
          title={cat?.name}
        >
          <CategoryChip category={cat} />
        </button>
        <Link
          to={`/request/${inc.requestId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0"
        >
          <p className="text-sm truncate">
            <span className="font-medium">{inc.snapshot.submitterName || inc.snapshot.payee}</span>
            {' · '}
            <span className="text-finance-muted">{inc.snapshot.description}</span>
          </p>
          <p className="text-xs text-finance-muted">
            {inc.snapshot.date} · {inc.snapshot.session} · {inc.snapshot.budgetCode}
            {stale && (
              <span className="ml-2 px-1.5 py-0.5 rounded bg-finance-warning-bg text-finance-warning text-[10px]">
                ⚠ {t('dashboard.opsBudget.staleSource')}
              </span>
            )}
          </p>
        </Link>
        <span className="font-mono text-sm">
          {inc.snapshot.currency === 'USD'
            ? (
              <span>
                <span className="text-finance-muted">${inc.snapshot.amountUsd.toLocaleString('en-US')}</span>
                {usdToKrwRate > 0 && (
                  <span className="ml-1 text-[10px] text-finance-muted">
                    (≈₩{Math.round(inc.snapshot.amountUsd * usdToKrwRate).toLocaleString('en-US')})
                  </span>
                )}
              </span>
            )
            : `${'₩'}${inc.snapshot.amount.toLocaleString('en-US')}`}
        </span>
        <button
          onClick={() => handleRemove(inc.id)}
          className="text-xs text-finance-danger px-2 py-1 rounded hover:bg-finance-danger/10"
        >
          {t('dashboard.opsBudget.exclude')}
        </button>
      </li>
    )
  }

  return (
    <div className="finance-panel rounded-lg p-4 sm:p-6 mt-6">
      <h3 className="text-sm font-semibold text-finance-primary mb-3">
        {t('dashboard.opsBudget.allInclusionsTitle')}
      </h3>

      {/* Category filter chips (single-select; "All" is the default) */}
      <div
        className="flex flex-wrap gap-1.5 mb-3"
        role="tablist"
        aria-label={t('dashboard.opsBudget.categorySelectLabel')}
      >
        <FilterChip
          active={selectedCategoryId === null}
          label={t('dashboard.opsBudget.chipAll')}
          onClick={() => setSelectedCategoryId(null)}
        />
        {categories.map((c) => (
          <FilterChip
            key={c.id}
            active={selectedCategoryId === c.id}
            label={c.name}
            color={c.color ?? '#888'}
            onClick={() => setSelectedCategoryId(c.id)}
          />
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('dashboard.opsBudget.searchAllPlaceholder')}
        className="w-full mb-3 px-3 py-1.5 text-sm border border-finance-border-soft rounded bg-transparent placeholder:text-finance-muted focus:outline-none focus:ring-1 focus:ring-finance-primary"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-finance-muted py-4 text-center">
          {inclusions.length === 0
            ? t('dashboard.opsBudget.noIncludedYet')
            : t('dashboard.opsBudget.noIncludedItems')}
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {visibleRows.map((inc) => renderRow(inc))}
          </ul>
          {hasMore && (
            <LoadMoreButton
              remaining={filtered.length - visibleRows.length}
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
            />
          )}
        </>
      )}

      <div className="mt-3 pt-3 border-t border-finance-border-soft flex justify-between items-center text-sm">
        <span className="text-finance-muted">
          {t('dashboard.opsBudget.totalCount', { count: filtered.length })}
        </span>
        <div className="flex gap-4">
          <span className="text-finance-muted">{t('dashboard.opsBudget.subtotal')}:</span>
          <span className="font-semibold">{'₩'}{subtotalKrw.toLocaleString('en-US')}</span>
          {usdToKrwRate <= 0 && subtotalUsd > 0 && (
            <span className="font-semibold">${subtotalUsd.toLocaleString('en-US')}</span>
          )}
        </div>
      </div>
    </div>
  )
}
