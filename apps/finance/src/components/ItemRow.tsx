import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { RequestItem, TransportDetail, TransportType, TripType } from '../types'
import { BUDGET_CODES } from '../constants/budgetCodes'
import { Select, Button, TextField } from 'trust-ui-react'
import PlaceSearchInput from './PlaceSearchInput'
import MiniMap from './MiniMap'
import { loadKakaoSDK } from '../lib/kakaoLoader'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@conference/firebase'

interface Props {
  index: number
  item: RequestItem
  onChange: (index: number, item: RequestItem) => void
  onRemove: (index: number) => void
  canRemove: boolean
  perKmRate?: number
  miniMapRef?: (el: HTMLDivElement | null) => void
  onRoutePathChange?: (path: number[] | undefined) => void
}

export const TRANSPORT_BUDGET_CODE = 5110
export const DEFAULT_PER_KM_RATE = 250

const emptyTransportDetail = (): TransportDetail => ({
  transportType: 'car',
  tripType: 'round',
  departure: '',
  destination: ''
})

export function calcCarTransportAmount(detail: TransportDetail, perKmRate: number): number {
  if (!detail.distanceKm || detail.transportType !== 'car') return 0
  const multiplier = detail.tripType === 'round' ? 2 : 1
  return detail.distanceKm * perKmRate * multiplier
}

