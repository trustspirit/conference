import React from 'react'
import { useTranslation } from 'react-i18next'
import type { BusRoute, Participant } from '../../types'
import { formatPhoneNumber } from '../../utils/phoneFormat'

interface BusRegionCardProps {
  bus: BusRoute
  participants: Participant[]
  onNavigate: (busId: string) => void
  onMarkArrival: (bus: BusRoute) => void
  onDelete: (bus: BusRoute) => void
}

function BusRegionCard({
  bus,
  participants,
  onNavigate,
  onMarkArrival,
  onDelete
}: BusRegionCardProps): React.ReactElement {
  const { t } = useTranslation()
  const busParticipants = participants.filter((p) => p.busId === bus.id)
  const isArrived = !!bus.arrivedAt

  return (
    <div
      className={`bg-white rounded-lg border overflow-hidden transition-all cursor-pointer ${
        isArrived
          ? 'border-emerald-200 opacity-70 hover:opacity-100'
          : 'border-[#DADDE1] hover:shadow-md hover:border-[#1877F2]'
      }`}
      onClick={() => onNavigate(bus.id)}
    >
      <div
        className={`px-4 py-3 text-white ${
          isArrived
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
            : 'bg-gradient-to-r from-[#1877F2] to-[#42A5F5]'
        }`}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">{bus.name}</h3>
              {isArrived && (
                <span className="px-2 py-0.5 bg-white/30 rounded text-xs font-semibold">
                  ✓ {t('bus.arrived')}
                </span>
              )}
            </div>
            {bus.departureLocation && (
              <p className="text-sm text-white/80">{bus.departureLocation}</p>
            )}
          </div>
          <span className="px-2 py-1 bg-white/20 rounded text-sm font-medium">
            {bus.participantCount}명
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {bus.estimatedArrivalTime && (
            <div>
              <span className="text-[#65676B]">{t('bus.arrivalTime')}:</span>
              <span className="ml-1 font-medium text-[#050505]">{bus.estimatedArrivalTime}</span>
            </div>
          )}
          {bus.contactName && (
            <div>
              <span className="text-[#65676B]">{t('bus.contact')}:</span>
              <span className="ml-1 font-medium text-[#050505]">{bus.contactName}</span>
            </div>
          )}
          {bus.contactPhone && (
            <div className="col-span-2">
              <span className="text-[#65676B]">{t('common.phone')}:</span>
              <a
                href={`tel:${bus.contactPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="ml-1 font-medium text-[#1877F2] hover:underline"
              >
                {formatPhoneNumber(bus.contactPhone)}
              </a>
            </div>
          )}
        </div>
        {bus.notes && (
          <p className="mt-2 text-sm text-[#65676B] bg-[#F0F2F5] rounded p-2">{bus.notes}</p>
        )}
        {busParticipants.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#DADDE1]">
            <div className="flex flex-wrap gap-1">
              {busParticipants.slice(0, 5).map((p) => (
                <span
                  key={p.id}
                  className="px-2 py-0.5 bg-[#E7F3FF] text-[#1877F2] rounded text-xs font-medium"
                >
                  {p.name}
                </span>
              ))}
              {busParticipants.length > 5 && (
                <span className="px-2 py-0.5 bg-[#F0F2F5] text-[#65676B] rounded text-xs font-medium">
                  +{busParticipants.length - 5}
                </span>
              )}
            </div>
          </div>
        )}
        <div className="mt-3 flex justify-between items-center">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMarkArrival(bus)
            }}
            className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
              isArrived
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            }`}
          >
            {isArrived ? t('bus.cancelArrival') : t('bus.markAsArrived')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(bus)
            }}
            className="text-[#FA383E] hover:underline text-sm font-semibold"
          >
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BusRegionCard
