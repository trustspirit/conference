import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  /** Categories the user can deduct from (everyone except the draft). */
  pool: Array<{ id: string; name: string; allocatedKrw: number }>
  /** Required total to deduct (>0). */
  deficit: number
  /** Label describing the source change (e.g. "신규 카테고리 'MC 세팅'에 ₩500,000 배정") */
  sourceLabel: string
  /** Total budget cap for context display */
  totalKrw: number
  /** New sum BEFORE redistribution (used for context) */
  newSumBeforeRedistribute: number
  onApply: (deductions: Record<string, number>) => void
  onCancel: () => void
}

export default function OpsBudgetRedistributeModal({
  pool, deficit, sourceLabel, totalKrw, newSumBeforeRedistribute, onApply, onCancel,
}: Props) {
  const { t } = useTranslation()
  const [deductions, setDeductions] = useState<Record<string, number>>(() =>
    Object.fromEntries(pool.map((p) => [p.id, 0]))
  )

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const sumDeducted = useMemo(
    () => Object.values(deductions).reduce((s, v) => s + (v || 0), 0),
    [deductions]
  )

  const balanced = sumDeducted === deficit
  const overDeducted = sumDeducted > deficit

  // Auto-equal-split convenience
  const handleEqualSplit = () => {
    const eligible = pool.filter((p) => p.allocatedKrw > 0)
    if (eligible.length === 0) return
    const per = Math.floor(deficit / eligible.length)
    const remainder = deficit - per * eligible.length
    const next: Record<string, number> = Object.fromEntries(pool.map((p) => [p.id, 0]))
    eligible.forEach((p, idx) => {
      next[p.id] = Math.min(p.allocatedKrw, per + (idx === 0 ? remainder : 0))
    })
    // Distribute any remainder if first one was capped
    let stillNeeded = deficit - Object.values(next).reduce((s, v) => s + v, 0)
    if (stillNeeded > 0) {
      for (const p of eligible) {
        if (stillNeeded === 0) break
        const room = p.allocatedKrw - next[p.id]
        const add = Math.min(room, stillNeeded)
        next[p.id] += add
        stillNeeded -= add
      }
    }
    setDeductions(next)
  }

  const updateDeduction = (id: string, val: number, cap: number) => {
    const clamped = Math.max(0, Math.min(cap, Math.floor(val) || 0))
    setDeductions((prev) => ({ ...prev, [id]: clamped }))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="opsbudget-redistribute-title"
        className="bg-white rounded-lg shadow-xl p-6 max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id="opsbudget-redistribute-title" className="text-sm font-semibold text-finance-primary mb-1">
          {t('dashboard.opsBudget.redistributeTitle')}
        </h4>
        <p className="text-xs text-finance-muted mb-4">
          {sourceLabel}
        </p>

        <div className="space-y-1 text-xs mb-4 bg-finance-bg p-3 rounded">
          <div className="flex justify-between">
            <span className="text-finance-muted">{t('dashboard.opsBudget.opsTotalBudget')}:</span>
            <span className="font-mono">{'₩'}{totalKrw.toLocaleString('en-US')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-finance-muted">{t('dashboard.opsBudget.newSumBefore')}:</span>
            <span className="font-mono">{'₩'}{newSumBeforeRedistribute.toLocaleString('en-US')}</span>
          </div>
          <div className="flex justify-between font-semibold text-finance-danger">
            <span>{t('dashboard.opsBudget.deficit')}:</span>
            <span className="font-mono">-{'₩'}{deficit.toLocaleString('en-US')}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-finance-muted">
            {t('dashboard.opsBudget.takeFromHelp')}
          </span>
          <button
            type="button"
            onClick={handleEqualSplit}
            className="text-xs text-finance-primary hover:underline"
          >
            {t('dashboard.opsBudget.equalSplit')}
          </button>
        </div>

        <div className="border border-finance-border-soft rounded overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-finance-bg">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold text-finance-muted">{t('dashboard.opsBudget.colName')}</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-finance-muted">{t('dashboard.opsBudget.currentAlloc')}</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-finance-muted">{t('dashboard.opsBudget.takeFrom')}</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-finance-muted">{t('dashboard.opsBudget.afterChange')}</th>
              </tr>
            </thead>
            <tbody>
              {pool.map((p) => {
                const ded = deductions[p.id] ?? 0
                const after = p.allocatedKrw - ded
                return (
                  <tr key={p.id} className="border-t border-finance-border-soft">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-right font-mono">{'₩'}{p.allocatedKrw.toLocaleString('en-US')}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        max={p.allocatedKrw}
                        value={ded || ''}
                        onChange={(e) => updateDeduction(p.id, Number(e.target.value), p.allocatedKrw)}
                        aria-label={`${p.name} ${t('dashboard.opsBudget.takeFrom')}`}
                        className="border border-finance-border rounded px-2 py-1 text-sm w-28 text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{'₩'}{after.toLocaleString('en-US')}</td>
                  </tr>
                )
              })}
              {pool.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-finance-muted text-xs">
                    {t('dashboard.opsBudget.noCategoriesToRedistribute')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mb-4">
          <span className="text-xs text-finance-muted">{t('dashboard.opsBudget.sumDeducted')}:</span>
          <span className={`font-mono text-sm font-semibold ${
            balanced ? 'text-finance-accent' : overDeducted ? 'text-finance-danger' : 'text-finance-warning'
          }`}>
            {'₩'}{sumDeducted.toLocaleString('en-US')} / {'₩'}{deficit.toLocaleString('en-US')}
            {balanced && ' ✓'}
          </span>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-finance-muted px-3 py-1.5 rounded hover:bg-finance-border-soft"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={!balanced || pool.length === 0}
            onClick={() => onApply(deductions)}
            className="finance-primary-button text-sm px-3 py-1.5 rounded disabled:opacity-50"
          >
            {t('common.apply')}
          </button>
        </div>
      </div>
    </div>
  )
}
