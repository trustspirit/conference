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
  useOpsBudgetInclusions,
  useAddInclusion,
  useUpdateOpsBudgetCategories,
  type AnnotatedOperationsItem,
} from '../../hooks/queries/useOpsBudget'
import type { OpsBudgetCategory, Project } from '../../types'
import { inclusionId, computeRedistributeContext, paletteColor, effectiveKrwForSnapshot, resolveUsdToKrwRate } from './opsBudgetSelectors'
import Spinner from '../Spinner'
import OpsBudgetCreateCategoryModal from './OpsBudgetCreateCategoryModal'
import OpsBudgetRedistributeModal from './OpsBudgetRedistributeModal'
import { OPS_BUDGET_PICKER_PAGE_SIZE } from './listPaging'

// ---------- Types ----------

interface Props {
  project: Project
  currentUser: { uid: string; name: string; email: string }
}

type SortKey = 'date' | 'amount' | 'submitter' | 'code'

interface DisambiguateState {
  /** Items that still need a category resolution */
  queue: AnnotatedOperationsItem[]
  /** Items already resolved */
  resolved: Array<{ item: AnnotatedOperationsItem; categoryId: string }>
  /** Map of budgetCode → chosen categoryId (from "apply to all" toggle) */
  codeResolution: Map<number, string>
}

/**
 * Internal pipeline used to serialize the three modal flows from a single Add click.
 * Stored in a ref (not state) to avoid re-render coupling.
 *
 * After overflow resolves (or was not needed), we process:
 *   Phase 2 — disambiguation items
 *   Phase 3 — create-category items
 */
interface AddPipeline {
  needsDisambig: AnnotatedOperationsItem[]
  needsCreate: AnnotatedOperationsItem[]
}

interface CreateCategoryFlowState {
  /** Queue of unique budgetCodes still to process */
  pendingCodes: number[]
  /** Items grouped by budgetCode (built once at flow start) */
  itemsByCode: Map<number, AnnotatedOperationsItem[]>
  /** Resolved items ready to submit (item + categoryId pairs) */
  resolved: Array<{ item: AnnotatedOperationsItem; categoryId: string }>
}

interface OverflowPlan {
  /** The full set of items the user wants to add (post-resolve) */
  pairs: Array<{ item: AnnotatedOperationsItem; categoryId: string }>
  /** For each over-allocated category: how much extra is needed */
  pending: Array<{
    categoryId: string
    overflow: number
    sourceLabel: string
    pool: Array<{ id: string; name: string; allocatedKrw: number; maxDeduction: number }>
  }>
  /** Per-categoryId map of deductions accumulated as user confirms each */
  appliedDeductions: Record<string, Record<string, number>>
}

