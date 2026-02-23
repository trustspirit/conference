import React from 'react'
import { useTranslation } from 'react-i18next'
import type { RoomGenderType, RoomType } from '../../types'

interface AddRoomFormProps {
  newRoomNumber: string
  onRoomNumberChange: (value: string) => void
  newRoomCapacity: number
  onRoomCapacityChange: (value: number) => void
  newGenderType: RoomGenderType | ''
  onGenderTypeChange: (value: RoomGenderType | '') => void
  newRoomType: RoomType | ''
  onRoomTypeChange: (value: RoomType | '') => void
  onSubmit: () => void
  onCancel: () => void
}

function AddRoomForm({
  newRoomNumber,
  onRoomNumberChange,
  newRoomCapacity,
  onRoomCapacityChange,
  newGenderType,
  onGenderTypeChange,
  newRoomType,
  onRoomTypeChange,
  onSubmit,
  onCancel
}: AddRoomFormProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="bg-white rounded-lg border border-[#DADDE1] p-4 mb-6">
      <h3 className="font-semibold text-[#050505] mb-3">{t('room.addNewRoom')}</h3>
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={newRoomNumber}
          onChange={(e) => onRoomNumberChange(e.target.value)}
          placeholder={t('room.roomNumberPlaceholder')}
          autoFocus
          className="flex-1 min-w-[120px] px-3 py-2 border border-[#DADDE1] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        />
        <input
          type="number"
          value={newRoomCapacity}
          onChange={(e) => onRoomCapacityChange(parseInt(e.target.value) || 4)}
          min={1}
          placeholder={t('room.capacity')}
          className="w-20 px-3 py-2 border border-[#DADDE1] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
        />
        <select
          value={newGenderType}
          onChange={(e) => onGenderTypeChange(e.target.value as RoomGenderType | '')}
          className="w-28 px-3 py-2 border border-[#DADDE1] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent bg-white"
        >
          <option value="">{t('room.genderType')}</option>
          <option value="male">{t('room.genderMale')}</option>
          <option value="female">{t('room.genderFemale')}</option>
          <option value="mixed">{t('room.genderMixed')}</option>
        </select>
        <select
          value={newRoomType}
          onChange={(e) => onRoomTypeChange(e.target.value as RoomType | '')}
          className="w-28 px-3 py-2 border border-[#DADDE1] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent bg-white"
        >
          <option value="">{t('room.roomType')}</option>
          <option value="general">{t('room.typeGeneral')}</option>
          <option value="guest">{t('room.typeGuest')}</option>
          <option value="leadership">{t('room.typeLeadership')}</option>
        </select>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-[#65676B] text-sm font-semibold hover:bg-[#F0F2F5] rounded-lg transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={onSubmit}
          disabled={!newRoomNumber.trim()}
          className="px-4 py-2 bg-[#1877F2] text-white rounded-lg text-sm font-semibold hover:bg-[#166FE5] transition-colors disabled:opacity-50"
        >
          {t('common.add')}
        </button>
      </div>
    </div>
  )
}

export type { AddRoomFormProps }
export default AddRoomForm
