import { useTranslation } from 'react-i18next'
import { useMyRecommendations, useCreateRecommendation, useDeleteRecommendation, useUpdateRecommendationStatus } from '../../hooks/queries/useRecommendations'
import { useAuth } from '../../contexts/AuthContext'
import { Input, Select, Textarea, Checkbox, Label } from '../../components/form'
import Spinner from '../../components/Spinner'
import type { Gender, RecommendationStatus } from '../../types'
import { useState } from 'react'

export default function LeaderRecommendations() {
  const { t } = useTranslation()
  const { appUser } = useAuth()
  const { data: recommendations, isLoading } = useMyRecommendations()
  const createRec = useCreateRecommendation()
  const deleteRec = useDeleteRecommendation()
  const updateStatus = useUpdateRecommendationStatus()
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [moreInfo, setMoreInfo] = useState('')
  const [servedMission, setServedMission] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    )
  }

  const resetForm = () => {
    setName('')
    setAge('')
    setEmail('')
    setPhone('')
    setGender('male')
    setMoreInfo('')
    setServedMission(false)
    setShowForm(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createRec.mutateAsync({
      name,
      age: Number(age),
      email,
      phone,
      stake: appUser?.stake || '',
      ward: appUser?.ward || '',
      gender,
      moreInfo,
      servedMission,
    })
    resetForm()
  }

  const handleSubmit = (id: string) => {
    updateStatus.mutate({ id, status: 'submitted' as RecommendationStatus })
  }

  const handleDelete = (id: string) => {
    if (confirm(t('common.confirmDelete', 'Are you sure?'))) {
      deleteRec.mutate(id)
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('leader.recommendations.title', '추천서')}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? t('common.cancel', 'Cancel') : t('leader.newRecommendation', 'New Recommendation')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 rounded-xl bg-white shadow border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('application.name', 'Name')}</Label>
              <Input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>{t('application.age', 'Age')}</Label>
              <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('application.email', 'Email')}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>{t('application.phone', 'Phone')}</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('application.gender', 'Gender')}</Label>
              <Select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                <option value="male">{t('gender.male', 'Male')}</option>
                <option value="female">{t('gender.female', 'Female')}</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Checkbox
                checked={servedMission}
                onChange={(e) => setServedMission(e.target.checked)}
                label={t('application.servedMission', 'Previously served a mission')}
              />
            </div>
          </div>
          <div>
            <Label>{t('application.moreInfo', 'Additional Info')}</Label>
            <Textarea value={moreInfo} onChange={(e) => setMoreInfo(e.target.value)} rows={3} />
          </div>
          <button
            type="submit"
            disabled={createRec.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {createRec.isPending ? t('common.saving', 'Saving...') : t('common.create', 'Create')}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {recommendations?.map((rec) => (
          <div key={rec.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{rec.name}</p>
                <p className="text-sm text-gray-500">
                  {rec.stake} / {rec.ward} · {rec.phone}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{rec.status}</span>
                {rec.status === 'draft' && (
                  <>
                    <button
                      onClick={() => handleSubmit(rec.id)}
                      className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {t('common.submit', 'Submit')}
                    </button>
                    <button
                      onClick={() => handleDelete(rec.id)}
                      className="text-xs px-3 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                    >
                      {t('common.delete', 'Delete')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {!recommendations?.length && <p className="text-gray-500 text-sm">{t('common.noData', 'No data')}</p>}
      </div>
    </div>
  )
}
