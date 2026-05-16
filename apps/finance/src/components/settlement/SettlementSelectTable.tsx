import { useTranslation } from 'react-i18next'
import { PaymentRequest } from '../../types'
import Spinner from '../Spinner'
import BudgetWarningBanner from '../BudgetWarningBanner'
import { BudgetUsage } from '../../hooks/useBudgetUsage'

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
        <div className="finance-panel rounded-lg overflow-hidden overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#D8DDE5]">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={requests.length > 0 && selected.size === requests.length}
                    onChange={onToggleAll}
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-[#667085]">
                  {t('field.date')}
                </th>
                <th className="text-left px-4 py-3 font-medium text-[#667085]">
                  {t('field.payee')}
                </th>
                <th className="text-left px-4 py-3 font-medium text-[#667085]">
                  {t('field.committee')}
                </th>
                <th className="text-left px-4 py-3 font-medium text-[#667085]">
                  {t('field.items')}
                </th>
                <th className="text-right px-4 py-3 font-medium text-[#667085]">
                  {t('field.totalAmount')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF0F4]">
              {requests.map((req, index) => (
                <tr
                  key={req.id}
                  className={`hover:bg-[#F8FAFC] cursor-pointer select-none ${selected.has(req.id) ? 'bg-[#E8EEF5]' : ''}`}
                  onClick={(e) => onRowClick(req.id, index, e)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(req.id)}
                      onChange={(e) => onRowClick(req.id, index, e as unknown as React.MouseEvent)}
                    />
                  </td>
                  <td className="px-4 py-3">{req.date}</td>
                  <td className="px-4 py-3">{req.payee}</td>
                  <td className="px-4 py-3">
                    {req.committee === 'operations'
                      ? t('committee.operationsShort')
                      : t('committee.preparationShort')}
                  </td>
                  <td className="px-4 py-3">{t('form.itemCount', { count: req.items.length })}</td>
                  <td className="px-4 py-3 text-right">₩{req.totalAmount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="hidden sm:block px-4 py-2 bg-[#F8FAFC] border-t border-[#D8DDE5] text-xs text-[#667085]">
            Shift+Click: {t('settlement.shiftSelectHint')}
          </div>
        </div>
      )}
    </>
  )
}
