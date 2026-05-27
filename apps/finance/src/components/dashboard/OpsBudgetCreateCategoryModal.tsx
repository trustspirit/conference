import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  budgetCode: number
  itemCount: number
  defaultColor: string
  onCreate: (name: string, allocatedKrw: number) => void
  onCancel: () => void
}

export default function OpsBudgetCreateCategoryModal({
  budgetCode, itemCount, defaultColor, onCreate, onCancel,
}: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [allocated, setAllocated] = useState(0)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const canSubmit = name.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="opsbudget-create-cat-title"
        className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id="opsbudget-create-cat-title" className="text-sm font-semibold text-finance-primary mb-1">
          {t('dashboard.opsBudget.createCategoryTitle')}
        </h4>
        <p className="text-xs text-finance-muted mb-4">
          {t('dashboard.opsBudget.createCategoryHelp', { code: budgetCode, count: itemCount })}
        </p>

        <div className="space-y-3 mb-4">
          <label className="block">
            <span className="block text-xs text-finance-muted mb-1">{t('dashboard.opsBudget.colName')}</span>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('dashboard.opsBudget.namePlaceholder')}
              className="border border-finance-border rounded px-2 py-1.5 text-sm w-full"
            />
          </label>
          <div>
            <span className="block text-xs text-finance-muted mb-1">{t('dashboard.opsBudget.colBudgetCode')}</span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-finance-bg font-mono text-sm">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: defaultColor }}
              />
              {budgetCode} — {t(`budgetCode.${budgetCode}`)}
            </span>
          </div>
          <label className="block">
            <span className="block text-xs text-finance-muted mb-1">{t('dashboard.opsBudget.colAllocated')}</span>
            <input
              type="number"
              min={0}
              value={allocated || ''}
              onChange={(e) => setAllocated(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0"
              className="border border-finance-border rounded px-2 py-1.5 text-sm w-full text-right"
            />
          </label>
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
            disabled={!canSubmit}
            onClick={() => onCreate(name.trim(), allocated)}
            className="finance-primary-button text-sm px-3 py-1.5 rounded disabled:opacity-50"
          >
            {t('common.next')}
          </button>
        </div>
      </div>
    </div>
  )
}
