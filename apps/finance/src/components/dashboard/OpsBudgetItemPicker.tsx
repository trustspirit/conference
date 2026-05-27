/**
 * OpsBudgetItemPicker
 *
 * Redesigned May 2026 per user feedback:
 * - Auto-categorization replaces the per-category dependency.
 *   Items are matched to categories by budgetCode at submit time.
 * - "Show included items" toggle implements Spec §4 picker behavior:
 *   already-included items appear read-only with their category name chip.
 * - "Create category on the fly" flow: when no category matches the item's
 *   budgetCode, open a create-category modal instead of toasting an error.
 *   Optionally chains into the redistribute modal if the new allocation
 *   pushes the sum over totalKrw.
 *
 * Props:
 *   project     – full Project document (categories + totalKrw derived inside)
 *   currentUser – { uid, name, email } of the acting user
 */

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from 'trust-ui-react'
import {
  useOpsBudgetIncludableItems,
  useOpsBudgetAllOperationsItems,
  useAddInclusion,
  useUpdateOpsBudgetCategories,
  type AnnotatedOperationsItem,
} from '../../hooks/queries/useOpsBudget'
import type { OpsBudgetCategory, Project } from '../../types'
import { inclusionId, computeRedistributeContext, paletteColor } from './opsBudgetSelectors'
import Spinner from '../Spinner'
import OpsBudgetCreateCategoryModal from './OpsBudgetCreateCategoryModal'
import OpsBudgetRedistributeModal from './OpsBudgetRedistributeModal'

// ---------- Types ----------

interface Props {
  project: Project
  currentUser: { uid: string; name: string; email: string }
}

type SortKey = 'date' | 'amount' | 'payee' | 'code'

interface DisambiguateState {
  /** Items that still need a category resolution */
  queue: AnnotatedOperationsItem[]
  /** Items already resolved */
  resolved: Array<{ item: AnnotatedOperationsItem; categoryId: string }>
  /** Map of budgetCode → chosen categoryId (from "apply to all" toggle) */
  codeResolution: Map<number, string>
}

interface CreateCategoryFlowState {
  /** Queue of unique budgetCodes still to process */
  pendingCodes: number[]
  /** Items grouped by budgetCode (built once at flow start) */
  itemsByCode: Map<number, AnnotatedOperationsItem[]>
  /** Resolved items ready to submit (item + categoryId pairs) */
  resolved: Array<{ item: AnnotatedOperationsItem; categoryId: string }>
}

const PAGE_SIZE = 50

// ---------- Helpers ----------

function newCategoryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return `cat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function itemId(it: AnnotatedOperationsItem): string {
  return inclusionId(it.requestId, it.itemIndex)
}

function compareItems(a: AnnotatedOperationsItem, b: AnnotatedOperationsItem, key: SortKey, dir: 'asc' | 'desc'): number {
  let cmp = 0
  switch (key) {
    case 'date':
      cmp = a.snapshot.date.localeCompare(b.snapshot.date)
      break
    case 'amount': {
      const aAmt = a.snapshot.currency === 'USD' ? a.snapshot.amountUsd : a.snapshot.amount
      const bAmt = b.snapshot.currency === 'USD' ? b.snapshot.amountUsd : b.snapshot.amount
      cmp = aAmt - bAmt
      break
    }
    case 'payee':
      cmp = a.snapshot.payee.localeCompare(b.snapshot.payee)
      break
    case 'code':
      cmp = a.snapshot.budgetCode - b.snapshot.budgetCode
      break
  }
  return dir === 'asc' ? cmp : -cmp
}

// ---------- Sub-components ----------

function SortHeader({
  label, sortKey, currentKey, direction, onSort,
}: {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  direction: 'asc' | 'desc'
  onSort: (k: SortKey) => void
}) {
  const active = currentKey === sortKey
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-0.5 text-xs font-semibold uppercase tracking-wide select-none ${
        active ? 'text-finance-primary' : 'text-finance-muted hover:text-finance-primary'
      }`}
    >
      {label}
      {active && <span className="ml-0.5">{direction === 'asc' ? '↑' : '↓'}</span>}
    </button>
  )
}

function UsdChip({ tooltip }: { tooltip: string }) {
  return (
    <span
      title={tooltip}
      className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 ml-1 cursor-help"
    >
      USD
    </span>
  )
}

// ---------- Disambiguation Modal ----------

