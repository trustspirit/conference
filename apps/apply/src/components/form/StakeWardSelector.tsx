import { useTranslation } from 'react-i18next'
import { Select } from 'trust-ui-react'
import { stakeList, getWardsByStake } from '../../utils/stakeWardData'

interface StakeWardSelectorProps {
  stake: string
  ward: string
  onStakeChange: (stake: string) => void
  onWardChange: (ward: string) => void
  disabled?: boolean
  readOnly?: boolean
}

export default function StakeWardSelector({
  stake,
  ward,
  onStakeChange,
  onWardChange,
  disabled = false,
  readOnly = false,
}: StakeWardSelectorProps) {
  const { t } = useTranslation()

  const wards = getWardsByStake(stake)

  const handleStakeChange = (value: string | string[]) => {
    const newStake = value as string
    onStakeChange(newStake)
    onWardChange('')
  }

  if (readOnly) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>{t('auth.stake', '스테이크/지방부')}</p>
          <p style={{ fontSize: '0.875rem', color: '#111827', padding: '0.5rem 0' }}>{stake || '-'}</p>
        </div>
        <div>
          <p style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>{t('auth.ward', '와드/지부')}</p>
          <p style={{ fontSize: '0.875rem', color: '#111827', padding: '0.5rem 0' }}>{ward || '-'}</p>
        </div>
      </div>
    )
  }

  const stakeOptions = stakeList.map((s: string) => ({ value: s, label: s }))
  const wardOptions = wards.map((w: string) => ({ value: w, label: w }))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <p style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>{t('auth.stake', '스테이크/지방부')}</p>
        <Select
          options={stakeOptions}
          value={stake}
          onChange={handleStakeChange}
          placeholder={t('auth.selectStake', '스테이크/지방부 선택')}
          disabled={disabled}
          fullWidth
        />
      </div>
      <div>
        <p style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>{t('auth.ward', '와드/지부')}</p>
        <Select
          options={wardOptions}
          value={ward}
          onChange={(value) => onWardChange(value as string)}
          placeholder={t('auth.selectWard', '와드/지부 선택')}
          disabled={disabled || !stake}
          fullWidth
        />
      </div>
    </div>
  )
}
