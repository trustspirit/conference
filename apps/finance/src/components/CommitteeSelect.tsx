import { useTranslation } from 'react-i18next'
import { Committee } from '../types'

interface Props {
  value: Committee | ''
  onChange: (value: Committee) => void
  name?: string
  label?: string
}

export default function CommitteeSelect({ value, onChange, name = 'committee', label }: Props) {
  const { t } = useTranslation()
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label ?? t('committee.label')} <span className="text-red-500">*</span>
      </label>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={name}
            value="operations"
            checked={value === 'operations'}
            onChange={() => onChange('operations')}
            className="finance-radio"
          />
          <span className="text-sm">{t('committee.operations')}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={name}
            value="preparation"
            checked={value === 'preparation'}
            onChange={() => onChange('preparation')}
            className="finance-radio"
          />
          <span className="text-sm">{t('committee.preparation')}</span>
        </label>
      </div>
    </div>
  )
}
