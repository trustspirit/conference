import React from 'react'
import { useTranslation } from 'react-i18next'
import Select from '../ui/Select'
import type { ParticipantFieldKey } from '../../types'

interface ParticipantFieldPickerProps {
  value?: ParticipantFieldKey
  onChange: (value: ParticipantFieldKey | undefined) => void
  usedFields: ParticipantFieldKey[]
}

const ALL_PARTICIPANT_FIELDS: ParticipantFieldKey[] = [
  'name', 'email', 'phoneNumber', 'gender', 'age', 'birthDate', 'stake', 'ward', 'isPaid', 'memo'
]

function ParticipantFieldPicker({ value, onChange, usedFields }: ParticipantFieldPickerProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{t('builder.participantField')}</label>
      <Select
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? (e.target.value as ParticipantFieldKey) : undefined)}
        className="text-sm py-1.5"
      >
        <option value="">{t('builder.noMapping')}</option>
        {ALL_PARTICIPANT_FIELDS.map((field) => (
          <option key={field} value={field} disabled={usedFields.includes(field) && field !== value}>
            {t(`builder.participantFields.${field}`)}
          </option>
        ))}
      </Select>
    </div>
  )
}

export default ParticipantFieldPicker
