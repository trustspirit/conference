import { useTranslation } from 'react-i18next'
import Select from './Select'
import Label from './Label'
import { STAKES, getWardsForStake } from '../../utils/stakeWardData'

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

  const wards = getWardsForStake(stake)

  const handleStakeChange = (newStake: string) => {
    onStakeChange(newStake)
    onWardChange('')
  }

  if (readOnly) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <Label>{t('auth.stake', '스테이크/지방부')}</Label>
          <p style={{ fontSize: '0.875rem', color: '#111827', padding: '0.5rem 0' }}>{stake || '-'}</p>
        </div>
        <div>
          <Label>{t('auth.ward', '와드/지부')}</Label>
          <p style={{ fontSize: '0.875rem', color: '#111827', padding: '0.5rem 0' }}>{ward || '-'}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div>
        <Label>{t('auth.stake', '스테이크/지방부')}</Label>
        <Select
          value={stake}
          onChange={(e) => handleStakeChange(e.target.value)}
          disabled={disabled}
          required
        >
          <option value="">{t('auth.stake', '스테이크/지방부 선택')}</option>
          {STAKES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>{t('auth.ward', '와드/지부')}</Label>
        <Select
          value={ward}
          onChange={(e) => onWardChange(e.target.value)}
          disabled={disabled || !stake}
          required
        >
          <option value="">{t('auth.ward', '와드/지부 선택')}</option>
          {wards.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </Select>
      </div>
    </div>
  )
}
