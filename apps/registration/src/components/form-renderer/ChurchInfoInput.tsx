import React from 'react'
import { useTranslation } from 'react-i18next'
import { Select, TextField } from 'trust-ui-react'
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

  const handleStakeSelect = (v: string | string[]) => {
    const val = v as string
    onChange({ stake: val === OTHER_KEY ? OTHER_KEY : val, ward: '' })
  }

  const stakeOptions = [
    { value: '', label: '' },
    ...stakeList.map((s) => ({ value: s, label: s })),
    { value: OTHER_KEY, label: t('builder.churchInfoOther') },
  ]

  const wardOptions = [
    { value: '', label: '' },
    ...wards.map((w) => ({ value: w, label: w })),
  ]

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
        {/* Stake */}
        <div className="flex-1 basis-[180px] min-w-0">
          <label className="block text-[12px] text-gray-500 mb-1">{t('builder.participantFields.stake')}</label>
          <Select
            options={stakeOptions}
            value={selectValue}
            onChange={handleStakeSelect}
            disabled={isNonMember}
            fullWidth
          />
          {isOther && (
            <div className="mt-2">
              <TextField
                value={value.stake === OTHER_KEY ? '' : value.stake}
                onChange={(e) => onChange({ stake: e.target.value || OTHER_KEY, ward: '' })}
                placeholder={t('builder.churchInfoStakePlaceholder')}
                fullWidth
              />
            </div>
          )}
        </div>

        {/* Ward */}
        <div className="flex-1 basis-[180px] min-w-0">
          <label className="block text-[12px] text-gray-500 mb-1">{t('builder.participantFields.ward')}</label>
          {isOther ? (
            <TextField
              value={value.ward}
              onChange={(e) => onChange({ ...value, ward: e.target.value })}
              placeholder={t('builder.churchInfoWardPlaceholder')}
              fullWidth
            />
          ) : (
            <Select
              options={wardOptions}
              value={value.ward}
              onChange={(v) => onChange({ ...value, ward: v as string })}
              disabled={isNonMember || wards.length === 0}
              fullWidth
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default ChurchInfoInput
