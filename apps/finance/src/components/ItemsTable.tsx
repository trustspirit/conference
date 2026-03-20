import { useTranslation } from 'react-i18next'
import { RequestItem } from '../types'

interface Props {
  items: RequestItem[]
  totalAmount: number
}

export default function ItemsTable({ items, totalAmount }: Props) {
  const { t } = useTranslation()

  return (
    <div className="overflow-x-auto mb-6">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2">#</th>
            <th className="text-left px-3 py-2">{t('field.comments')}</th>
            <th className="text-left px-3 py-2">{t('field.budgetCode')}</th>
            <th className="text-right px-3 py-2">{t('field.totalAmount')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item, i) => (
            <tr key={i}>
              <td className="px-3 py-2 align-top">{i + 1}</td>
              <td className="px-3 py-2">
                <div>{item.description}</div>
                {item.transportDetail && (
                  <div className="mt-1 text-xs text-gray-500 bg-blue-50 rounded px-2 py-1.5 space-y-0.5">
                    <div>
                      <span className="font-medium">{t('field.transportType')}:</span>{' '}
                      {item.transportDetail.transportType === 'car' ? t('field.transportCar') : t('field.transportPublic')}
                      {' · '}
                      <span className="font-medium">{t('field.tripType')}:</span>{' '}
                      {item.transportDetail.tripType === 'round' ? t('field.tripRound') : t('field.tripOneWay')}
                    </div>
                    <div>
                      {item.transportDetail.departure} → {item.transportDetail.destination}
                      {item.transportDetail.transportType === 'car' && item.transportDetail.distanceKm && (
                        <span> · {item.transportDetail.distanceKm}km</span>
                      )}
                    </div>
                    {item.transportDetail.routeMapImage?.url && (
                      <div className="mt-1.5">
                        <a href={item.transportDetail.routeMapImage.url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={item.transportDetail.routeMapImage.url}
                            alt={`${item.transportDetail.departure} → ${item.transportDetail.destination}`}
                            className="max-w-[200px] max-h-[120px] rounded border border-gray-200 object-contain bg-gray-50"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </td>
              <td className="px-3 py-2 align-top">
                {item.budgetCode}
                <span className="ml-1 text-gray-400 text-xs">{t(`budgetCode.${item.budgetCode}`)}</span>
              </td>
              <td className="px-3 py-2 text-right align-top">₩{item.amount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t font-medium">
          <tr>
            <td colSpan={3} className="px-3 py-2 text-right">{t('field.totalAmount')}</td>
            <td className="px-3 py-2 text-right">₩{totalAmount.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
