import React from 'react'
import { useTranslation } from 'react-i18next'
import { Select } from 'trust-ui-react'
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

  const options = [
    { value: '', label: t('builder.noMapping') },
    ...ALL_PARTICIPANT_FIELDS.map((field) => ({
      value: field,
      label: t(`builder.participantFields.${field}`),
      disabled: usedFields.includes(field) && field !== value,
    })),
  ]

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{t('builder.participantField')}</label>
      <Select
        options={options}
        value={value || ''}
        onChange={(v) => onChange((v as string) ? (v as ParticipantFieldKey) : undefined)}
        size="sm"
      />
    </div>
  )
}

export default ParticipantFieldPicker