function DisambiguateModal({
  item,
  matchingCategories,
  onChoose,
  onSkip,
}: {
  item: AnnotatedOperationsItem
  matchingCategories: OpsBudgetCategory[]
  onChoose: (categoryId: string, applyToAll: boolean) => void
  onSkip: () => void
}) {
  const { t } = useTranslation()
  const [applyToAll, setApplyToAll] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onSkip() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSkip])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onSkip}>
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="opsbudget-disambig-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id="opsbudget-disambig-title" className="text-sm font-semibold text-finance-primary mb-1">
          {t('dashboard.opsBudget.disambiguateTitle')}
        </h4>
        <p className="text-xs text-finance-muted mb-4">
          {t('dashboard.opsBudget.disambiguateHelp', { code: item.snapshot.budgetCode })}
        </p>
        <p className="text-xs mb-3">
          <span className="font-medium">{item.snapshot.payee}</span>
          {' · '}
          <span className="text-finance-muted">{item.snapshot.description}</span>
        </p>
        <ul className="space-y-2 mb-4">
          {matchingCategories.map((cat) => (
            <li key={cat.id}>
              <button
                onClick={() => onChoose(cat.id, applyToAll)}
                className="w-full text-left px-3 py-2 rounded border border-finance-border hover:bg-finance-primary/5 text-sm"
              >
                <span className="font-medium">{cat.name}</span>
                <span className="ml-2 text-finance-muted text-xs">#{cat.budgetCode}</span>
              </button>
            </li>
          ))}
        </ul>
        <label className="flex items-center gap-2 text-xs text-finance-muted mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={applyToAll}
            onChange={(e) => setApplyToAll(e.target.checked)}
          />
          {t('dashboard.opsBudget.applyToAllMatching')}
        </label>
        <button
          onClick={onSkip}
          className="text-xs text-finance-muted hover:underline"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}

// ---------- Main Component ----------

