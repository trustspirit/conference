import { useTranslation } from 'react-i18next'
import { RequestItem, TransportDetail, TransportType, TripType } from '../types'
import { BUDGET_CODES } from '../constants/budgetCodes'
import { Select, Button, TextField } from 'trust-ui-react'

interface Props {
  index: number
  item: RequestItem
  onChange: (index: number, item: RequestItem) => void
  onRemove: (index: number) => void
  canRemove: boolean
  perKmRate?: number
}

export const TRANSPORT_BUDGET_CODE = 5110
export const DEFAULT_PER_KM_RATE = 150

const emptyTransportDetail = (): TransportDetail => ({
  transportType: 'car',
  tripType: 'round',
  departure: '',
  destination: '',
  distanceKm: undefined,
})

export function calcCarTransportAmount(detail: TransportDetail, perKmRate: number): number {
  if (!detail.distanceKm || detail.transportType !== 'car') return 0
  const multiplier = detail.tripType === 'round' ? 2 : 1
  return detail.distanceKm * perKmRate * multiplier
}

export default function ItemRow({ index, item, onChange, onRemove, canRemove, perKmRate = DEFAULT_PER_KM_RATE }: Props) {
  const { t } = useTranslation()

  const budgetOptions = [
    { value: '', label: t('budgetCode.select') },
    ...BUDGET_CODES.map((bc, i) => ({
      value: String(i),
      label: `${bc.code} - ${t(`budgetCode.items.${bc.descKey}`)}`,
    })),
  ]

  // Find the matching option index for the current budgetCode + description
  const currentIndex = BUDGET_CODES.findIndex((bc) => bc.code === item.budgetCode)
  const currentValue = currentIndex >= 0 ? String(currentIndex) : ''

  const isTransport = item.budgetCode === TRANSPORT_BUDGET_CODE
  const detail = item.transportDetail || emptyTransportDetail()

  const isAmountDisabled = isTransport && detail.transportType === 'car'

  const updateTransportDetail = (patch: Partial<TransportDetail>) => {
    const updated = { ...detail, ...patch }
    // Clear distanceKm when switching to public transport
    if (patch.transportType === 'public') {
      updated.distanceKm = undefined
    }
    const newItem: RequestItem = { ...item, transportDetail: updated }
    // Auto-calculate amount for car
    if (updated.transportType === 'car') {
      newItem.amount = calcCarTransportAmount(updated, perKmRate)
    }
    // Reset amount when switching to public (user enters manually)
    if (patch.transportType === 'public') {
      newItem.amount = 0
    }
    onChange(index, newItem)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-start">
        <span className="text-sm text-gray-400 pt-2 w-6">{index + 1}</span>
        <TextField
          placeholder={t('field.items')}
          value={item.description}
          onChange={(e) => onChange(index, { ...item, description: e.target.value })}
        />
        <div className="w-64 shrink-0">
          <Select
            options={budgetOptions}
            value={currentValue}
            onChange={(v) => {
              const idx = parseInt(v as string)
              const code = isNaN(idx) ? 0 : (BUDGET_CODES[idx]?.code ?? 0)
              const updated: RequestItem = { ...item, budgetCode: code }
              // Auto-add transport detail when selecting transport code
              if (code === TRANSPORT_BUDGET_CODE && !item.transportDetail) {
                updated.transportDetail = emptyTransportDetail()
                updated.amount = 0
              }
              // Clear transport detail when switching away from transport code
              if (code !== TRANSPORT_BUDGET_CODE) {
                updated.transportDetail = undefined
              }
              onChange(index, updated)
            }}
            placeholder={t('budgetCode.select')}
            fullWidth
            searchable
          />
        </div>
        <TextField
          type="number"
          placeholder={t('field.totalAmount')}
          value={item.amount || ''}
          onChange={(e) => onChange(index, { ...item, amount: parseInt(e.target.value) || 0 })}
          disabled={isAmountDisabled}
        />
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)}>
            <span className="text-red-400 hover:text-red-600">&#10005;</span>
          </Button>
        )}
      </div>

      {isTransport && (
        <div className="ml-8 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('field.transportType')} <span className="text-red-500">*</span>
              </label>
              <Select
                options={[
                  { value: 'car', label: t('field.transportCar') },
                  { value: 'public', label: t('field.transportPublic') },
                ]}
                value={detail.transportType}
                onChange={(v) => updateTransportDetail({ transportType: v as TransportType })}
                fullWidth
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('field.tripType')} <span className="text-red-500">*</span>
              </label>
              <Select
                options={[
                  { value: 'round', label: t('field.tripRound') },
                  { value: 'one_way', label: t('field.tripOneWay') },
                ]}
                value={detail.tripType}
                onChange={(v) => updateTransportDetail({ tripType: v as TripType })}
                fullWidth
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={`${t('field.departure')} *`}
              placeholder={t('field.departure')}
              value={detail.departure}
              onChange={(e) => updateTransportDetail({ departure: e.target.value })}
              fullWidth
            />
            <TextField
              label={`${t('field.destination')} *`}
              placeholder={t('field.destination')}
              value={detail.destination}
              onChange={(e) => updateTransportDetail({ destination: e.target.value })}
              fullWidth
            />
          </div>
          {detail.transportType === 'car' && (
            <>
              <div className="flex items-end gap-3">
                <div className="w-1/2 relative">
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs font-medium text-gray-600">
                      {t('field.distanceKm')} <span className="text-red-500">*</span>
                    </label>
                    <span className="group relative">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold cursor-help">?</span>
                      <span className="hidden group-hover:block group-focus-within:block absolute z-10 left-0 top-5 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg">
                        {t('field.distanceKmHint')}
                      </span>
                    </span>
                  </div>
                  <TextField
                    type="number"
                    placeholder="km"
                    value={detail.distanceKm || ''}
                    onChange={(e) => updateTransportDetail({ distanceKm: parseInt(e.target.value) || undefined })}
                    fullWidth
                  />
                </div>
                {detail.distanceKm && (
                  <p className="text-xs text-gray-500 pb-2">
                    = {detail.distanceKm}km × ₩{perKmRate} × {detail.tripType === 'round' ? '2' : '1'} = <span className="font-medium">₩{calcCarTransportAmount(detail, perKmRate).toLocaleString()}</span>
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
