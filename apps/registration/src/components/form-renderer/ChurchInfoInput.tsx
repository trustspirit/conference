import React from 'react'
import { useTranslation } from 'react-i18next'
import { Select, Input } from '../ui'
import { stakeList, getWardsByStake } from '../../services/stakeWardData'

const OTHER_KEY = '__other__'
const NON_MEMBER_KEY = '__non_member__'

interface ChurchInfoValue {
  stake: string
  ward: string
}

interface ChurchInfoInputProps {
  value: ChurchInfoValue
  onChange: (value: ChurchInfoValue) => void
  required?: boolean
}

function ChurchInfoInput({ value, onChange, required }: ChurchInfoInputProps): React.ReactElement {
  const { t } = useTranslation()

  const isNonMember = value.stake === NON_MEMBER_KEY
  const isOther = !isNonMember && (value.stake === OTHER_KEY || (value.stake !== '' && !stakeList.includes(value.stake)))
  const selectValue = isNonMember ? '' : isOther ? OTHER_KEY : value.stake
  const wards = !isOther && !isNonMember && value.stake ? getWardsByStake(value.stake) : []

  const handleNonMemberToggle = (checked: boolean) => {
    if (checked) {
      onChange({ stake: NON_MEMBER_KEY, ward: '' })
    } else {
      onChange({ stake: '', ward: '' })
    }
  }

  const handleStakeSelect = (v: string) => {
    onChange({ stake: v === OTHER_KEY ? OTHER_KEY : v, ward: '' })
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isNonMember}
          onChange={(e) => handleNonMemberToggle(e.target.checked)}
          className="w-4 h-4 rounded accent-primary"
        />
        <span className="text-sm text-gray-700">{t('builder.churchInfoNonMember')}</span>
      </label>

      <div className="flex flex-wrap gap-4">
        {/* 스테이크 */}
        <div className="flex-1 basis-[180px] min-w-0">
          <label className="block text-[12px] text-gray-500 mb-1">{t('builder.participantFields.stake')}</label>
          <Select
            value={selectValue}
            onChange={(e) => handleStakeSelect(e.target.value)}
            required={required && !isNonMember}
            disabled={isNonMember}
          >
            <option value="">{''}</option>
            {stakeList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            <option value={OTHER_KEY}>{t('builder.churchInfoOther')}</option>
          </Select>
          {isOther && (
            <Input
              className="mt-2"
              value={value.stake === OTHER_KEY ? '' : value.stake}
              onChange={(e) => onChange({ stake: e.target.value || OTHER_KEY, ward: '' })}
              placeholder={t('builder.churchInfoStakePlaceholder')}
            />
          )}
        </div>

        {/* 와드 */}
        <div className="flex-1 basis-[180px] min-w-0">
          <label className="block text-[12px] text-gray-500 mb-1">{t('builder.participantFields.ward')}</label>
          {isOther ? (
            <Input
              value={value.ward}
              onChange={(e) => onChange({ ...value, ward: e.target.value })}
              placeholder={t('builder.churchInfoWardPlaceholder')}
              required={required && !isNonMember}
            />
          ) : (
            <Select
              value={value.ward}
              onChange={(e) => onChange({ ...value, ward: e.target.value })}
              disabled={isNonMember || wards.length === 0}
              required={required && !isNonMember}
            >
              <option value="">{''}</option>
              {wards.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </Select>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChurchInfoInput
