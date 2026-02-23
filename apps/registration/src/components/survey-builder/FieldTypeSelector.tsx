import React from 'react'
import { useTranslation } from 'react-i18next'
import Select from '../ui/Select'
import type { FieldType } from '../../types'

interface FieldTypeSelectorProps {
  value: FieldType
  onChange: (type: FieldType) => void
}

const FIELD_TYPES: FieldType[] = [
  'short_text',
  'long_text',
  'radio',
  'checkbox',
  'dropdown',
  'linear_scale',
  'grid',
  'date',
  'time',
  'section',
]

function FieldTypeSelector({ value, onChange }: FieldTypeSelectorProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as FieldType)}
      className="text-sm"
    >
      {FIELD_TYPES.map((type) => (
        <option key={type} value={type}>
          {t(`builder.fieldType.${type}`)}
        </option>
      ))}
    </Select>
  )
}

export default FieldTypeSelector
