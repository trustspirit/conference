import { useTranslation } from 'react-i18next'
import Select from './Select'
import Label from './Label'
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

  const handleStakeChange = (newStake: string) => {
    onStakeChange(newStake)
    onWardChange('')
  }

  if (readOnly) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label>{t('auth.stake', '스테이크/지방부')}</Label>
        <Select
          value={stake}
          onChange={(e) => handleStakeChange(e.target.value)}
          disabled={disabled}
          required
        >
          <option value="">{t('auth.selectStake', '스테이크/지방부 선택')}</option>
          {stakeList.map((s: string) => (
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
          <option value="">{t('auth.selectWard', '와드/지부 선택')}</option>
          {wards.map((w: string) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </Select>
      </div>
    </div>
  )
}
