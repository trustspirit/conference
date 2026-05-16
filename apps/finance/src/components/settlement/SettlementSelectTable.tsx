import { useTranslation } from 'react-i18next'
import { PaymentRequest } from '../../types'
import Spinner from '../Spinner'
import BudgetWarningBanner from '../BudgetWarningBanner'
import { BudgetUsage } from '../../hooks/useBudgetUsage'
import FinanceTable from '../table/FinanceTable'

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
          <h2 className="text-xl font-bold text-[#002C5F]">{t('settlement.title')}</h2>
          <p className="text-sm text-[#667085] mt-1">{t('settlement.description')}</p>
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
        <div className="bg-[#E8EEF5] border border-[#D8DDE5] rounded-lg p-4 mb-4 text-sm">
          {t('settlement.selectedSummary', selectedSummary)}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : requests.length === 0 ? (
        <p className="text-[#667085]">{t('settlement.noApproved')}</p>
      ) : (
        <div className="finance-panel rounded-lg overflow-hidden">
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
                      onChange={(e) => onRowClick(req.id, index, e as unknown as React.MouseEvent)}
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
                    ₩{req.totalAmount.toLocaleString()}
                  </FinanceTable.Td>
                </FinanceTable.Row>
              ))}
            </FinanceTable.Body>
          </FinanceTable>
          <div className="hidden sm:block px-4 py-2 bg-[#F8FAFC] border-t border-[#D8DDE5] text-xs text-[#667085]">
            Shift+Click: {t('settlement.shiftSelectHint')}
          </div>
        </div>
      )}
    </>
  )
}
