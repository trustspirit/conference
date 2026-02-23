import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.form.name')}</label>
        <input name="name" value={form.name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.form.email')}</label>
        <input name="email" type="email" value={form.email} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.form.phone')}</label>
        <input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.form.gender')}</label>
          <select name="gender" value={form.gender} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
            <option value="">{t('register.form.genderSelect')}</option>
            <option value="male">{t('register.form.genderMale')}</option>
            <option value="female">{t('register.form.genderFemale')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.form.age')}</label>
          <input name="age" value={form.age} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.form.stake')}</label>
          <input name="stake" value={form.stake} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.form.ward')}</label>
          <input name="ward" value={form.ward} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" />
        </div>
      </div>
      <button type="submit" disabled={isLoading || !form.name || !form.email} className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
        {isLoading ? t('register.submitting') : submitLabel}
      </button>
    </form>
  )
}

export default RegistrationForm
