import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMyApplication, useCreateApplication, useUpdateApplication } from '../../hooks/queries/useApplications'
import { useAuth } from '../../contexts/AuthContext'
import { Input, Select, Textarea, Checkbox, Label } from '../../components/form'
import Spinner from '../../components/Spinner'
import type { Gender } from '../../types'

export default function UserApplication() {
  const { t } = useTranslation()
  const { appUser } = useAuth()
  const { data: existingApp, isLoading } = useMyApplication()
  const createApp = useCreateApplication()
  const updateApp = useUpdateApplication()

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [moreInfo, setMoreInfo] = useState('')
  const [servedMission, setServedMission] = useState(false)

  const isEditing = !!existingApp
  const isLocked = existingApp?.status === 'approved' || existingApp?.status === 'rejected'

  // Populate form when existing application loads
  useEffect(() => {
    if (existingApp) {
      setName(existingApp.name)
      setAge(String(existingApp.age))
      setEmail(existingApp.email)
      setPhone(existingApp.phone)
      setGender(existingApp.gender)
      setMoreInfo(existingApp.moreInfo)
      setServedMission(existingApp.servedMission || false)
    }
  }, [existingApp])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      name,
      age: Number(age),
      email,
      phone,
      stake: appUser?.stake || '',
      ward: appUser?.ward || '',
      gender,
      moreInfo,
      servedMission,
    }

    if (isEditing && existingApp) {
      updateApp.mutate({ id: existingApp.id, ...data })
    } else {
      createApp.mutate(data)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEditing ? t('application.edit', 'Edit Application') : t('application.new', 'New Application')}
      </h1>

      {isLocked && (
        <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
          {t('application.locked', 'This application has been reviewed and cannot be modified.')}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>{t('application.name', 'Name')}</Label>
          <Input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={isLocked} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('application.age', 'Age')}</Label>
            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} disabled={isLocked} required />
          </div>
          <div>
            <Label>{t('application.gender', 'Gender')}</Label>
            <Select value={gender} onChange={(e) => setGender(e.target.value as Gender)} disabled={isLocked}>
              <option value="male">{t('gender.male', 'Male')}</option>
              <option value="female">{t('gender.female', 'Female')}</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>{t('application.email', 'Email')}</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLocked} required />
        </div>
        <div>
          <Label>{t('application.phone', 'Phone')}</Label>
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isLocked} required />
        </div>
        <div>
          <Label>{t('application.moreInfo', 'Additional Info')}</Label>
          <Textarea value={moreInfo} onChange={(e) => setMoreInfo(e.target.value)} disabled={isLocked} rows={4} />
        </div>
        <Checkbox
          id="servedMission"
          checked={servedMission}
          onChange={(e) => setServedMission(e.target.checked)}
          disabled={isLocked}
          label={t('application.servedMission', 'Previously served a mission')}
        />
        {!isLocked && (
          <button
            type="submit"
            disabled={createApp.isPending || updateApp.isPending}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {createApp.isPending || updateApp.isPending ? t('common.saving', 'Saving...') : t('common.submit', 'Submit')}
          </button>
        )}
      </form>
    </div>
  )
}
