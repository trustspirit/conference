import { useTranslation } from 'react-i18next'
import { RequestItem } from '../types'
import { BUDGET_CODES } from '../constants/budgetCodes'
import { Select, Button, TextField } from 'trust-ui-react'

interface Props {
  index: number
  item: RequestItem
  onChange: (index: number, item: RequestItem) => void
  onRemove: (index: number) => void
  canRemove: boolean
}

export default function ItemRow({ index, item, onChange, onRemove, canRemove }: Props) {
  const { t } = useTranslation()

  const budgetOptions = [
    { value: '', label: t('budgetCode.select') },
    ...BUDGET_CODES.map((bc, i) => ({
      value: String(i),
      label: `${bc.code} - ${t(`budgetCode.items.${bc.descKey}`)}`,
    })),
  ]

  // Find the matching option index for the current budgetCode + description
  const currentIndex = BUDGET_CODES.findIndex((bc) => bc.code === item.budgetCode)
  const currentValue = currentIndex >= 0 ? String(currentIndex) : ''

  return (
    <div className="flex gap-2 items-start">
      <span className="text-sm text-gray-400 pt-2 w-6">{index + 1}</span>
      <TextField
        placeholder={t('field.items')}
        value={item.description}
        onChange={(e) => onChange(index, { ...item, description: e.target.value })}
      />
      <div className="w-64 shrink-0">
        <Select
          options={budgetOptions}
          value={currentValue}
          onChange={(v) => {
            const idx = parseInt(v as string)
            const code = isNaN(idx) ? 0 : (BUDGET_CODES[idx]?.code ?? 0)
            onChange(index, { ...item, budgetCode: code })
          }}
          placeholder={t('budgetCode.select')}
          fullWidth
          searchable
        />
      </div>
      <TextField
        type="number"
        placeholder={t('field.totalAmount')}
        value={item.amount || ''}
        onChange={(e) => onChange(index, { ...item, amount: parseInt(e.target.value) || 0 })}
      />
      {canRemove && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)}>
          <span className="text-red-400 hover:text-red-600">&#10005;</span>
        </Button>
      )}
    </div>
  )
}
