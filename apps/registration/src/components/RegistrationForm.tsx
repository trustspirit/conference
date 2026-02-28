import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, TextField, Select } from 'trust-ui-react'
import type { RegistrationData } from '../types'

interface RegistrationFormProps {
  initialData?: RegistrationData
  onSubmit: (data: RegistrationData) => Promise<void>
  isLoading: boolean
  submitLabel: string
}

function RegistrationForm({ initialData, onSubmit, isLoading, submitLabel }: RegistrationFormProps): React.ReactElement {
  const { t } = useTranslation()
  const [form, setForm] = useState<RegistrationData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phoneNumber: initialData?.phoneNumber || '',
    gender: initialData?.gender || '',
    age: initialData?.age || '',
    stake: initialData?.stake || '',
    ward: initialData?.ward || ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(form)
  }

  const genderOptions = [
    { value: '', label: t('register.form.genderSelect') },
    { value: 'male', label: t('register.form.genderMale') },
    { value: 'female', label: t('register.form.genderFemale') },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextField
        label={t('register.form.name')}
        name="name"
        value={form.name}
        onChange={handleChange}
        required
        fullWidth
      />
      <TextField
        label={t('register.form.email')}
        name="email"
        type="email"
        value={form.email}
        onChange={handleChange}
        required
        fullWidth
      />
      <TextField
        label={t('register.form.phone')}
        name="phoneNumber"
        value={form.phoneNumber}
        onChange={handleChange}
        fullWidth
      />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.form.gender')}</label>
          <Select
            options={genderOptions}
            value={form.gender}
            onChange={(value) => setForm((prev) => ({ ...prev, gender: value as string }))}
            fullWidth
          />
        </div>
        <div>
          <TextField
            label={t('register.form.age')}
            name="age"
            value={form.age}
            onChange={handleChange}
            fullWidth
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TextField
          label={t('register.form.stake')}
          name="stake"
          value={form.stake}
          onChange={handleChange}
          fullWidth
        />
        <TextField
          label={t('register.form.ward')}
          name="ward"
          value={form.ward}
          onChange={handleChange}
          fullWidth
        />
      </div>
      <Button type="submit" fullWidth disabled={isLoading || !form.name || !form.email} loading={isLoading}>
        {isLoading ? t('register.submitting') : submitLabel}
      </Button>
    </form>
  )
}

export default RegistrationForm
