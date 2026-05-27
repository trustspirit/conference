import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from 'trust-ui-react'
import FinanceTable from '../table/FinanceTable'
import {
  paletteColor, computeCategoryTotals,
  computeRedistributeContext,
  resolveUsdToKrwRate,
} from './opsBudgetSelectors'
import { useUpdateOpsBudgetCategories, useDeleteCategoryWithInclusions } from '../../hooks/queries/useOpsBudget'
import { UNIQUE_BUDGET_CODES } from '../../constants/budgetCodes'
import type {
  OpsBudgetCategory, OpsBudgetInclusion, Project,
} from '../../types'
import OpsBudgetRedistributeModal from './OpsBudgetRedistributeModal'

interface Props {
  project: Project
  inclusions: OpsBudgetInclusion[]
  currentUser: { uid: string; name: string; email: string }
  selectedCategoryId: string | null
  onSelectCategory: (id: string | null) => void
}

function newCategoryId() {
  return (
    (globalThis.crypto?.randomUUID?.() as string | undefined) ??
    `cat_${Date.now()}_${Math.random().toString(36).slice(2)}`
  )
}

// ---------------------------------------------------------------------------
// Redistribution modal state shape
// ---------------------------------------------------------------------------

type RedistributeState =
  | {
      mode: 'add'
      pool: Array<{ id: string; name: string; allocatedKrw: number }>
      deficit: number
      sourceLabel: string
      newSumBefore: number
      totalKrw: number
      draftCategory: OpsBudgetCategory
    }
  | {
      mode: 'edit'
      pool: Array<{ id: string; name: string; allocatedKrw: number }>
      deficit: number
      sourceLabel: string
      newSumBefore: number
      totalKrw: number
      draftCategory: OpsBudgetCategory
    }
  | {
      mode: 'reduce-total'
      pool: Array<{ id: string; name: string; allocatedKrw: number }>
      deficit: number
      sourceLabel: string
      newSumBefore: number
      newTotal: number
    }

// ---------------------------------------------------------------------------

