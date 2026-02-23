import React from 'react'
import { useTranslation } from 'react-i18next'
import type { BusRoute } from '../../types'

type ViewMode = 'timeline' | 'region'

interface BusFilterBarProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  selectedRegion: string
  onRegionChange: (region: string) => void
  regions: string[]
  buses: BusRoute[]
  showArrivedBuses: boolean
  onShowArrivedBusesChange: (show: boolean) => void
}

function BusFilterBar({
  viewMode,
  onViewModeChange,
  selectedRegion,
  onRegionChange,
  regions,
  buses,
  showArrivedBuses,
  onShowArrivedBusesChange
}: BusFilterBarProps): React.ReactElement {
  const { t } = useTranslation()
  const arrivedCount = buses.filter((b) => b.arrivedAt).length

  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 bg-[#F0F2F5] p-1 rounded-lg">
        <button
          onClick={() => onViewModeChange('timeline')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewMode === 'timeline'
              ? 'bg-white text-[#1877F2] shadow-sm'
              : 'text-[#65676B] hover:text-[#050505]'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t('bus.timelineView')}
          </span>
        </button>
        <button
          onClick={() => onViewModeChange('region')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewMode === 'region'
              ? 'bg-white text-[#1877F2] shadow-sm'
              : 'text-[#65676B] hover:text-[#050505]'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {t('bus.regionView')}
          </span>
        </button>
      </div>

      {/* Region Filter */}
      {regions.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#65676B]">{t('bus.filterByRegion')}:</span>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => onRegionChange('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedRegion === 'all'
                  ? 'bg-[#1877F2] text-white'
                  : 'bg-[#F0F2F5] text-[#65676B] hover:bg-[#E4E6EB]'
              }`}
            >
              {t('common.all')} ({buses.length})
            </button>
            {regions.map((region) => {
              const count = buses.filter((b) => b.region === region).length
              return (
                <button
                  key={region}
                  onClick={() => onRegionChange(region)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedRegion === region
                      ? 'bg-[#1877F2] text-white'
                      : 'bg-[#F0F2F5] text-[#65676B] hover:bg-[#E4E6EB]'
                  }`}
                >
                  {region} ({count})
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Show/Hide Arrived Buses Toggle */}
      {arrivedCount > 0 && (
        <button
          onClick={() => onShowArrivedBusesChange(!showArrivedBuses)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showArrivedBuses
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          <span className="text-base">{showArrivedBuses ? '✓' : '○'}</span>
          {showArrivedBuses ? t('bus.showArrivedBuses') : t('bus.hideArrivedBuses')}
          <span className="bg-white/50 px-1.5 py-0.5 rounded text-xs">{arrivedCount}</span>
        </button>
      )}
    </div>
  )
}

export default BusFilterBar
