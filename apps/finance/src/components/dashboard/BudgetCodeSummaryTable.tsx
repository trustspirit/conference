import { useTranslation } from 'react-i18next'
import { UNIQUE_BUDGET_CODES } from '../../constants/budgetCodes'
import { formatAmount } from '../../lib/currency'

interface Props {
  byBudgetCode: Record<number, { count: number; amount: number; approvedAmount: number }>
  budgetByCode: Record<number, number>
}

/** 예산 코드별 예산/신청/승인/잔액을 표로 보여준다. 저장된 통계만 사용하므로 원본 신청서가 없어도 동작한다. */
export default function BudgetCodeSummaryTable({ byBudgetCode, budgetByCode }: Props) {
  const { t } = useTranslation()

  const rows = UNIQUE_BUDGET_CODES.map((code) => {
    const d = byBudgetCode[code] ?? { count: 0, amount: 0, approvedAmount: 0 }
    const budget = budgetByCode[code] ?? 0
    return {
      code,
      budget,
      count: d.count,
      requested: d.amount,
      approved: d.approvedAmount,
      remaining: budget - d.approvedAmount,
      rate: budget > 0 ? Math.round((d.approvedAmount / budget) * 100) : null
    }
  }).filter((r) => r.count > 0 || r.budget > 0)

  if (rows.length === 0) return null

  const total = rows.reduce(
    (acc, r) => ({
      budget: acc.budget + r.budget,
      count: acc.count + r.count,
      requested: acc.requested + r.requested,
      approved: acc.approved + r.approved
    }),
    { budget: 0, count: 0, requested: 0, approved: 0 }
  )
  const totalRemaining = total.budget - total.approved
  const totalRate = total.budget > 0 ? Math.round((total.approved / total.budget) * 100) : null

  const num = 'px-3 py-2 text-right font-mono whitespace-nowrap'
  const head = 'px-3 py-2 text-right font-medium whitespace-nowrap'
  const over = (remaining: number, budget: number) =>
    budget > 0 && remaining < 0 ? 'text-red-600 font-semibold' : ''

  return (
    <div className="finance-panel rounded-lg p-4 mb-6 overflow-x-auto">
      <h3 className="text-sm font-semibold text-finance-primary mb-3">
        {t('archive.codeTable.title')}
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-finance-border-soft text-xs text-finance-muted">
            <th className="px-3 py-2 text-left font-medium">{t('archive.codeTable.code')}</th>
            <th className={head}>{t('archive.codeTable.budget')}</th>
            <th className={head}>{t('archive.codeTable.count')}</th>
            <th className={head}>{t('archive.codeTable.requested')}</th>
            <th className={head}>{t('archive.codeTable.approved')}</th>
            <th className={head}>{t('archive.codeTable.remaining')}</th>
            <th className={head}>{t('archive.codeTable.rate')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className="border-b border-finance-border-soft">
              <td className="px-3 py-2">{t(`budgetCode.${r.code}`)}</td>
              <td className={num}>{formatAmount(r.budget, 'KRW')}</td>
              <td className={num}>{r.count}</td>
              <td className={num}>{formatAmount(r.requested, 'KRW')}</td>
              <td className={num}>{formatAmount(r.approved, 'KRW')}</td>
              <td className={`${num} ${over(r.remaining, r.budget)}`}>
                {formatAmount(r.remaining, 'KRW')}
              </td>
              <td className={`${num} ${over(r.remaining, r.budget)}`}>
                {r.rate == null ? '-' : `${r.rate}%`}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="px-3 py-2">{t('archive.codeTable.total')}</td>
            <td className={num}>{formatAmount(total.budget, 'KRW')}</td>
            <td className={num}>{total.count}</td>
            <td className={num}>{formatAmount(total.requested, 'KRW')}</td>
            <td className={num}>{formatAmount(total.approved, 'KRW')}</td>
            <td className={`${num} ${over(totalRemaining, total.budget)}`}>
              {formatAmount(totalRemaining, 'KRW')}
            </td>
            <td className={`${num} ${over(totalRemaining, total.budget)}`}>
              {totalRate == null ? '-' : `${totalRate}%`}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
