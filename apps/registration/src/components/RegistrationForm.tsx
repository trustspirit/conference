import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input, Select, Label } from './ui'
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>{t('register.form.name')}</Label>
        <Input name="name" value={form.name} onChange={handleChange} required />
      </div>
      <div>
        <Label>{t('register.form.email')}</Label>
        <Input name="email" type="email" value={form.email} onChange={handleChange} required />
      </div>
      <div>
        <Label>{t('register.form.phone')}</Label>
        <Input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t('register.form.gender')}</Label>
          <Select name="gender" value={form.gender} onChange={handleChange}>
            <option value="">{t('register.form.genderSelect')}</option>
            <option value="male">{t('register.form.genderMale')}</option>
            <option value="female">{t('register.form.genderFemale')}</option>
          </Select>
        </div>
        <div>
          <Label>{t('register.form.age')}</Label>
          <Input name="age" value={form.age} onChange={handleChange} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t('register.form.stake')}</Label>
          <Input name="stake" value={form.stake} onChange={handleChange} />
        </div>
        <div>
          <Label>{t('register.form.ward')}</Label>
          <Input name="ward" value={form.ward} onChange={handleChange} />
        </div>
      </div>
      <Button type="submit" size="lg" disabled={isLoading || !form.name || !form.email}>
        {isLoading ? t('register.submitting') : submitLabel}
      </Button>
    </form>
  )
}

export default RegistrationForm
