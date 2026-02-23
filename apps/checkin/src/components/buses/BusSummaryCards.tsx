import React from 'react'
import { useTranslation } from 'react-i18next'

interface BusSummaryCardsProps {
  totalBuses: number
  totalPassengers: number
  totalRegions: number
  arrivedCount?: number
}

function BusSummaryCards({
  totalBuses,
  totalPassengers,
  totalRegions,
  arrivedCount
}: BusSummaryCardsProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
        <div className="text-white/80 text-sm font-medium">{t('print.totalBuses')}</div>
        <div className="text-3xl font-bold mt-1">{totalBuses}</div>
        {arrivedCount !== undefined && arrivedCount > 0 && (
          <div className="text-white/70 text-xs mt-1">
            ✓ {arrivedCount} {t('bus.arrived')}
          </div>
        )}
      </div>
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
        <div className="text-white/80 text-sm font-medium">{t('print.totalPassengers')}</div>
        <div className="text-3xl font-bold mt-1">{totalPassengers}</div>
      </div>
      <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-4 text-white">
        <div className="text-white/80 text-sm font-medium">{t('print.totalRegions')}</div>
        <div className="text-3xl font-bold mt-1">{totalRegions}</div>
      </div>
    </div>
  )
}

export default BusSummaryCards