const PAGE_SIZE = OPS_BUDGET_PICKER_PAGE_SIZE

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
    case 'submitter':
      cmp = (a.snapshot.submitterName || a.snapshot.payee).localeCompare(
        b.snapshot.submitterName || b.snapshot.payee
      )
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
          <span className="font-medium">{item.snapshot.submitterName || item.snapshot.payee}</span>
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
  const usdToKrwRate = resolveUsdToKrwRate(project)

  const includable = useOpsBudgetIncludableItems(projectId)
  const allOps = useOpsBudgetAllOperationsItems(projectId)
  const inclusions = useOpsBudgetInclusions(projectId)

  const add = useAddInclusion()
  const updateCategories = useUpdateOpsBudgetCategories()

  // Per-category effective KRW sum of already-included items.
  // USD items contribute amountUsd * usdToKrwRate (or 0 when rate is unset).
  const includedKrwByCategory = useMemo(() => {
    const m = new Map<string, number>()
    for (const inc of inclusions.data ?? []) {
      const eff = effectiveKrwForSnapshot(inc.snapshot, usdToKrwRate)
      m.set(inc.categoryId, (m.get(inc.categoryId) ?? 0) + eff)
    }
    return m
  }, [inclusions.data, usdToKrwRate])

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
    effectiveTotalKrw: number
  } | null>(null)

  // Category-level overflow plan (sequential modal queue)
  const [overflowPlan, setOverflowPlan] = useState<OverflowPlan | null>(null)

  // Pipeline ref: schedules deferred disambig/create phases after overflow resolves.
  // Stored as a ref (not state) so it doesn't trigger re-renders.
  const pipelineRef = useRef<AddPipeline | null>(null)

  // Sentinel: set to true synchronously inside submitItemsWithOverflowCheck when it
  // decides to queue an overflow plan (before React re-renders). Read immediately
  // after the call in handleAddSelected to decide whether to run phase 2+3 now or
  // defer to finalizeOverflowPlan.
  const overflowQueuedRef = useRef(false)

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
        (it.snapshot.submitterName || '').toLowerCase().includes(q) ||
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

  // ---------- submitItemsRaw: direct mutation (no cap check) ----------

  const submitItemsRaw = async (
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

  // ---------- Phase starters — declared here so finalizeOverflowPlan can reference them ----------

  const startCreateFlow = useCallback((items: AnnotatedOperationsItem[]) => {
    const itemsByCode = new Map<number, AnnotatedOperationsItem[]>()
    for (const it of items) {
      const list = itemsByCode.get(it.snapshot.budgetCode) ?? []
      list.push(it)
      itemsByCode.set(it.snapshot.budgetCode, list)
    }
    const pendingCodes = Array.from(itemsByCode.keys())
    setCreateFlow({ pendingCodes, itemsByCode, resolved: [] })
  }, [])

  const startDisambigFlow = useCallback((
    items: AnnotatedOperationsItem[],
    nextCreate: AnnotatedOperationsItem[],
  ) => {
    // Stash the create-phase items so disambig completion can advance the pipeline
    pipelineRef.current = { needsDisambig: [], needsCreate: nextCreate }
    setDisambig({ queue: items, resolved: [], codeResolution: new Map() })
  }, [])

  // ---------- finalizeOverflowPlan: apply category allocations then add inclusions ----------

  const finalizeOverflowPlan = async (plan: OverflowPlan) => {
    setOverflowPlan(null)
    // Compute net allocation changes per category
    const overflowByCatId = new Map<string, number>()
    const sourceDeductionMap = new Map<string, number>()
    for (const [overCatId, deductionsForThisCat] of Object.entries(plan.appliedDeductions)) {
      const totalDeducted = Object.values(deductionsForThisCat).reduce((s, v) => s + v, 0)
      overflowByCatId.set(overCatId, totalDeducted)
      for (const [sourceId, amount] of Object.entries(deductionsForThisCat)) {
        sourceDeductionMap.set(sourceId, (sourceDeductionMap.get(sourceId) ?? 0) + amount)
      }
    }
    const updatedCategories = categories.map((c) => {
      let next = c.allocatedKrw
      next += overflowByCatId.get(c.id) ?? 0          // add overflow received
      next -= sourceDeductionMap.get(c.id) ?? 0       // subtract deduction taken from this source
      return { ...c, allocatedKrw: next }
    })
    try {
      await updateCategories.mutateAsync({
        projectId,
        categories: updatedCategories,
        updatedBy: currentUser,
      })
    } catch (err) {
      toast({ variant: 'danger', message: `${t('common.saveError')}: ${(err as Error).message}` })
      return
    }
    // Now add the inclusions
    const failedIds = await submitItemsRaw(plan.pairs)
    setSelected(failedIds)

    // Advance the add-pipeline: start disambig or create phase if they were stashed
    const next = pipelineRef.current
    pipelineRef.current = null
    if (next?.needsDisambig.length) {
      startDisambigFlow(next.needsDisambig, next.needsCreate)
    } else if (next?.needsCreate.length) {
      startCreateFlow(next.needsCreate)
    }
  }

  // ---------- Overflow plan apply / cancel handlers ----------

  const handleOverflowApply = async (
    overflowCategoryId: string,
    deductions: Record<string, number>,
  ) => {
    if (!overflowPlan) return
    const updatedDeductions = {
      ...overflowPlan.appliedDeductions,
      [overflowCategoryId]: deductions,
    }
    const remainingPending = overflowPlan.pending.slice(1)
    if (remainingPending.length > 0) {
      setOverflowPlan({ ...overflowPlan, pending: remainingPending, appliedDeductions: updatedDeductions })
      return
    }
    // All overflows resolved — atomic apply
    await finalizeOverflowPlan({ ...overflowPlan, pending: [], appliedDeductions: updatedDeductions })
  }

  const handleOverflowCancel = (overflowCategoryId: string) => {
    if (!overflowPlan) return
    // Skip this category's items, continue queue
    const skippedPairs = overflowPlan.pairs.filter((p) => p.categoryId !== overflowCategoryId)
    const remainingPending = overflowPlan.pending.slice(1)
    if (remainingPending.length === 0) {
      void finalizeOverflowPlan({ ...overflowPlan, pairs: skippedPairs, pending: [] })
    } else {
      setOverflowPlan({ ...overflowPlan, pairs: skippedPairs, pending: remainingPending })
    }
  }

  // ---------- submitItemsWithOverflowCheck: check category-level overflow before submitting ----------

  const submitItemsWithOverflowCheck = async (
    pairs: Array<{ item: AnnotatedOperationsItem; categoryId: string }>
  ): Promise<Set<string>> => {
    // Group incoming effective KRW by categoryId.
    // USD items contribute amountUsd * usdToKrwRate (0 when rate=0 → skip cap check).
    const incomingByCat = new Map<string, number>()
    for (const { item, categoryId } of pairs) {
      const eff = effectiveKrwForSnapshot(item.snapshot, usdToKrwRate)
      if (eff === 0) continue   // nothing to count toward KRW cap
      incomingByCat.set(categoryId, (incomingByCat.get(categoryId) ?? 0) + eff)
    }

    // Compute overflow per category
    const overflowing: OverflowPlan['pending'] = []
    for (const [categoryId, incoming] of incomingByCat.entries()) {
      const cat = categories.find((c) => c.id === categoryId)
      if (!cat) continue
      const currentIncluded = includedKrwByCategory.get(categoryId) ?? 0
      const newIncluded = currentIncluded + incoming
      if (newIncluded > cat.allocatedKrw) {
        const overflow = newIncluded - cat.allocatedKrw
        // Build pool: OTHER categories with remaining > 0
        const pool = categories
          .filter((c) => c.id !== categoryId)
          .map((c) => {
            const cInc = includedKrwByCategory.get(c.id) ?? 0
            const remaining = Math.max(0, c.allocatedKrw - cInc)
            return { id: c.id, name: c.name, allocatedKrw: c.allocatedKrw, maxDeduction: remaining }
          })
          .filter((p) => p.maxDeduction > 0)
        const poolCapacity = pool.reduce((s, p) => s + p.maxDeduction, 0)
        if (poolCapacity < overflow) {
          toast({
            variant: 'danger',
            message: t('dashboard.opsBudget.cannotAddOverCategoryCap', {
              name: cat.name,
              overflow: overflow.toLocaleString('en-US'),
              available: poolCapacity.toLocaleString('en-US'),
            }),
          })
          // Mark all as failed so user retries
          return new Set(pairs.map((p) => itemId(p.item)))
        }
        overflowing.push({
          categoryId,
          overflow,
          sourceLabel: t('dashboard.opsBudget.categoryOverflowSource', {
            name: cat.name,
            overflow: overflow.toLocaleString('en-US'),
          }),
          pool,
        })
      }
    }

    if (overflowing.length === 0) {
      // No overflow — submit directly
      return submitItemsRaw(pairs)
    }

    // Open the overflow plan; modal rendered conditionally below.
    // Set the sentinel so handleAddSelected can detect this synchronously.
    overflowQueuedRef.current = true
    setOverflowPlan({ pairs, pending: overflowing, appliedDeductions: {} })
    // Caller gets empty failedIds; actual result propagated via setSelected in finalizeOverflowPlan
    return new Set()
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

    // Phase 1: submit immediately-resolved items (may queue overflow modal)
    if (immediateResolve.length > 0) {
      // Reset the sentinel before the call
      overflowQueuedRef.current = false
      await submitItemsWithOverflowCheck(immediateResolve)

      if (overflowQueuedRef.current) {
        // Overflow modal was opened synchronously inside the call.
        // Stash phases 2+3 in pipelineRef; finalizeOverflowPlan will advance them.
        pipelineRef.current = { needsDisambig: needsDisambiguation, needsCreate: noCategory }
        return  // pipeline resumes in finalizeOverflowPlan
      }
      // No overflow — phases 2+3 can start now.
    }

    // Phase 2: disambiguation
    if (needsDisambiguation.length > 0) {
      // startDisambigFlow stashes noCategory in pipelineRef for phase 3
      startDisambigFlow(needsDisambiguation, noCategory)
      return
    }

    // Phase 3: create-category
    if (noCategory.length > 0) {
      startCreateFlow(noCategory)
      return
    }

    // Nothing left to do; selection was already updated by submitItemsRaw
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
      // Done with disambiguation — submit resolved items, then advance pipeline to create phase
      setDisambig(null)
      const failedIds = await submitItemsWithOverflowCheck(allResolved)
      setSelected(failedIds)
      // Advance pipeline: start create-category phase if stashed
      const next = pipelineRef.current
      pipelineRef.current = null
      if (next?.needsCreate.length) {
        startCreateFlow(next.needsCreate)
      }
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
        const failedIds = await submitItemsWithOverflowCheck(disambig.resolved)
        setSelected(failedIds)
      } else {
        setSelected(new Set())
      }
      // Advance pipeline: start create-category phase if stashed
      const next = pipelineRef.current
      pipelineRef.current = null
      if (next?.needsCreate.length) {
        startCreateFlow(next.needsCreate)
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
    const failedIds = await submitItemsWithOverflowCheck(resolved)
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

    const sumAllocated = categories.reduce((s, c) => s + c.allocatedKrw, 0)
    const effectiveTotalKrw = totalKrw > 0 ? totalKrw : sumAllocated
    const ctx = computeRedistributeContext(categories, newCategory, effectiveTotalKrw)
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
      setPendingNewCategory({ category: newCategory, itemsForThisCode: itemsForCode, effectiveTotalKrw })
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
      {/* Category-overflow redistribute modal — highest priority; renders before any other modal */}
      {overflowPlan && overflowPlan.pending.length > 0 && (() => {
        const current = overflowPlan.pending[0]
        return (
          <OpsBudgetRedistributeModal
            pool={current.pool}
            deficit={current.overflow}
            sourceLabel={current.sourceLabel}
            totalKrw={null}
            onApply={(deductions) => handleOverflowApply(current.categoryId, deductions)}
            onCancel={() => handleOverflowCancel(current.categoryId)}
          />
        )
      })()}

      {/* Disambiguation modal — only when no overflow modal is active */}
      {disambig && disambig.queue.length > 0 && !overflowPlan && (() => {
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

      {/* Redistribute modal — chained from create-category when deficit > 0; only when no overflow or disambig active */}
      {pendingNewCategory && !overflowPlan && !disambig && (() => {
        const draft = pendingNewCategory.category
        const ctx = computeRedistributeContext(categories, draft, pendingNewCategory.effectiveTotalKrw)
        return (
          <OpsBudgetRedistributeModal
            pool={ctx.availablePool}
            deficit={ctx.deficit}
            sourceLabel={t('dashboard.opsBudget.createNewSource', {
              name: draft.name,
              amount: draft.allocatedKrw.toLocaleString('en-US'),
            })}
            totalKrw={pendingNewCategory.effectiveTotalKrw}
            newSumBeforeRedistribute={ctx.newSum}
            onApply={handleRedistributeApply}
            onCancel={handleRedistributeCancel}
          />
        )
      })()}

      {/* Create-category modal — only when no overflow, disambig, or redistribute active */}
      {createFlow && createFlow.pendingCodes.length > 0 && !pendingNewCategory && !overflowPlan && !disambig && (() => {
        const currentCode = createFlow.pendingCodes[0]
        const itemsForCode = createFlow.itemsByCode.get(currentCode) ?? []
        const itemsTotalKrw = itemsForCode.reduce(
          (s, it) => s + effectiveKrwForSnapshot(it.snapshot, usdToKrwRate),
          0
        )
        const itemsTotalUsd = itemsForCode.reduce(
          (s, it) => s + (it.snapshot.currency === 'USD' ? it.snapshot.amountUsd : 0),
          0
        )
        return (
          <OpsBudgetCreateCategoryModal
            budgetCode={currentCode}
            itemCount={itemsForCode.length}
            itemsTotalKrw={itemsTotalKrw}
            itemsTotalUsd={itemsTotalUsd}
            defaultColor={paletteColor(categories.length)}
            onCreate={async (name) => { await handleCreateCategoryConfirm(name, itemsTotalKrw, currentCode, itemsForCode) }}
            onCancel={() => handleCreateCategoryCancel(currentCode)}
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
            disabled={
              selected.size === 0 ||
              add.isPending ||
              !!overflowPlan ||
              !!createFlow ||
              !!pendingNewCategory ||
              !!disambig
            }
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
            <div className="grid grid-cols-[auto_minmax(80px,140px)_1fr_auto_auto] gap-x-3 gap-y-0 border-b border-finance-border pb-1 mb-1 px-1">
              <span className="w-5" />
              <SortHeader label={t('dashboard.opsBudget.sortSubmitter')} sortKey="submitter" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
              <span className="text-xs font-semibold uppercase tracking-wide text-finance-muted">
                {t('dashboard.opsBudget.colDescription')}
              </span>
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
                    className={`grid grid-cols-[auto_minmax(80px,140px)_1fr_auto_auto] gap-x-3 items-center py-2 px-1 text-sm ${
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
                        aria-label={`${it.snapshot.submitterName || it.snapshot.payee} - ${it.snapshot.description}`}
                        className="w-4 h-4"
                      />
                    )}

                    {/* Submitter + date */}
                    <div className="min-w-0">
                      <div className="truncate font-medium">{it.snapshot.submitterName || it.snapshot.payee}</div>
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
                          <UsdChip tooltip={
                            usdToKrwRate > 0
                              ? t('dashboard.opsBudget.usdConvertedHint', {
                                  amount: effectiveKrwForSnapshot(it.snapshot, usdToKrwRate).toLocaleString('en-US'),
                                })
                              : t('dashboard.opsBudget.usdNotDeducted')
                          } />
                          {usdToKrwRate > 0 && (
                            <span className="ml-1 text-[10px] text-finance-muted">
                              (≈₩{effectiveKrwForSnapshot(it.snapshot, usdToKrwRate).toLocaleString('en-US')})
                            </span>
                          )}
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