export default function OpsBudgetCategoryTable({
  project, inclusions, currentUser, selectedCategoryId, onSelectCategory,
}: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const update = useUpdateOpsBudgetCategories()
  const deleteCategory = useDeleteCategoryWithInclusions()
  const categories = useMemo(
    () => [...(project.opsBudget?.categories ?? [])].sort((a, b) => a.sortIndex - b.sortIndex),
    [project.opsBudget?.categories]
  )
  const totalKrw = project.opsBudget?.totalKrw ?? 0
  const usdToKrwRate = resolveUsdToKrwRate(project)
  const sumAllocated = categories.reduce((s, c) => s + c.allocatedKrw, 0)

  const totals = useMemo(
    () => computeCategoryTotals(categories, inclusions, usdToKrwRate),
    [categories, inclusions, usdToKrwRate]
  )

  // --- total budget editing ---
  const [editingTotal, setEditingTotal] = useState(false)
  const [tempTotal, setTempTotal] = useState<number>(totalKrw)

  // --- category editing / adding ---
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<OpsBudgetCategory | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState<number>(UNIQUE_BUDGET_CODES[0])
  const [newAlloc, setNewAlloc] = useState<number>(0)

  // --- redistribute modal ---
  const [redistributeState, setRedistributeState] = useState<RedistributeState | null>(null)

  // ---------------------------------------------------------------------------
  // Persist helpers
  // ---------------------------------------------------------------------------

  /** Persist categories (and optionally a new totalKrw) to Firestore. */
  const persist = (next: OpsBudgetCategory[], nextTotal?: number) =>
    new Promise<void>((resolve, reject) =>
      update.mutate(
        {
          projectId: project.id,
          categories: next,
          ...(nextTotal !== undefined ? { totalKrw: nextTotal } : {}),
          updatedBy: currentUser,
        },
        {
          onSuccess: () => resolve(),
          onError: (err) => {
            toast({ variant: 'danger', message: `${t('common.saveError')}: ${(err as Error).message}` })
            reject(err)
          },
        }
      )
    )

  // ---------------------------------------------------------------------------
  // Total budget save
  // ---------------------------------------------------------------------------

  const handleSaveTotal = async () => {
    const safeTotal = Math.max(0, Math.floor(tempTotal) || 0)
    const currentTotal = project.opsBudget?.totalKrw ?? 0
    if (safeTotal === currentTotal) { setEditingTotal(false); return }
    if (safeTotal > 0 && safeTotal < sumAllocated) {
      // New total is less than current sum — need redistribution
      setRedistributeState({
        mode: 'reduce-total',
        pool: categories.map((c) => ({ id: c.id, name: c.name, allocatedKrw: c.allocatedKrw })),
        deficit: sumAllocated - safeTotal,
        newTotal: safeTotal,
        sourceLabel: t('dashboard.opsBudget.reduceTotalSource', {
          from: currentTotal.toLocaleString('en-US'),
          to: safeTotal.toLocaleString('en-US'),
        }),
        newSumBefore: sumAllocated,
      })
      return
    }
    // No conflict — save directly
    try {
      await persist(categories, safeTotal)
      setEditingTotal(false)
    } catch { /* persist already toasted */ }
  }

  // ---------------------------------------------------------------------------
  // Add category
  // ---------------------------------------------------------------------------

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast({ variant: 'danger', message: t('dashboard.opsBudget.nameRequired') })
      return
    }
    const draftCategory: OpsBudgetCategory = {
      id: newCategoryId(),
      name: newName.trim(),
      budgetCode: newCode,
      allocatedKrw: newAlloc,
      sortIndex: categories.length,
      color: paletteColor(categories.length),
    }

    if (newAlloc > 0) {
      const effectiveTotalKrw = totalKrw > 0 ? totalKrw : sumAllocated
      if (effectiveTotalKrw > 0) {
        const ctx = computeRedistributeContext(categories, draftCategory, effectiveTotalKrw)
        if (ctx.deficit > 0) {
          if (ctx.availablePool.length === 0) {
            toast({ variant: 'danger', message: t('dashboard.opsBudget.cannotRedistributeNoOthers') })
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
          setRedistributeState({
            mode: 'add',
            pool: ctx.availablePool,
            deficit: ctx.deficit,
            sourceLabel: t('dashboard.opsBudget.addCategorySource', {
              name: draftCategory.name,
              amount: newAlloc.toLocaleString('en-US'),
            }),
            newSumBefore: ctx.newSum,
            totalKrw: effectiveTotalKrw,
            draftCategory,
          })
          return
        }
      }
    }

    // No conflict — persist directly
    try {
      await persist([...categories, draftCategory])
      setAdding(false); setNewName(''); setNewAlloc(0); setNewCode(UNIQUE_BUDGET_CODES[0])
    } catch { /* persist already toasted; leave form open */ }
  }

  // ---------------------------------------------------------------------------
  // Edit category (save)
  // ---------------------------------------------------------------------------

  const handleSaveEdit = async () => {
    if (!draft) return
    if (!draft.name.trim()) {
      toast({ variant: 'danger', message: t('dashboard.opsBudget.nameRequired') })
      return
    }

    {
      const original = categories.find((c) => c.id === draft.id)
      const allocationIncreased = !original || draft.allocatedKrw > original.allocatedKrw
      if (allocationIncreased) {
        const effectiveTotalKrw = totalKrw > 0 ? totalKrw : sumAllocated
        if (effectiveTotalKrw > 0) {
          const ctx = computeRedistributeContext(categories, draft, effectiveTotalKrw)
          if (ctx.deficit > 0) {
            if (ctx.availablePool.length === 0) {
              toast({ variant: 'danger', message: t('dashboard.opsBudget.cannotRedistributeNoOthers') })
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
            setRedistributeState({
              mode: 'edit',
              pool: ctx.availablePool,
              deficit: ctx.deficit,
              sourceLabel: t('dashboard.opsBudget.editCategorySource', {
                name: draft.name,
                from: (original?.allocatedKrw ?? 0).toLocaleString('en-US'),
                to: draft.allocatedKrw.toLocaleString('en-US'),
              }),
              newSumBefore: ctx.newSum,
              totalKrw: effectiveTotalKrw,
              draftCategory: draft,
            })
            return
          }
        }
      }
    }

    const next = categories.map((c) => (c.id === draft.id ? draft : c))
    try {
      await persist(next)
      setEditingId(null); setDraft(null)
    } catch { /* persist already toasted; leave form open */ }
  }

  // ---------------------------------------------------------------------------
  // Delete category
  // ---------------------------------------------------------------------------

  const handleDelete = async (cat: OpsBudgetCategory) => {
    const refs = inclusions.filter((i) => i.categoryId === cat.id).length
    const confirmMsg = refs > 0
      ? t('dashboard.opsBudget.deleteWithInclusions', { count: refs })
      : t('dashboard.opsBudget.confirmDelete', { name: cat.name })
    if (!window.confirm(confirmMsg)) return
    const next = categories
      .filter((c) => c.id !== cat.id)
      .map((c, i) => ({ ...c, sortIndex: i }))
    try {
      await deleteCategory.mutateAsync({
        projectId: project.id,
        categoryId: cat.id,
        nextCategories: next,
        updatedBy: currentUser,
      })
      if (selectedCategoryId === cat.id) onSelectCategory(next[0]?.id ?? null)
    } catch (err) {
      toast({ variant: 'danger', message: `${t('common.saveError')}: ${(err as Error).message}` })
    }
  }

  // ---------------------------------------------------------------------------
  // Redistribution apply
  // ---------------------------------------------------------------------------

  const handleRedistributeApply = async (deductions: Record<string, number>) => {
    if (!redistributeState) return

    const applyDeductions = (base: OpsBudgetCategory[]): OpsBudgetCategory[] =>
      base.map((c) => {
        const ded = deductions[c.id] ?? 0
        return ded > 0 ? { ...c, allocatedKrw: c.allocatedKrw - ded } : c
      })

    if (redistributeState.mode === 'add') {
      const { draftCategory } = redistributeState
      const withDeductions = applyDeductions(categories)
      const next = [...withDeductions, draftCategory]
      try {
        await persist(next)
        setRedistributeState(null)
        setAdding(false); setNewName(''); setNewAlloc(0); setNewCode(UNIQUE_BUDGET_CODES[0])
      } catch { /* persist already toasted */ }
    } else if (redistributeState.mode === 'edit') {
      const { draftCategory } = redistributeState
      const withDeductions = applyDeductions(categories)
      const next = withDeductions.map((c) => (c.id === draftCategory.id ? draftCategory : c))
      try {
        await persist(next)
        setRedistributeState(null)
        setEditingId(null); setDraft(null)
      } catch { /* persist already toasted */ }
    } else {
      // reduce-total
      const { newTotal } = redistributeState
      const withDeductions = applyDeductions(categories)
      try {
        await persist(withDeductions, newTotal)
        setRedistributeState(null)
        setEditingTotal(false)
      } catch { /* persist already toasted */ }
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {redistributeState && (
        <OpsBudgetRedistributeModal
          pool={redistributeState.pool}
          deficit={redistributeState.deficit}
          sourceLabel={redistributeState.sourceLabel}
          totalKrw={redistributeState.mode === 'reduce-total' ? redistributeState.newTotal : redistributeState.totalKrw}
          newSumBeforeRedistribute={redistributeState.newSumBefore}
          onApply={handleRedistributeApply}
          onCancel={() => setRedistributeState(null)}
        />
      )}

      <div className="finance-panel rounded-lg p-4 sm:p-6 mt-6">
        {/* Total budget editor */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-finance-border-soft">
          <div className="flex-1">
            <p className="text-xs text-finance-muted">{t('dashboard.opsBudget.opsTotalBudget')}</p>
            {editingTotal ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number" min={0}
                  value={tempTotal || ''}
                  onChange={(e) => setTempTotal(Number(e.target.value) || 0)}
                  autoFocus
                  className="border border-finance-border rounded px-2 py-1 text-sm w-40"
                />
                <button
                  onClick={handleSaveTotal}
                  className="text-xs text-finance-primary"
                >
                  {t('common.save')}
                </button>
                <button
                  onClick={() => { setEditingTotal(false); setTempTotal(totalKrw) }}
                  className="text-xs text-finance-muted"
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-lg font-semibold text-finance-text">
                  {'₩'}{totalKrw.toLocaleString('en-US')}
                </span>
                <button
                  onClick={() => { setTempTotal(totalKrw); setEditingTotal(true) }}
                  className="text-xs text-finance-primary hover:underline"
                >
                  {t('common.edit')}
                </button>
                {totalKrw > 0 && (
                  <span className={`text-xs ${sumAllocated > totalKrw ? 'text-finance-danger' : 'text-finance-muted'}`}>
                    ({t('dashboard.opsBudget.allocatedOfTotal', {
                      allocated: sumAllocated.toLocaleString('en-US'),
                      total: totalKrw.toLocaleString('en-US'),
                    })})
                  </span>
                )}
              </div>
            )}

          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-finance-primary">
            {t('dashboard.opsBudget.categoriesTitle')}
          </h3>
          <button
            onClick={() => setAdding(true)}
            className="finance-primary-button text-sm px-3 py-1 rounded"
          >
            + {t('dashboard.opsBudget.addCategory')}
          </button>
        </div>

        <FinanceTable variant="embedded" minWidthClassName="min-w-[720px]">
          <FinanceTable.Head>
            <tr>
              <FinanceTable.Th size="compact">{t('dashboard.opsBudget.colName')}</FinanceTable.Th>
              <FinanceTable.Th size="compact">{t('dashboard.opsBudget.colBudgetCode')}</FinanceTable.Th>
              <FinanceTable.Th size="compact" align="right">{t('dashboard.opsBudget.colAllocated')}</FinanceTable.Th>
              <FinanceTable.Th size="compact" align="right">{t('dashboard.opsBudget.colIncluded')}</FinanceTable.Th>
              <FinanceTable.Th size="compact" align="right">USD</FinanceTable.Th>
              <FinanceTable.Th size="compact" align="right">{t('dashboard.opsBudget.colRemaining')}</FinanceTable.Th>
              <FinanceTable.Th size="compact" align="right">{t('dashboard.opsBudget.colUsage')}</FinanceTable.Th>
              <FinanceTable.Th size="compact" align="right">{t('common.actions')}</FinanceTable.Th>
            </tr>
          </FinanceTable.Head>
          <FinanceTable.Body>
            {categories.map((cat) => {
              const t1 = totals.byCategory[cat.id]
              const editing = editingId === cat.id && draft
              return (
                <FinanceTable.Row
                  key={cat.id}
                  hover
                  selected={selectedCategoryId === cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                >
                  <FinanceTable.Td size="compact">
                    <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                          style={{ backgroundColor: cat.color ?? paletteColor(cat.sortIndex) }} />
                    {editing
                      ? <input value={draft!.name}
                               onChange={(e) => setDraft({ ...draft!, name: e.target.value })}
                               onClick={(e) => e.stopPropagation()}
                               aria-label={t('dashboard.opsBudget.colName')}
                               className="border rounded px-1 py-0.5 text-sm" />
                      : <span className="font-medium">{cat.name}</span>}
                  </FinanceTable.Td>
                  <FinanceTable.Td size="compact">
                    {editing
                      ? <select value={draft!.budgetCode}
                                onChange={(e) => setDraft({ ...draft!, budgetCode: Number(e.target.value) })}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={t('dashboard.opsBudget.colBudgetCode')}
                                className="border rounded px-1 py-0.5 text-sm">
                          {UNIQUE_BUDGET_CODES.map((c) =>
                            <option key={c} value={c}>{c} — {t(`budgetCode.${c}`)}</option>)}
                        </select>
                      : <span className="font-mono">{cat.budgetCode}</span>}
                  </FinanceTable.Td>
                  <FinanceTable.Td size="compact" align="right">
                    {editing
                      ? <input type="number" value={draft!.allocatedKrw || ''}
                               onChange={(e) => setDraft({ ...draft!, allocatedKrw: Number(e.target.value) || 0 })}
                               onClick={(e) => e.stopPropagation()}
                               aria-label={t('dashboard.opsBudget.colAllocated')}
                               className="border rounded px-1 py-0.5 text-sm w-28 text-right" />
                      : `₩${cat.allocatedKrw.toLocaleString('en-US')}`}
                  </FinanceTable.Td>
                  <FinanceTable.Td size="compact" align="right">
                    {`₩${t1.includedKrw.toLocaleString('en-US')}`}
                  </FinanceTable.Td>
                  <FinanceTable.Td size="compact" align="right">
                    {t1.includedUsd ? `$${t1.includedUsd.toLocaleString('en-US')}` : '-'}
                  </FinanceTable.Td>
                  <FinanceTable.Td size="compact" align="right"
                    className={t1.remainingKrw < 0 ? 'text-finance-danger font-semibold' : ''}>
                    {`₩${t1.remainingKrw.toLocaleString('en-US')}`}
                  </FinanceTable.Td>
                  <FinanceTable.Td size="compact" align="right">
                    {(t1.usageRatio * 100).toFixed(0)}%
                  </FinanceTable.Td>
                  <FinanceTable.Td size="compact" align="right" onClick={(e) => e.stopPropagation()}>
                    {editing
                      ? <span className="flex gap-1 justify-end">
                          <button className="text-xs text-finance-muted"
                                  onClick={() => { setEditingId(null); setDraft(null) }}>
                            {t('common.cancel')}
                          </button>
                          <button className="text-xs text-finance-primary"
                                  onClick={handleSaveEdit}>
                            {t('common.save')}
                          </button>
                        </span>
                      : <span className="flex gap-2 justify-end">
                          <button className="text-xs text-finance-primary"
                                  onClick={() => { setEditingId(cat.id); setDraft({ ...cat }) }}>
                            {t('common.edit')}
                          </button>
                          <button className="text-xs text-finance-danger"
                                  onClick={() => handleDelete(cat)}>
                            {t('common.delete')}
                          </button>
                        </span>}
                  </FinanceTable.Td>
                </FinanceTable.Row>
              )
            })}

            {adding && (
              <FinanceTable.Row hover={false}>
                <FinanceTable.Td size="compact">
                  <input autoFocus value={newName}
                         onChange={(e) => setNewName(e.target.value)}
                         onClick={(e) => e.stopPropagation()}
                         aria-label={t('dashboard.opsBudget.colName')}
                         placeholder={t('dashboard.opsBudget.namePlaceholder')}
                         className="border rounded px-1 py-0.5 text-sm w-full" />
                </FinanceTable.Td>
                <FinanceTable.Td size="compact">
                  <select value={newCode} onChange={(e) => setNewCode(Number(e.target.value))}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={t('dashboard.opsBudget.colBudgetCode')}
                          className="border rounded px-1 py-0.5 text-sm">
                    {UNIQUE_BUDGET_CODES.map((c) =>
                      <option key={c} value={c}>{c} — {t(`budgetCode.${c}`)}</option>)}
                  </select>
                </FinanceTable.Td>
                <FinanceTable.Td size="compact" align="right">
                  <input type="number" value={newAlloc || ''}
                         onChange={(e) => setNewAlloc(Number(e.target.value) || 0)}
                         onClick={(e) => e.stopPropagation()}
                         aria-label={t('dashboard.opsBudget.colAllocated')}
                         className="border rounded px-1 py-0.5 text-sm w-28 text-right" />
                </FinanceTable.Td>
                <FinanceTable.Td size="compact" colSpan={4} />
                <FinanceTable.Td size="compact" align="right">
                  <span className="flex gap-1 justify-end">
                    <button className="text-xs text-finance-muted"
                            onClick={() => { setAdding(false); setNewName('') }}>
                      {t('common.cancel')}
                    </button>
                    <button className="text-xs text-finance-primary" onClick={handleAdd}>
                      {t('common.save')}
                    </button>
                  </span>
                </FinanceTable.Td>
              </FinanceTable.Row>
            )}

            {categories.length === 0 && !adding && (
              <FinanceTable.Row hover={false}>
                <FinanceTable.Td size="compact" colSpan={8} align="center" className="text-finance-muted py-6">
                  {t('dashboard.opsBudget.noCategories')}
                </FinanceTable.Td>
              </FinanceTable.Row>
            )}
          </FinanceTable.Body>
          {categories.length > 0 && (
            <FinanceTable.Footer>
              <tr>
                <FinanceTable.Td size="compact" colSpan={2} align="right" className="font-medium">
                  {t('dashboard.opsBudget.totals')}
                </FinanceTable.Td>
                <FinanceTable.Td size="compact" align="right" className="font-semibold">
                  {`₩${totals.grandAllocatedKrw.toLocaleString('en-US')}`}
                </FinanceTable.Td>
                <FinanceTable.Td size="compact" align="right" className="font-semibold">
                  {`₩${totals.grandTotalKrw.toLocaleString('en-US')}`}
                </FinanceTable.Td>
                <FinanceTable.Td size="compact" align="right" className="font-semibold">
                  {totals.grandTotalUsd ? `$${totals.grandTotalUsd.toLocaleString('en-US')}` : '-'}
                </FinanceTable.Td>
                <FinanceTable.Td size="compact" align="right"
                  className={`font-semibold ${totals.grandRemainingKrw < 0 ? 'text-finance-danger' : ''}`}>
                  {`₩${totals.grandRemainingKrw.toLocaleString('en-US')}`}
                </FinanceTable.Td>
                <FinanceTable.Td size="compact" colSpan={2} />
              </tr>
            </FinanceTable.Footer>
          )}
        </FinanceTable>

        <div className="mt-4 border-t border-finance-border pt-4">
          <h4 className="text-xs font-semibold text-finance-primary mb-2">
            {t('dashboard.opsBudget.codeReconcile')}
          </h4>
          <FinanceTable variant="embedded" minWidthClassName="min-w-[320px]">
            <FinanceTable.Head>
              <tr>
                <FinanceTable.Th size="compact">{t('dashboard.opsBudget.colBudgetCode')}</FinanceTable.Th>
                <FinanceTable.Th size="compact" align="right">{t('dashboard.opsBudget.opsAllocated')}</FinanceTable.Th>
              </tr>
            </FinanceTable.Head>
            <FinanceTable.Body>
              {UNIQUE_BUDGET_CODES.map((code) => {
                const opsAlloc = categories
                  .filter((c) => c.budgetCode === code)
                  .reduce((s, c) => s + c.allocatedKrw, 0)
                return (
                  <FinanceTable.Row key={code} hover={false}>
                    <FinanceTable.Td size="compact" className="font-mono">
                      {code} — {t(`budgetCode.${code}`)}
                    </FinanceTable.Td>
                    <FinanceTable.Td size="compact" align="right">
                      {opsAlloc ? `₩${opsAlloc.toLocaleString('en-US')}` : '-'}
                    </FinanceTable.Td>
                  </FinanceTable.Row>
                )
              })}
            </FinanceTable.Body>
          </FinanceTable>
        </div>
      </div>
    </>
  )
}
