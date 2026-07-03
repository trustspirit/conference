import { useTranslation } from 'react-i18next'
import { PaymentRequest } from '../../types'
import Spinner from '../Spinner'
import BudgetWarningBanner from '../BudgetWarningBanner'
import { BudgetUsage } from '../../hooks/useBudgetUsage'
import FinanceTable from '../table/FinanceTable'
import { formatTotals } from '../../lib/currency'

interface Props {
  requests: PaymentRequest[]
  selected: Set<string>
  loading: boolean
  budgetUsage: BudgetUsage | null
  selectedSummary: { count: number; payeeCount: number; amount: string } | null
  onRowClick: (id: string, index: number, e: React.MouseEvent) => void
  onToggleAll: () => void
  onStartReview: () => void
}

export default function SettlementSelectTable({
  requests,
  selected,
  loading,
  budgetUsage,
  selectedSummary,
  onRowClick,
  onToggleAll,
  onStartReview
}: Props) {
  const { t } = useTranslation()

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-finance-primary">{t('settlement.title')}</h2>
          <p className="text-sm text-finance-muted mt-1">{t('settlement.description')}</p>
        </div>
        <button
          onClick={onStartReview}
          disabled={selected.size === 0}
          className="finance-primary-button w-full px-4 py-2 rounded text-sm font-semibold disabled:bg-gray-400 sm:w-auto"
        >
          {t('settlement.startReview', { count: selected.size })}
        </button>
      </div>

      <BudgetWarningBanner budgetUsage={budgetUsage} className="mb-4" />

      {selectedSummary && (
        <div className="bg-finance-primary-surface border border-finance-border rounded-lg p-4 mb-4 text-sm">
          {t('settlement.selectedSummary', selectedSummary)}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : requests.length === 0 ? (
        <p className="text-finance-muted">{t('settlement.noApproved')}</p>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="sm:hidden">
            <label className="finance-panel mb-3 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-finance-text-secondary">
              <input
                type="checkbox"
                checked={requests.length > 0 && selected.size === requests.length}
                onChange={onToggleAll}
                className="finance-checkbox"
              />
              {t('settlement.selectAll')}
            </label>
            <div className="space-y-3">
              {requests.map((req, index) => {
                const isSelected = selected.has(req.id)
                return (
                  <button
                    key={req.id}
                    type="button"
                    onClick={(e) => onRowClick(req.id, index, e)}
                    aria-pressed={isSelected}
                    className={`finance-panel block w-full rounded-lg p-4 text-left transition-colors ${
                      isSelected ? 'ring-2 ring-finance-primary bg-finance-primary-surface' : ''
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-medium text-finance-primary">
                        <span
                          aria-hidden="true"
                          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                            isSelected
                              ? 'border-finance-primary bg-finance-primary text-white'
                              : 'border-finance-border bg-white'
                          }`}
                        >
                          {isSelected ? '✓' : ''}
                        </span>
                        {req.date}
                      </span>
                      <span className="text-sm text-finance-muted">
                        {req.committee === 'operations'
                          ? t('committee.operationsShort')
                          : t('committee.preparationShort')}
                      </span>
                    </div>
                    <div className="text-sm font-medium">{req.payee}</div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                      <span className="text-finance-muted">
                        {t('form.itemCount', { count: req.items.length })}
                      </span>
                      <span className="font-medium">
                        {formatTotals(req.totalAmount, req.totalAmountUsd || 0)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Desktop table */}
          <div className="finance-panel hidden rounded-lg overflow-hidden sm:block">
            <FinanceTable variant="plain" minWidthClassName="min-w-[720px]">
              <FinanceTable.Head>
                <tr>
                  <FinanceTable.Th className="w-10">
                    <input
                      type="checkbox"
                      checked={requests.length > 0 && selected.size === requests.length}
                      onChange={onToggleAll}
                      className="finance-checkbox"
                    />
                  </FinanceTable.Th>
                  <FinanceTable.Th>{t('field.date')}</FinanceTable.Th>
                  <FinanceTable.Th>{t('field.payee')}</FinanceTable.Th>
                  <FinanceTable.Th>{t('field.committee')}</FinanceTable.Th>
                  <FinanceTable.Th>{t('field.items')}</FinanceTable.Th>
                  <FinanceTable.Th align="right">{t('field.totalAmount')}</FinanceTable.Th>
                </tr>
              </FinanceTable.Head>
              <FinanceTable.Body>
                {requests.map((req, index) => (
                  <FinanceTable.Row
                    key={req.id}
                    selected={selected.has(req.id)}
                    className="cursor-pointer select-none"
                    onClick={(e) => onRowClick(req.id, index, e)}
                  >
                    <FinanceTable.Td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(req.id)}
                        onChange={(e) =>
                          onRowClick(req.id, index, e as unknown as React.MouseEvent)
                        }
                        className="finance-checkbox"
                      />
                    </FinanceTable.Td>
                    <FinanceTable.Td>{req.date}</FinanceTable.Td>
                    <FinanceTable.Td>{req.payee}</FinanceTable.Td>
                    <FinanceTable.Td>
                      {req.committee === 'operations'
                        ? t('committee.operationsShort')
                        : t('committee.preparationShort')}
                    </FinanceTable.Td>
                    <FinanceTable.Td>
                      {t('form.itemCount', { count: req.items.length })}
                    </FinanceTable.Td>
                    <FinanceTable.Td align="right">
                      {formatTotals(req.totalAmount, req.totalAmountUsd || 0)}
                    </FinanceTable.Td>
                  </FinanceTable.Row>
                ))}
              </FinanceTable.Body>
            </FinanceTable>
            <div className="px-4 py-2 bg-finance-surface border-t border-finance-border text-xs text-finance-muted">
              Shift+Click: {t('settlement.shiftSelectHint')}
            </div>
          </div>
        </>
      )}
    </>
  )
}
