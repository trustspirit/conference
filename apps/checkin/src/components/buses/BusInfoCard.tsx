import React from 'react'
import { useTranslation } from 'react-i18next'
import type { BusRoute, Participant } from '../../types'
import { PhoneInput } from '../ui'
import { formatPhoneNumber } from '../../utils/phoneFormat'
import PrintableBusManifest from '../PrintableBusManifest'

interface BusEditForm {
  name: string
  region: string
  departureLocation: string
  estimatedArrivalTime: string
  contactName: string
  contactPhone: string
  notes: string
}

interface BusInfoCardProps {
  bus: BusRoute
  participants: Participant[]
  isEditing: boolean
  isSaving: boolean
  editForm: BusEditForm
  onEditFormChange: (form: BusEditForm) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onToggleArrival: () => void
}

function BusInfoCard({
  bus,
  participants,
  isEditing,
  isSaving,
  editForm,
  onEditFormChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleArrival
}: BusInfoCardProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div
      className={`bg-white rounded-lg border shadow-sm overflow-hidden mb-6 ${
        bus.arrivedAt ? 'border-emerald-200' : 'border-[#DADDE1]'
      }`}
    >
      {/* Header */}
      <div
        className={`px-6 py-4 text-white ${
          bus.arrivedAt
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
            : 'bg-gradient-to-r from-[#1877F2] to-[#42A5F5]'
        }`}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🚌</span>
              <h1 className="text-2xl font-bold">{bus.name}</h1>
              {bus.arrivedAt && (
                <span className="px-3 py-1 bg-white/30 rounded-full text-sm font-semibold">
                  ✓ {t('bus.arrived')}
                </span>
              )}
            </div>
            <p className="text-white/80">
              📍 {bus.region}
              {bus.departureLocation && ` · ${bus.departureLocation}`}
            </p>
            {bus.arrivedAt && (
              <p className="text-white/70 text-sm mt-1">
                {t('bus.arrivedAt')}: {bus.arrivedAt.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleArrival}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                bus.arrivedAt
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {bus.arrivedAt ? t('bus.cancelArrival') : t('bus.markAsArrived')}
            </button>
            <PrintableBusManifest
              buses={[bus]}
              participants={participants}
              selectedBusId={bus.id}
            />
            {!isEditing && (
              <button
                onClick={onStartEdit}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {t('common.edit')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#65676B] mb-1">
                  {t('bus.busName')} *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => onEditFormChange({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#65676B] mb-1">
                  {t('bus.region')} *
                </label>
                <input
                  type="text"
                  value={editForm.region}
                  onChange={(e) => onEditFormChange({ ...editForm, region: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#65676B] mb-1">
                  {t('bus.departureLocation')}
                </label>
                <input
                  type="text"
                  value={editForm.departureLocation}
                  onChange={(e) =>
                    onEditFormChange({ ...editForm, departureLocation: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#65676B] mb-1">
                  {t('bus.estimatedArrival')}
                </label>
                <input
                  type="time"
                  value={editForm.estimatedArrivalTime}
                  onChange={(e) =>
                    onEditFormChange({ ...editForm, estimatedArrivalTime: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#65676B] mb-1">
                  {t('bus.contactName')}
                </label>
                <input
                  type="text"
                  value={editForm.contactName}
                  onChange={(e) => onEditFormChange({ ...editForm, contactName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#65676B] mb-1">
                  {t('bus.contactPhone')}
                </label>
                <PhoneInput
                  value={editForm.contactPhone}
                  onChange={(value) => onEditFormChange({ ...editForm, contactPhone: value })}
                  className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#65676B] mb-1">
                  {t('bus.notes')}
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => onEditFormChange({ ...editForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2] resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={onCancelEdit}
                disabled={isSaving}
                className="px-4 py-2 border border-[#DADDE1] text-[#65676B] rounded-lg text-sm font-semibold hover:bg-[#F0F2F5]"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={onSaveEdit}
                disabled={isSaving}
                className="px-4 py-2 bg-[#1877F2] text-white rounded-lg text-sm font-semibold hover:bg-[#166FE5] disabled:opacity-50"
              >
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#F0F2F5] rounded-lg p-3">
              <div className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold">
                {t('bus.arrivalTime')}
              </div>
              <div className="font-semibold text-[#050505] text-lg">
                {bus.estimatedArrivalTime || '-'}
              </div>
            </div>
            <div className="bg-[#F0F2F5] rounded-lg p-3">
              <div className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold">
                {t('bus.passengers')}
              </div>
              <div className="font-semibold text-[#050505] text-lg">{bus.participantCount}명</div>
            </div>
            <div className="bg-[#F0F2F5] rounded-lg p-3">
              <div className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold">
                {t('bus.contactName')}
              </div>
              <div className="font-semibold text-[#050505]">{bus.contactName || '-'}</div>
            </div>
            <div className="bg-[#F0F2F5] rounded-lg p-3">
              <div className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold">
                {t('bus.contactPhone')}
              </div>
              <div className="font-semibold text-[#1877F2]">
                {bus.contactPhone ? (
                  <a href={`tel:${bus.contactPhone}`} className="hover:underline">
                    {formatPhoneNumber(bus.contactPhone)}
                  </a>
                ) : (
                  '-'
                )}
              </div>
            </div>
            {bus.notes && (
              <div className="col-span-2 md:col-span-4 bg-[#FFF3CD] rounded-lg p-3">
                <div className="text-xs uppercase tracking-wide text-[#856404] mb-1 font-semibold">
                  {t('bus.notes')}
                </div>
                <div className="text-[#856404]">{bus.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default BusInfoCard
