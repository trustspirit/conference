import { useMemo, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useToast } from 'trust-ui-react'
import { useRemoveInclusion } from '../../hooks/queries/useOpsBudget'
import type { OpsBudgetCategory, OpsBudgetInclusion, RequestStatus } from '../../types'
import { ChevronDownIcon } from '../Icons'
import { effectiveKrwForSnapshot } from './opsBudgetSelectors'

const PAGE_SIZE = 15

interface Props {
  projectId: string
  category: OpsBudgetCategory | null
  categories: OpsBudgetCategory[]
  inclusions: OpsBudgetInclusion[]
  usdToKrwRate: number
  onSelectCategory?: (id: string) => void
}

type ViewMode = 'category' | 'all'

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

function CategoryDropdown({
  categories,
  selected,
  onSelect,
  label,
}: {
  categories: { id: string; name: string; color?: string }[]
  selected: { id: string; name: string; color?: string } | null
  onSelect: (id: string) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-2 py-1 rounded border border-finance-border-soft bg-transparent hover:bg-finance-surface text-sm"
      >
        {selected ? (
          <>
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: selected.color ?? '#888' }}
              aria-hidden
            />
            <span className="font-semibold text-finance-primary">{selected.name}</span>
          </>
        ) : (
          <span className="text-finance-muted">{label}</span>
        )}
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 min-w-[12rem] max-h-72 overflow-auto rounded-md border border-finance-border-soft bg-finance-surface shadow-lg"
        >
          {categories.map((c) => {
            const active = selected?.id === c.id
            return (
              <li
                key={c.id}
                role="option"
                aria-selected={active}
                onClick={() => {
                  onSelect(c.id)
                  setOpen(false)
                }}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm hover:bg-finance-border-soft ${
                  active ? 'bg-finance-primary-surface text-finance-primary' : 'text-finance-body'
                }`}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: c.color ?? '#888' }}
                  aria-hidden
                />
                <span className="flex-1">{c.name}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function OpsBudgetIncludedList({
  projectId,
  category,
  categories,
  inclusions,
  usdToKrwRate,
  onSelectCategory,
}: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const remove = useRemoveInclusion()
  const [view, setView] = useState<ViewMode>('category')
  const [search, setSearch] = useState('')
  const [visibleCategory, setVisibleCategory] = useState(PAGE_SIZE)
  const [visibleAll, setVisibleAll] = useState(PAGE_SIZE)

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  )

  const filteredCategory = useMemo(
    () =>
      category
        ? inclusions
            .filter((i) => i.categoryId === category.id)
            .sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime())
        : [],
    [inclusions, category]
  )

  const filteredAll = useMemo(() => {
    const sorted = [...inclusions].sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime())
    if (!search.trim()) return sorted
    const q = search.trim().toLowerCase()
    return sorted.filter((i) => {
      const cat = categoryMap.get(i.categoryId)
      return (
        (i.snapshot.submitterName ?? '').toLowerCase().includes(q) ||
        i.snapshot.payee.toLowerCase().includes(q) ||
        i.snapshot.description.toLowerCase().includes(q) ||
        i.snapshot.session.toLowerCase().includes(q) ||
        (cat?.name ?? '').toLowerCase().includes(q)
      )
    })
  }, [inclusions, search, categoryMap])

  useEffect(() => {
    setVisibleCategory(PAGE_SIZE)
  }, [category?.id])

  useEffect(() => {
    setVisibleAll(PAGE_SIZE)
  }, [search])

  const visibleCategoryRows = filteredCategory.slice(0, visibleCategory)
  const visibleAllRows = filteredAll.slice(0, visibleAll)
  const hasMoreCategory = filteredCategory.length > visibleCategoryRows.length
  const hasMoreAll = filteredAll.length > visibleAllRows.length

  const handleRemove = async (incId: string) => {
    if (!window.confirm(t('dashboard.opsBudget.confirmRemove'))) return
    try {
      await remove.mutateAsync({ projectId, inclusionId: incId })
      toast({ variant: 'success', message: t('dashboard.opsBudget.removed') })
    } catch (err) {
      toast({ variant: 'danger', message: `${t('common.saveError')}: ${(err as Error).message}` })
    }
  }

  // Subtotals for category view
  const subtotalCategoryKrw = filteredCategory.reduce(
    (s, i) => s + effectiveKrwForSnapshot(i.snapshot, usdToKrwRate),
    0
  )
  const subtotalCategoryUsd = filteredCategory.reduce(
    (s, i) => s + (i.snapshot.currency === 'USD' ? i.snapshot.amountUsd : 0),
    0
  )

  // Subtotals for all view
  const subtotalAllKrw = filteredAll.reduce(
    (s, i) => s + effectiveKrwForSnapshot(i.snapshot, usdToKrwRate),
    0
  )
  const subtotalAllUsd = filteredAll.reduce(
    (s, i) => s + (i.snapshot.currency === 'USD' ? i.snapshot.amountUsd : 0),
    0
  )

  const renderRow = (inc: OpsBudgetInclusion, showCategoryChip: boolean) => {
    const stale = STALE_STATUSES.has(inc.snapshot.requestStatus)
    const cat = categoryMap.get(inc.categoryId)
    return (
      <li key={inc.id} className="flex items-center gap-3 p-2 border border-finance-border-soft rounded">
        {showCategoryChip && (
          <button
            type="button"
            className="shrink-0"
            onClick={() => onSelectCategory?.(inc.categoryId)}
            title={cat?.name}
          >
            <CategoryChip category={cat} />
          </button>
        )}
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
      {/* View toggle */}
      <div className="flex items-center justify-between mb-3">
        {view === 'category' ? (
          <CategoryDropdown
            categories={categories}
            selected={category}
            onSelect={(id) => onSelectCategory?.(id)}
            label={t('dashboard.opsBudget.categorySelectLabel')}
          />
        ) : (
          <h3 className="text-sm font-semibold text-finance-primary">
            {t('dashboard.opsBudget.allInclusionsTitle')}
          </h3>
        )}
        <div role="tablist" aria-label={t('dashboard.opsBudget.viewToggleLabel')} className="flex items-center gap-1 text-xs">
          <span className="text-finance-muted mr-1">{t('dashboard.opsBudget.viewToggleLabel')}:</span>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'category'}
            onClick={() => setView('category')}
            className={`px-2 py-1 rounded ${
              view === 'category'
                ? 'bg-finance-primary text-white'
                : 'text-finance-muted hover:bg-finance-border-soft'
            }`}
          >
            {t('dashboard.opsBudget.viewByCategory')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'all'}
            onClick={() => setView('all')}
            className={`px-2 py-1 rounded ${
              view === 'all'
                ? 'bg-finance-primary text-white'
                : 'text-finance-muted hover:bg-finance-border-soft'
            }`}
          >
            {t('dashboard.opsBudget.viewAll')}
          </button>
        </div>
      </div>

      {/* Category view */}
      {view === 'category' && (
        <>
          {!category ? (
            <p className="text-sm text-finance-muted py-4 text-center">
              {t('dashboard.opsBudget.selectCategoryHint')}
            </p>
          ) : filteredCategory.length === 0 ? (
            <p className="text-sm text-finance-muted py-4 text-center">
              {t('dashboard.opsBudget.noIncludedItems')}
            </p>
          ) : (
            <>
              <ul className="space-y-2">
                {visibleCategoryRows.map((inc) => renderRow(inc, false))}
              </ul>
              {hasMoreCategory && (
                <div className="pt-3 flex justify-center">
                  <button
                    onClick={() => setVisibleCategory((v) => v + PAGE_SIZE)}
                    className="text-sm px-3 py-1.5 rounded border border-finance-border-soft hover:bg-finance-surface"
                  >
                    {t('dashboard.budgetCodeItemList.loadMore')} ({filteredCategory.length - visibleCategoryRows.length})
                  </button>
                </div>
              )}
            </>
          )}
          {category && (
            <div className="mt-3 pt-3 border-t border-finance-border-soft flex justify-end gap-4 text-sm">
              <span className="text-finance-muted">{t('dashboard.opsBudget.subtotal')}:</span>
              <span className="font-semibold">{'₩'}{subtotalCategoryKrw.toLocaleString('en-US')}</span>
              {usdToKrwRate <= 0 && subtotalCategoryUsd > 0 && (
                <span className="font-semibold">${subtotalCategoryUsd.toLocaleString('en-US')}</span>
              )}
            </div>
          )}
        </>
      )}

      {/* All view */}
      {view === 'all' && (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('dashboard.opsBudget.searchAllPlaceholder')}
            className="w-full mb-3 px-3 py-1.5 text-sm border border-finance-border-soft rounded bg-transparent placeholder:text-finance-muted focus:outline-none focus:ring-1 focus:ring-finance-primary"
          />
          {filteredAll.length === 0 ? (
            <p className="text-sm text-finance-muted py-4 text-center">
              {t('dashboard.opsBudget.noIncludedItems')}
            </p>
          ) : (
            <>
              <ul className="space-y-2">
                {visibleAllRows.map((inc) => renderRow(inc, true))}
              </ul>
              {hasMoreAll && (
                <div className="pt-3 flex justify-center">
                  <button
                    onClick={() => setVisibleAll((v) => v + PAGE_SIZE)}
                    className="text-sm px-3 py-1.5 rounded border border-finance-border-soft hover:bg-finance-surface"
                  >
                    {t('dashboard.budgetCodeItemList.loadMore')} ({filteredAll.length - visibleAllRows.length})
                  </button>
                </div>
              )}
            </>
          )}
          <div className="mt-3 pt-3 border-t border-finance-border-soft flex justify-between items-center text-sm">
            <span className="text-finance-muted">
              {t('dashboard.opsBudget.totalCount', { count: filteredAll.length })}
            </span>
            <div className="flex gap-4">
              <span className="text-finance-muted">{t('dashboard.opsBudget.subtotal')}:</span>
              <span className="font-semibold">{'₩'}{subtotalAllKrw.toLocaleString('en-US')}</span>
              {usdToKrwRate <= 0 && subtotalAllUsd > 0 && (
                <span className="font-semibold">${subtotalAllUsd.toLocaleString('en-US')}</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