export default function ItemRow({
  index,
  item,
  onChange,
  onRemove,
  canRemove,
  perKmRate = DEFAULT_PER_KM_RATE,
  miniMapRef,
  onRoutePathChange
}: Props) {
  const { t } = useTranslation()
  const [showDistanceHint, setShowDistanceHint] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [calcFailed, setCalcFailed] = useState(false)
  const [calcError, setCalcError] = useState<string | null>(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const abortRef = useRef(false)
  const [routePath, setRoutePath] = useState<number[]>()

  const budgetOptions = [
    { value: '', label: t('budgetCode.select') },
    ...BUDGET_CODES.map((bc, i) => ({
      value: String(i),
      label: `${bc.code} - ${t(`budgetCode.items.${bc.descKey}`)}`
    }))
  ]

  const currentIndex = item.budgetDescKey
    ? BUDGET_CODES.findIndex(
        (bc) => bc.code === item.budgetCode && bc.descKey === item.budgetDescKey
      )
    : BUDGET_CODES.findIndex((bc) => bc.code === item.budgetCode)
  const currentValue = currentIndex >= 0 ? String(currentIndex) : ''

  const matchedBudget = currentIndex >= 0 ? BUDGET_CODES[currentIndex] : undefined
  const isTransport =
    item.budgetCode === TRANSPORT_BUDGET_CODE && matchedBudget?.category === 'Transportation'
  const detail = item.transportDetail || emptyTransportDetail()

  const isAmountDisabled = isTransport && detail.transportType === 'car'

  const updateTransportDetail = (patch: Partial<TransportDetail>) => {
    const updated = { ...detail, ...patch }
    if (patch.transportType === 'public') {
      delete updated.distanceKm
      delete updated.departureCoord
      delete updated.destinationCoord
    }
    // Strip undefined values — Firestore rejects them
    for (const key of Object.keys(updated)) {
      if ((updated as Record<string, unknown>)[key] === undefined) {
        delete (updated as Record<string, unknown>)[key]
      }
    }
    const newItem: RequestItem = { ...item, transportDetail: updated }
    if (updated.transportType === 'car') {
      newItem.amount = calcCarTransportAmount(updated, perKmRate)
    }
    if (patch.transportType === 'public') {
      newItem.amount = 0
    }
    onChange(index, newItem)
  }

  // Load Kakao SDK when car transport is selected
  useEffect(() => {
    if (isTransport && detail.transportType === 'car') {
      loadKakaoSDK()
        .then(() => setSdkLoaded(true))
        .catch(() => {})
    }
  }, [isTransport, detail.transportType])

  // Auto-calculate distance when both coords exist
  useEffect(() => {
    const depCoord = detail.departureCoord
    const destCoord = detail.destinationCoord
    if (!depCoord || !destCoord || detail.transportType !== 'car') return

    abortRef.current = false
    setIsCalculating(true)
    setCalcFailed(false)
    setCalcError(null)
    setRoutePath(undefined)
    onRoutePathChange?.(undefined)

    const calcDistance = httpsCallable<
      { origin: { lat: number; lng: number }; destination: { lat: number; lng: number } },
      { distanceMeters: number; routePath: number[] }
    >(functions, 'calculateDistance')

    calcDistance({
      origin: { lat: depCoord.lat, lng: depCoord.lng },
      destination: { lat: destCoord.lat, lng: destCoord.lng }
    })
      .then((result) => {
        if (abortRef.current) return
        const km = Math.round(result.data.distanceMeters / 1000)
        updateTransportDetail({ distanceKm: km })
        setRoutePath(result.data.routePath)
        onRoutePathChange?.(result.data.routePath)
      })
      .catch((err) => {
        if (abortRef.current) return
        const msg = err instanceof Error ? err.message : String(err)
        console.error('Distance calculation failed:', err)
        setCalcFailed(true)
        setCalcError(msg)
      })
      .finally(() => {
        if (!abortRef.current) setIsCalculating(false)
      })

    return () => {
      abortRef.current = true
    }
  }, [
    detail.departureCoord?.lat,
    detail.departureCoord?.lng,
    detail.destinationCoord?.lat,
    detail.destinationCoord?.lng,
    detail.transportType
  ])

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-start">
        <span className="text-sm text-gray-400 pt-2 w-6 shrink-0">{index + 1}</span>
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:flex-wrap gap-2">
          <div className="flex-1 min-w-[120px]">
            <TextField
              placeholder={t('field.items')}
              value={item.description}
              onChange={(e) => onChange(index, { ...item, description: e.target.value })}
              fullWidth
            />
          </div>
          <div className="sm:w-64 sm:shrink-0">
            <Select
              options={budgetOptions}
              value={currentValue}
              onChange={(v) => {
                const idx = parseInt(v as string)
                const bc = isNaN(idx) ? undefined : BUDGET_CODES[idx]
                const code = bc?.code ?? 0
                const updated: RequestItem = {
                  ...item,
                  budgetCode: code,
                  budgetDescKey: bc?.descKey
                }
                const isTransportItem =
                  code === TRANSPORT_BUDGET_CODE && bc?.category === 'Transportation'
                if (isTransportItem && !item.transportDetail) {
                  updated.transportDetail = emptyTransportDetail()
                  updated.amount = 0
                }
                if (!isTransportItem) {
                  delete updated.transportDetail
                }
                onChange(index, updated)
              }}
              placeholder={t('budgetCode.select')}
              fullWidth
              searchable
            />
          </div>
          <div className="sm:w-32 sm:shrink-0">
            <TextField
              type="number"
              placeholder={isAmountDisabled ? t('field.carAmountAutoCalc') : t('field.totalAmount')}
              value={item.amount || ''}
              onChange={(e) => onChange(index, { ...item, amount: parseInt(e.target.value) || 0 })}
              disabled={isAmountDisabled}
              fullWidth
            />
          </div>
        </div>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)}>
            <span className="text-red-400 hover:text-red-600">&#10005;</span>
          </Button>
        )}
      </div>

      {isTransport && (
        <div className="ml-0 sm:ml-8 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('field.transportType')} <span className="text-red-500">*</span>
              </label>
              <Select
                options={[
                  { value: 'car', label: t('field.transportCar') },
                  { value: 'public', label: t('field.transportPublic') }
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
                  { value: 'one_way', label: t('field.tripOneWay') }
                ]}
                value={detail.tripType}
                onChange={(v) => updateTransportDetail({ tripType: v as TripType })}
                fullWidth
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {detail.transportType === 'car' && sdkLoaded ? (
              <>
                <PlaceSearchInput
                  label={`${t('field.departure')} *`}
                  value={detail.departure}
                  coord={detail.departureCoord}
                  onChange={(text, coord) =>
                    updateTransportDetail({
                      departure: text,
                      departureCoord: coord,
                      ...(coord ? {} : { distanceKm: undefined })
                    })
                  }
                  placeholder={t('field.placeSearchPlaceholder')}
                />
                <PlaceSearchInput
                  label={`${t('field.destination')} *`}
                  value={detail.destination}
                  coord={detail.destinationCoord}
                  onChange={(text, coord) =>
                    updateTransportDetail({
                      destination: text,
                      destinationCoord: coord,
                      ...(coord ? {} : { distanceKm: undefined })
                    })
                  }
                  placeholder={t('field.placeSearchPlaceholder')}
                />
              </>
            ) : (
              <>
                <TextField
                  label={t('field.departure')}
                  required
                  placeholder={t('field.departure')}
                  value={detail.departure}
                  onChange={(e) => updateTransportDetail({ departure: e.target.value })}
                  fullWidth
                />
                <TextField
                  label={t('field.destination')}
                  required
                  placeholder={t('field.destination')}
                  value={detail.destination}
                  onChange={(e) => updateTransportDetail({ destination: e.target.value })}
                  fullWidth
                />
              </>
            )}
          </div>
          {detail.transportType === 'car' &&
            sdkLoaded &&
            (detail.departureCoord || detail.destinationCoord) && (
              <MiniMap
                departure={detail.departureCoord}
                destination={detail.destinationCoord}
                routePath={routePath}
                ref={miniMapRef}
              />
            )}
          {detail.transportType === 'car' && (
            <>
              <div className="space-y-2">
                <div className="relative">
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs font-medium text-gray-600">
                      {t('field.distanceKm')} <span className="text-red-500">*</span>
                    </label>
                    <span className="relative">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold cursor-help"
                        onClick={() => setShowDistanceHint((v) => !v)}
                        onMouseEnter={() => setShowDistanceHint(true)}
                        onMouseLeave={() => setShowDistanceHint(false)}
                      >
                        ?
                      </button>
                      {showDistanceHint && (
                        <span className="absolute z-10 left-0 top-5 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg">
                          {t('field.distanceKmHint')}
                        </span>
                      )}
                    </span>
                  </div>
                  <TextField
                    type="number"
                    placeholder={isCalculating ? t('field.calculatingDistance') : 'km'}
                    value={detail.distanceKm || ''}
                    onChange={(e) =>
                      updateTransportDetail({ distanceKm: parseInt(e.target.value) || undefined })
                    }
                    disabled={isCalculating || !!(detail.departureCoord && detail.destinationCoord)}
                    fullWidth
                  />
                </div>
                {calcFailed && (
                  <p className="text-xs text-red-500">{calcError}</p>
                )}
                {detail.distanceKm && (
                  <p className="text-xs text-gray-500">
                    = {detail.distanceKm}km × ₩{perKmRate} ×{' '}
                    {detail.tripType === 'round' ? '2' : '1'} ={' '}
                    <span className="font-medium">
                      ₩{calcCarTransportAmount(detail, perKmRate).toLocaleString()}
                    </span>
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
