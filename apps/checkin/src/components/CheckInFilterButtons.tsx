import React from 'react'
import { useTranslation } from 'react-i18next'

interface CheckInFilterButtonsProps {
  filter: 'all' | 'checked-in' | 'not-checked-in'
  onChange: (filter: 'all' | 'checked-in' | 'not-checked-in') => void
  counts: {
    all: number
    checkedIn: number
    notCheckedIn: number
  }
}

function CheckInFilterButtons({
  filter,
  onChange,
  counts
}: CheckInFilterButtonsProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="flex bg-[#F0F2F5] rounded-lg p-1">
      <button
        onClick={() => onChange('all')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          filter === 'all'
            ? 'bg-white text-[#050505] shadow-sm'
            : 'text-[#65676B] hover:text-[#050505]'
        }`}
      >
        {t('common.all')} ({counts.all})
      </button>
      <button
        onClick={() => onChange('checked-in')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          filter === 'checked-in'
            ? 'bg-white text-[#31A24C] shadow-sm'
            : 'text-[#65676B] hover:text-[#050505]'
        }`}
      >
        {t('participant.checkedIn')} ({counts.checkedIn})
      </button>
      <button
        onClick={() => onChange('not-checked-in')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          filter === 'not-checked-in'
            ? 'bg-white text-[#FA383E] shadow-sm'
            : 'text-[#65676B] hover:text-[#050505]'
        }`}
      >
        {t('participant.notCheckedIn')} ({counts.notCheckedIn})
      </button>
    </div>
  )
}

export default CheckInFilterButtons
