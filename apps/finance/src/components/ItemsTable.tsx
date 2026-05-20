import { useTranslation } from 'react-i18next'
import { RequestItem } from '../types'
import FinanceTable from './table/FinanceTable'
import { formatAmount, formatTotals, getItemCurrency, sumByCurrency } from '../lib/currency'

interface Props {
  items: RequestItem[]
  /** Legacy KRW total (kept for backwards compatibility; USD is derived from items) */
  totalAmount: number
  /** Optional USD total. If omitted, derived from items. */
  totalAmountUsd?: number
}

export default function ItemsTable({ items, totalAmount, totalAmountUsd }: Props) {
  const derived = sumByCurrency(items)
  const usdTotal = totalAmountUsd ?? derived.usd
  const { t } = useTranslation()

  return (
    <FinanceTable variant="embedded" wrapperClassName="mb-6">
      <FinanceTable.Head>
        <tr>
          <FinanceTable.Th size="compact">#</FinanceTable.Th>
          <FinanceTable.Th size="compact">{t('field.comments')}</FinanceTable.Th>
          <FinanceTable.Th size="compact">{t('field.budgetCode')}</FinanceTable.Th>
          <FinanceTable.Th size="compact" align="right">
            {t('field.totalAmount')}
          </FinanceTable.Th>
        </tr>
      </FinanceTable.Head>
      <FinanceTable.Body>
        {items.map((item, i) => (
          <FinanceTable.Row key={i} hover={false}>
            <FinanceTable.Td size="compact" className="align-top">
              {i + 1}
            </FinanceTable.Td>
            <FinanceTable.Td size="compact">
              <div>{item.description}</div>
              {item.transportDetail && (
                <div className="mt-1 text-xs text-finance-primary bg-finance-primary-surface rounded px-2 py-1.5 space-y-0.5">
                  <div>
                    <span className="font-medium">{t('field.transportType')}:</span>{' '}
                    {item.transportDetail.transportType === 'car'
                      ? t('field.transportCar')
                      : t('field.transportPublic')}
                    {' · '}
                    <span className="font-medium">{t('field.tripType')}:</span>{' '}
                    {item.transportDetail.tripType === 'round'
                      ? t('field.tripRound')
                      : t('field.tripOneWay')}
                  </div>
                  <div>
                    {item.transportDetail.departure} → {item.transportDetail.destination}
                    {item.transportDetail.transportType === 'car' &&
                      item.transportDetail.distanceKm && (
                        <span> · {item.transportDetail.distanceKm}km</span>
                      )}
                  </div>
                  {item.transportDetail.routeMapImage?.url && (
                    <div className="mt-1.5">
                      <a
                        href={item.transportDetail.routeMapImage.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={item.transportDetail.routeMapImage.url}
                          alt={`${item.transportDetail.departure} → ${item.transportDetail.destination}`}
                          className="max-w-[200px] max-h-[120px] rounded border border-finance-border object-contain bg-finance-surface"
                        />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </FinanceTable.Td>
            <FinanceTable.Td size="compact" className="align-top">
              {item.budgetCode}
              <span className="ml-1 text-gray-400 text-xs">
                {t(`budgetCode.${item.budgetCode}`)}
              </span>
            </FinanceTable.Td>
            <FinanceTable.Td size="compact" align="right" className="align-top">
              {formatAmount(item.amount, getItemCurrency(item))}
            </FinanceTable.Td>
          </FinanceTable.Row>
        ))}
      </FinanceTable.Body>
      <FinanceTable.Footer className="font-medium">
        <tr>
          <FinanceTable.Td size="compact" colSpan={3} align="right">
            {t('field.totalAmount')}
          </FinanceTable.Td>
          <FinanceTable.Td size="compact" align="right">
            {formatTotals(totalAmount, usdTotal)}
          </FinanceTable.Td>
        </tr>
      </FinanceTable.Footer>
    </FinanceTable>
  )
}
