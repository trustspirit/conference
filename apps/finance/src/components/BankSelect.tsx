import { useTranslation } from 'react-i18next'
import { Select } from 'trust-ui-react'
import { BANKS } from '../constants/banks'

interface Props {
  value: string
  onChange: (bankName: string) => void
  label?: string
  required?: boolean
}

export default function BankSelect({ value, onChange, label, required }: Props) {
  const { t } = useTranslation()
  const isKnownBank = !value || BANKS.some((b) => b.name === value)

  const options = [
    { value: '', label: t('field.bankSelect') },
    ...(!isKnownBank ? [{ value, label: `${value} (기존 입력)` }] : []),
    ...BANKS.map((bank) => ({
      value: bank.name,
      label: bank.name
    }))
  ]

  return (
    <Select
      options={options}
      value={value}
      onChange={(v) => onChange(v as string)}
      placeholder={t('field.bankSelect')}
      label={label}
      required={required}
      fullWidth
      searchable
    />
  )
}