export default function OpsBudgetItemPicker({ project, currentUser }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const projectId = project.id

  // Derive categories + totalKrw from project doc (stays reactive to project changes)
  const categories = useMemo(
    () => [...(project.opsBudget?.categories ?? [])].sort((a, b) => a.sortIndex - b.sortIndex),
    [project.opsBudget?.categories]
  )
  const totalKrw = project.opsBudget?.totalKrw ?? 0

  const includable = useOpsBudgetIncludableItems(projectId)
  const allOps = useOpsBudgetAllOperationsItems(projectId)

  const add = useAddInclusion()
  const updateCategories = useUpdateOpsBudgetCategories()

  // --- Filter state ---
  const [search, setSearch] = useState('')
  const [sessionFilter, setSessionFilter] = useState<string>('__all__')
  const [showIncluded, setShowIncluded] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [shown, setShown] = useState(PAGE_SIZE)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectionClearedToastShown, setSelectionClearedToastShown] = useState(false)

  // Disambiguation modal state
  const [disambig, setDisambig] = useState<DisambiguateState | null>(null)

  // Create-category flow state
  const [createFlow, setCreateFlow] = useState<CreateCategoryFlowState | null>(null)
  // Pending new category waiting for redistribute confirmation
  const [pendingNewCategory, setPendingNewCategory] = useState<{
    category: OpsBudgetCategory
    itemsForThisCode: AnnotatedOperationsItem[]
  } | null>(null)

  // Sentinel ref for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // --- Source data ---
  const rawItems: AnnotatedOperationsItem[] = showIncluded
    ? (allOps.data ?? [])
    : (includable.data ?? []).map((it) => ({ ...it, assignedCategoryId: null }))

  const isLoading = showIncluded ? allOps.isLoading : includable.isLoading

  // --- Session options ---
  const sessions = useMemo(() => {
    const set = new Set<string>()
    for (const it of rawItems) set.add(it.snapshot.session)
    return Array.from(set).sort()
  }, [rawItems])

  // --- Filter + sort ---
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const result = rawItems.filter((it) => {
      if (sessionFilter !== '__all__' && it.snapshot.session !== sessionFilter) return false
      if (!q) return true
      return (
        it.snapshot.payee.toLowerCase().includes(q) ||
        it.snapshot.description.toLowerCase().includes(q) ||
        it.snapshot.session.toLowerCase().includes(q) ||
        it.requestId.toLowerCase().includes(q)
      )
    })
    return [...result].sort((a, b) => compareItems(a, b, sortKey, sortDir))
  }, [rawItems, search, sessionFilter, sortKey, sortDir])

  // --- Clear selection when filters change (with one-time toast) ---
  const prevFiltersRef = useRef({ search, sessionFilter })
  useEffect(() => {
    const prev = prevFiltersRef.current
    if (prev.search !== search || prev.sessionFilter !== sessionFilter) {
      prevFiltersRef.current = { search, sessionFilter }
      if (selected.size > 0) {
        setSelected(new Set())
        if (!selectionClearedToastShown) {
          toast({ variant: 'info', message: t('dashboard.opsBudget.selectionClearedOnFilterChange') })
          setSelectionClearedToastShown(true)
        }
      }
      setShown(PAGE_SIZE)
    }
  }, [search, sessionFilter, selected.size, selectionClearedToastShown, t, toast])

  // --- Sort handler ---
  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
        return prev
      }
      setSortDir('desc')
      return key
    })
  }, [])

  // --- Toggle selection (only for non-included items) ---
  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // --- Infinite scroll ---
  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && shown < filtered.length) {
          setShown((prev) => Math.min(prev + PAGE_SIZE, filtered.length))
        }
      },
      { rootMargin: '120px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [shown, filtered.length])

  // Reset pagination when filtered list changes
  useEffect(() => { setShown(PAGE_SIZE) }, [filtered.length])

  // ---------- submitItems helper ----------

  const submitItems = async (
    pairs: Array<{ item: AnnotatedOperationsItem; categoryId: string }>
  ): Promise<Set<string>> => {
    const results = await Promise.allSettled(
      pairs.map(({ item, categoryId }) =>
        add.mutateAsync({
          projectId,
          categoryId,
          requestId: item.requestId,
          itemIndex: item.itemIndex,
          snapshot: item.snapshot,
          addedBy: currentUser,
        })
      )
    )
    const failedIds = new Set<string>()
    let okCount = 0
    let permissionDenied = false
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') { okCount++; return }
      const id = inclusionId(pairs[i].item.requestId, pairs[i].item.itemIndex)
      failedIds.add(id)
      if ((r.reason as { code?: string })?.code === 'permission-denied') permissionDenied = true
    })
    if (okCount) toast({ variant: 'success', message: t('dashboard.opsBudget.addedCount', { count: okCount }) })
    if (permissionDenied) toast({ variant: 'danger', message: t('common.permissionDenied') })
    else if (failedIds.size) toast({ variant: 'danger', message: t('dashboard.opsBudget.addFailedCount', { count: failedIds.size }) })
    return failedIds
  }

  // ---------- Add selected handler ----------

  const handleAddSelected = async () => {
    if (selected.size === 0) return

    // Resolve targets from FULL items list (not filtered) — Minor #15 fix
    const targets = rawItems.filter(
      (it) => it.assignedCategoryId === null && selected.has(itemId(it))
    )
    if (targets.length === 0) return

    // Separate items by how many matching categories exist
    const immediateResolve: Array<{ item: AnnotatedOperationsItem; categoryId: string }> = []
    const needsDisambiguation: AnnotatedOperationsItem[] = []
    const noCategory: AnnotatedOperationsItem[] = []

    for (const it of targets) {
      const matches = categories.filter((c) => c.budgetCode === it.snapshot.budgetCode)
      if (matches.length === 0) {
        noCategory.push(it)
      } else if (matches.length === 1) {
        immediateResolve.push({ item: it, categoryId: matches[0].id })
      } else {
        needsDisambiguation.push(it)
      }
    }

    // Submit immediately-resolved items (fire-and-forget)
    let immediateFailedIds = new Set<string>()
    if (immediateResolve.length > 0) {
      immediateFailedIds = await submitItems(immediateResolve)
    }

    // Start create-category flow for items with no matching category
    if (noCategory.length > 0) {
      const itemsByCode = new Map<number, AnnotatedOperationsItem[]>()
      for (const it of noCategory) {
        const list = itemsByCode.get(it.snapshot.budgetCode) ?? []
        list.push(it)
        itemsByCode.set(it.snapshot.budgetCode, list)
      }
      const pendingCodes = Array.from(itemsByCode.keys())
      setCreateFlow({ pendingCodes, itemsByCode, resolved: [] })
      // Note: immediateFailedIds handled when create flow finishes via finishCreateFlow
      // If disambig also needed, it starts below; both can coexist (separate modals,
      // create flow renders on top at z-50, disambig will wait underneath)
    }

    // Start disambiguation queue if needed
    if (needsDisambiguation.length > 0) {
      setDisambig({
        queue: needsDisambiguation,
        resolved: [],
        codeResolution: new Map(),
      })
    } else if (noCategory.length === 0) {
      // No create flow, no disambig — update selection to keep failed items
      setSelected(immediateFailedIds)
    }
  }

  // ---------- Disambiguation handlers ----------

  const handleDisambiguateChoose = async (categoryId: string, applyToAll: boolean) => {
    if (!disambig) return
    const [current, ...remaining] = disambig.queue
    const newResolved = [...disambig.resolved, { item: current, categoryId }]
    const newCodeResolution = new Map(disambig.codeResolution)

    if (applyToAll) {
      newCodeResolution.set(current.snapshot.budgetCode, categoryId)
    }

    // Auto-resolve remaining items where code already has a resolution
    const stillPending: AnnotatedOperationsItem[] = []
    const autoResolved: Array<{ item: AnnotatedOperationsItem; categoryId: string }> = []
    for (const it of remaining) {
      const auto = newCodeResolution.get(it.snapshot.budgetCode)
      if (auto) {
        autoResolved.push({ item: it, categoryId: auto })
      } else {
        stillPending.push(it)
      }
    }

    const allResolved = [...newResolved, ...autoResolved]

    if (stillPending.length === 0) {
      // Done with disambiguation
      setDisambig(null)
      const failedIds = await submitItems(allResolved)
      setSelected(failedIds)
    } else {
      setDisambig({ queue: stillPending, resolved: allResolved, codeResolution: newCodeResolution })
    }
  }

  const handleDisambiguateSkip = async () => {
    if (!disambig) return
    const [, ...remaining] = disambig.queue
    if (remaining.length === 0) {
      // No more to disambiguate; submit already-resolved ones
      setDisambig(null)
      if (disambig.resolved.length > 0) {
        const failedIds = await submitItems(disambig.resolved)
        setSelected(failedIds)
      } else {
        setSelected(new Set())
      }
    } else {
      setDisambig({ ...disambig, queue: remaining })
    }
  }

  // ---------- Create-category flow handlers ----------

  const finishCreateFlow = async (resolved: Array<{ item: AnnotatedOperationsItem; categoryId: string }>) => {
    setCreateFlow(null)
    if (resolved.length === 0) {
      setSelected(new Set())
      return
    }
    const failedIds = await submitItems(resolved)
    setSelected(failedIds)
  }

  const persistAndAdvance = async (
    newCategory: OpsBudgetCategory,
    deductions: Record<string, number>,
    itemsForCode: AnnotatedOperationsItem[],
    code: number,
  ) => {
    if (!createFlow) return
    // Build updated categories with deductions applied + new category appended
    const updatedCategories: OpsBudgetCategory[] = [
      ...categories.map((c) =>
        deductions[c.id]
          ? { ...c, allocatedKrw: c.allocatedKrw - deductions[c.id] }
          : c
      ),
      newCategory,
    ]
    try {
      await updateCategories.mutateAsync({
        projectId,
        categories: updatedCategories,
        updatedBy: currentUser,
      })
    } catch (err) {
      toast({
        variant: 'danger',
        message: `${t('common.saveError')}: ${(err as Error).message}`,
      })
      return
    }
    // Append items resolved to this new category
    const newResolvedForCode = itemsForCode.map((item) => ({ item, categoryId: newCategory.id }))
    const newResolvedAll = [...createFlow.resolved, ...newResolvedForCode]
    // Advance queue
    const nextPending = createFlow.pendingCodes.filter((c) => c !== code)
    if (nextPending.length === 0) {
      await finishCreateFlow(newResolvedAll)
    } else {
      setCreateFlow({ ...createFlow, pendingCodes: nextPending, resolved: newResolvedAll })
    }
  }

  const handleCreateCategoryConfirm = async (
    name: string,
    allocatedKrw: number,
    budgetCode: number,
    itemsForCode: AnnotatedOperationsItem[],
  ) => {
    const newCategory: OpsBudgetCategory = {
      id: newCategoryId(),
      name,
      budgetCode,
      allocatedKrw,
      sortIndex: categories.length,
      color: paletteColor(categories.length),
    }

    const ctx = computeRedistributeContext(categories, newCategory, totalKrw)
    if (ctx.deficit > 0) {
      // Check pool capacity before opening redistribute modal
      if (ctx.availablePool.length === 0) {
        toast({
          variant: 'danger',
          message: t('dashboard.opsBudget.cannotRedistributeNoOthers'),
        })
        return
      }
      const poolCapacity = ctx.availablePool.reduce((s, p) => s + p.allocatedKrw, 0)
      if (poolCapacity < ctx.deficit) {
        toast({
          variant: 'danger',
          message: t('dashboard.opsBudget.insufficientPoolCapacity', {
            deficit: ctx.deficit.toLocaleString('en-US'),
            available: poolCapacity.toLocaleString('en-US'),
          }),
        })
        return
      }
      // Open redistribute modal — dismiss create modal first
      setPendingNewCategory({ category: newCategory, itemsForThisCode: itemsForCode })
      return
    }

    // No redistribute needed — persist immediately
    await persistAndAdvance(newCategory, {}, itemsForCode, budgetCode)
  }

  const handleRedistributeApply = async (deductions: Record<string, number>) => {
    if (!pendingNewCategory) return
    const { category, itemsForThisCode } = pendingNewCategory
    setPendingNewCategory(null)
    await persistAndAdvance(category, deductions, itemsForThisCode, category.budgetCode)
  }

  const handleRedistributeCancel = () => {
    setPendingNewCategory(null)
    // Return to the create-category modal (createFlow is still set)
  }

  const handleCreateCategoryCancel = (code: number) => {
    if (!createFlow) return
    // Skip this code's items (they remain selected for retry)
    const nextPending = createFlow.pendingCodes.filter((c) => c !== code)
    if (nextPending.length === 0) {
      // Flow is done (no more codes); finishCreateFlow with whatever was already resolved
      void finishCreateFlow(createFlow.resolved)
    } else {
      setCreateFlow({ ...createFlow, pendingCodes: nextPending })
    }
  }

  // ---------- Category name lookup for "already included" chip ----------

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories) m.set(c.id, c.name)
    return m
  }, [categories])

  // --- Visible slice ---
  const visibleItems = filtered.slice(0, shown)

  return (
    <>
      {/* Disambiguation modal */}
      {disambig && disambig.queue.length > 0 && (() => {
        const current = disambig.queue[0]
        const matchingCategories = categories.filter(
          (c) => c.budgetCode === current.snapshot.budgetCode
        )
        return (
          <DisambiguateModal
            item={current}
            matchingCategories={matchingCategories}
            onChoose={handleDisambiguateChoose}
            onSkip={handleDisambiguateSkip}
          />
        )
      })()}

      {/* Create-category modal — shown when there's a pending code and no redistribute pending */}
      {createFlow && createFlow.pendingCodes.length > 0 && !pendingNewCategory && (() => {
        const currentCode = createFlow.pendingCodes[0]
        const itemsForCode = createFlow.itemsByCode.get(currentCode) ?? []
        return (
          <OpsBudgetCreateCategoryModal
            budgetCode={currentCode}
            itemCount={itemsForCode.length}
            defaultColor={paletteColor(categories.length)}
            onCreate={(name, allocatedKrw) =>
              handleCreateCategoryConfirm(name, allocatedKrw, currentCode, itemsForCode)
            }
            onCancel={() => handleCreateCategoryCancel(currentCode)}
          />
        )
      })()}

      {/* Redistribute modal — chained from create-category when deficit > 0 */}
      {pendingNewCategory && (() => {
        const draft = pendingNewCategory.category
        const ctx = computeRedistributeContext(categories, draft, totalKrw)
        return (
          <OpsBudgetRedistributeModal
            pool={ctx.availablePool}
            deficit={ctx.deficit}
            sourceLabel={t('dashboard.opsBudget.createNewSource', {
              name: draft.name,
              amount: draft.allocatedKrw.toLocaleString('en-US'),
            })}
            totalKrw={totalKrw}
            newSumBeforeRedistribute={ctx.newSum}
            onApply={handleRedistributeApply}
            onCancel={handleRedistributeCancel}
          />
        )
      })()}

      <div className="finance-panel rounded-lg p-4 sm:p-6 mt-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-finance-primary">
              {t('dashboard.opsBudget.pickerTitleGlobal')}
            </h3>
            <p className="text-xs text-finance-muted mt-1 max-w-md">
              {t('dashboard.opsBudget.pickerHintGlobal')}
            </p>
          </div>
          <button
            onClick={handleAddSelected}
            disabled={selected.size === 0 || add.isPending}
            className="finance-primary-button text-sm px-3 py-1.5 rounded disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {t('dashboard.opsBudget.addSelected', { count: selected.size })}
          </button>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('dashboard.opsBudget.searchPlaceholder')}
            aria-label={t('dashboard.opsBudget.searchPlaceholder')}
            className="border border-finance-border rounded px-2 py-1 text-sm flex-1 min-w-[160px]"
          />
          <select
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            aria-label={t('dashboard.opsBudget.sessionFilterAll')}
            className="border border-finance-border rounded px-2 py-1 text-sm"
          >
            <option value="__all__">{t('dashboard.opsBudget.sessionFilterAll')}</option>
            {sessions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <label className="text-xs flex items-center gap-1 text-finance-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showIncluded}
              onChange={(e) => {
                setShowIncluded(e.target.checked)
                setSelected(new Set())
                setShown(PAGE_SIZE)
              }}
            />
            {t('dashboard.opsBudget.showIncludedItems')}
          </label>
        </div>

        {/* Items count line */}
        {!isLoading && filtered.length > 0 && (
          <p className="text-xs text-finance-muted mb-2">
            {t('dashboard.opsBudget.itemsShown', {
              shown: visibleItems.length,
              total: filtered.length,
            })}
          </p>
        )}

        {/* Table */}
        {isLoading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-finance-muted py-6 text-center">
            {t('dashboard.opsBudget.noIncludableItems')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            {/* Header row */}
            <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-x-3 gap-y-0 border-b border-finance-border pb-1 mb-1 px-1">
              <span className="w-5" />
              <SortHeader label={t('dashboard.opsBudget.sortPayee')} sortKey="payee" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
              <span className="text-xs font-semibold uppercase tracking-wide text-finance-muted" />
              <SortHeader label={t('dashboard.opsBudget.sortAmount')} sortKey="amount" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
              <SortHeader label={t('dashboard.opsBudget.sortCode')} sortKey="code" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
            </div>

            <ul className="divide-y divide-finance-border-soft">
              {visibleItems.map((it) => {
                const id = itemId(it)
                const isIncluded = it.assignedCategoryId !== null
                const catName = isIncluded ? (categoryNameById.get(it.assignedCategoryId!) ?? it.assignedCategoryId!) : null
                const isUsd = it.snapshot.currency === 'USD'

                return (
                  <li
                    key={id}
                    className={`grid grid-cols-[auto_1fr_1fr_auto_auto] gap-x-3 items-center py-2 px-1 text-sm ${
                      isIncluded ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    {isIncluded ? (
                      <span className="w-5" />
                    ) : (
                      <input
                        type="checkbox"
                        checked={selected.has(id)}
                        onChange={() => toggle(id)}
                        aria-label={`${it.snapshot.payee} - ${it.snapshot.description}`}
                        className="w-4 h-4"
                      />
                    )}

                    {/* Payee + date */}
                    <div className="min-w-0">
                      <div className="truncate font-medium">{it.snapshot.payee}</div>
                      <div className="text-xs text-finance-muted">{it.snapshot.date} · {it.snapshot.session}</div>
                    </div>

                    {/* Description + included chip */}
                    <div className="min-w-0">
                      <div className="truncate text-finance-muted">{it.snapshot.description}</div>
                      {isIncluded && catName && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 mt-0.5">
                          {t('dashboard.opsBudget.alreadyIncludedChip', { name: catName })}
                        </span>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="text-right font-mono whitespace-nowrap">
                      {isUsd ? (
                        <span className="text-finance-muted">
                          ${it.snapshot.amountUsd.toLocaleString('en-US')}
                          <UsdChip tooltip={t('dashboard.opsBudget.usdNotDeducted')} />
                        </span>
                      ) : (
                        <span>{'₩'}{it.snapshot.amount.toLocaleString('en-US')}</span>
                      )}
                    </div>

                    {/* Budget code */}
                    <span className="font-mono text-xs text-finance-muted">{it.snapshot.budgetCode}</span>
                  </li>
                )
              })}
            </ul>

            {/* Infinite scroll sentinel */}
            <div ref={loadMoreRef} className="h-4" />
          </div>
        )}
      </div>
    </>
  )
}
