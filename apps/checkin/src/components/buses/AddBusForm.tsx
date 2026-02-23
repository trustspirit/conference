import React from 'react'
import { useTranslation } from 'react-i18next'
import { PhoneInput } from '../ui'

interface AddBusFormProps {
  newBusName: string
  onBusNameChange: (value: string) => void
  newRegion: string
  onRegionChange: (value: string) => void
  newDepartureLocation: string
  onDepartureLocationChange: (value: string) => void
  newArrivalTime: string
  onArrivalTimeChange: (value: string) => void
  newContactName: string
  onContactNameChange: (value: string) => void
  newContactPhone: string
  onContactPhoneChange: (value: string) => void
  newNotes: string
  onNotesChange: (value: string) => void
  regions: string[]
  onSubmit: () => void
  onCancel: () => void
}

function AddBusForm({
  newBusName,
  onBusNameChange,
  newRegion,
  onRegionChange,
  newDepartureLocation,
  onDepartureLocationChange,
  newArrivalTime,
  onArrivalTimeChange,
  newContactName,
  onContactNameChange,
  newContactPhone,
  onContactPhoneChange,
  newNotes,
  onNotesChange,
  regions,
  onSubmit,
  onCancel
}: AddBusFormProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="bg-white rounded-lg border border-[#DADDE1] p-6 mb-6">
      <h3 className="text-lg font-bold text-[#050505] mb-4">{t('bus.addNewBus')}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#65676B] mb-1">
            {t('bus.busName')} *
          </label>
          <input
            type="text"
            value={newBusName}
            onChange={(e) => onBusNameChange(e.target.value)}
            placeholder={t('bus.busNamePlaceholder')}
            className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#65676B] mb-1">
            {t('bus.region')} *
          </label>
          <input
            type="text"
            value={newRegion}
            onChange={(e) => onRegionChange(e.target.value)}
            placeholder={t('bus.regionPlaceholder')}
            list="region-suggestions"
            className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
          />
          <datalist id="region-suggestions">
            {regions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#65676B] mb-1">
            {t('bus.departureLocation')}
          </label>
          <input
            type="text"
            value={newDepartureLocation}
            onChange={(e) => onDepartureLocationChange(e.target.value)}
            placeholder={t('bus.departureLocationPlaceholder')}
            className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#65676B] mb-1">
            {t('bus.estimatedArrival')}
          </label>
          <input
            type="time"
            value={newArrivalTime}
            onChange={(e) => onArrivalTimeChange(e.target.value)}
            className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#65676B] mb-1">
            {t('bus.contactName')}
          </label>
          <input
            type="text"
            value={newContactName}
            onChange={(e) => onContactNameChange(e.target.value)}
            placeholder={t('bus.contactNamePlaceholder')}
            className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#65676B] mb-1">
            {t('bus.contactPhone')}
          </label>
          <PhoneInput
            value={newContactPhone}
            onChange={onContactPhoneChange}
            placeholder={t('bus.contactPhonePlaceholder')}
            className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-[#65676B] mb-1">{t('bus.notes')}</label>
          <textarea
            value={newNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder={t('bus.notesPlaceholder')}
            rows={2}
            className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2] resize-none"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-[#DADDE1] text-[#65676B] rounded-lg text-sm font-semibold hover:bg-[#F0F2F5]"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={onSubmit}
          className="px-4 py-2 bg-[#1877F2] text-white rounded-lg text-sm font-semibold hover:bg-[#166FE5]"
        >
          {t('bus.addBus')}
        </button>
      </div>
    </div>
  )
}

export default AddBusForm
