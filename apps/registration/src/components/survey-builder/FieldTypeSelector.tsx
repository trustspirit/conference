import React from 'react'
import { useTranslation } from 'react-i18next'
import { Select } from 'trust-ui-react'
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

  const options = FIELD_TYPES.map((type) => ({
    value: type,
    label: t(`builder.fieldType.${type}`),
  }))

  return (
    <Select
      options={options}
      value={value}
      onChange={(v) => onChange(v as FieldType)}
      size="sm"
    />
  )
}

export default FieldTypeSelector
