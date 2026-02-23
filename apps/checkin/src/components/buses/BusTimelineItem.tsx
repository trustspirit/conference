import React from 'react'
import { useTranslation } from 'react-i18next'
import type { BusRoute, Participant } from '../../types'
import { formatPhoneNumber } from '../../utils/phoneFormat'

interface BusTimelineItemProps {
  bus: BusRoute
  participants: Participant[]
  onNavigate: (busId: string) => void
  onMarkArrival: (bus: BusRoute) => void
  onDelete: (bus: BusRoute) => void
  formatTime: (timeStr: string | undefined) => string
}

function BusTimelineItem({
  bus,
  participants,
  onNavigate,
  onMarkArrival,
  onDelete,
  formatTime
}: BusTimelineItemProps): React.ReactElement {
  const { t } = useTranslation()
  const busParticipants = participants.filter((p) => p.busId === bus.id)
  const hasTime = !!bus.estimatedArrivalTime
  const isArrived = !!bus.arrivedAt

  return (
    <div
      className={`flex transition-colors cursor-pointer ${
        isArrived ? 'bg-gray-50 hover:bg-gray-100 opacity-70' : 'hover:bg-[#F7F8FA]'
      }`}
      onClick={() => onNavigate(bus.id)}
    >
      {/* Time Column */}
      <div
        className={`w-28 flex-shrink-0 p-4 flex flex-col items-center justify-center border-r border-[#DADDE1] ${
          isArrived ? 'bg-emerald-50' : 'bg-[#F7F8FA]'
        }`}
      >
        {isArrived ? (
          <>
            <div className="text-2xl">✓</div>
            <div className="text-xs text-emerald-600 font-semibold mt-0.5">{t('bus.arrived')}</div>
          </>
        ) : hasTime ? (
          <>
            <div className="text-2xl font-bold text-[#1877F2]">{bus.estimatedArrivalTime}</div>
            <div className="text-xs text-[#65676B] mt-0.5">
              {formatTime(bus.estimatedArrivalTime)}
            </div>
          </>
        ) : (
          <div className="text-sm text-[#65676B]">{t('bus.noTime')}</div>
        )}
      </div>

      {/* Bus Info */}
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className={`font-bold text-lg ${isArrived ? 'text-gray-500' : 'text-[#050505]'}`}>
                {bus.name}
              </h3>
              <span className="px-2.5 py-1 bg-[#E7F3FF] text-[#1877F2] rounded-full text-xs font-semibold">
                {bus.region}
              </span>
              <span className="px-2.5 py-1 bg-[#F0F2F5] text-[#65676B] rounded-full text-xs font-semibold">
                {bus.participantCount}명
              </span>
              {isArrived && (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                  ✓ {t('bus.arrived')}
                </span>
              )}
            </div>
            {bus.departureLocation && (
              <p className="text-sm text-[#65676B] mt-1 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                </svg>
                {bus.departureLocation}
              </p>
            )}

            {/* Contact Info */}
            {(bus.contactName || bus.contactPhone) && (
              <div className="flex items-center gap-4 mt-2 text-sm">
                {bus.contactName && (
                  <span className="text-[#65676B]">
                    <span className="font-medium">{t('bus.contact')}:</span> {bus.contactName}
                  </span>
                )}
                {bus.contactPhone && (
                  <a
                    href={`tel:${bus.contactPhone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[#1877F2] hover:underline font-medium"
                  >
                    {formatPhoneNumber(bus.contactPhone)}
                  </a>
                )}
              </div>
            )}

            {/* Passengers Preview */}
            {busParticipants.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {busParticipants.slice(0, 6).map((p) => (
                  <span
                    key={p.id}
                    className="px-2 py-0.5 bg-[#E7F3FF] text-[#1877F2] rounded text-xs font-medium"
                  >
                    {p.name}
                  </span>
                ))}
                {busParticipants.length > 6 && (
                  <span className="px-2 py-0.5 bg-[#F0F2F5] text-[#65676B] rounded text-xs font-medium">
                    +{busParticipants.length - 6}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMarkArrival(bus)
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                isArrived
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
              title={isArrived ? t('bus.cancelArrival') : t('bus.markAsArrived')}
            >
              {isArrived ? t('bus.cancelArrival') : t('bus.markAsArrived')}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(bus)
              }}
              className="p-2 text-[#FA383E] hover:bg-[#FFEBEE] rounded-lg transition-colors"
              title={t('common.delete')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
            <svg
              className="w-5 h-5 text-[#65676B]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BusTimelineItem
