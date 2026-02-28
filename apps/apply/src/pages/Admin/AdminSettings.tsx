import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast, TextField, Button } from 'trust-ui-react'
import { useEligibility, useUpdateEligibility } from '../../hooks/queries/useSettings'
import PageLoader from '../../components/PageLoader'

export default function AdminSettings() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data, isLoading } = useEligibility()
  const updateEligibility = useUpdateEligibility()

  const [requirements, setRequirements] = useState<string[]>([])
  const [newItem, setNewItem] = useState('')

  useEffect(() => {
    if (data?.requirements) {
      setRequirements(data.requirements)
    }
  }, [data])

  const handleAdd = () => {
    const trimmed = newItem.trim()
    if (!trimmed) return
    setRequirements((prev) => [...prev, trimmed])
    setNewItem('')
  }

  const handleRemove = (index: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    try {
      await updateEligibility.mutateAsync(requirements)
      toast({ variant: 'success', message: t('admin.settings.saved', '설정이 저장되었습니다.') })
    } catch {
      toast({ variant: 'danger', message: t('errors.generic', '오류가 발생했습니다.') })
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {t('admin.settings.title', '설정')}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {t('admin.settings.subtitle', '대회 신청 관련 설정을 관리합니다.')}
      </p>

      {/* Eligibility Requirements */}
      <div style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>
          {t('admin.settings.eligibility.title', '자격 요건 관리')}
        </h2>
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1.25rem' }}>
          {t('admin.settings.eligibility.description', '신청서/추천서 작성 화면에 표시되는 자격 요건입니다.')}
        </p>

        {/* Requirements List */}
        {requirements.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {requirements.map((req, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #f3f4f6',
                }}
              >
                <span style={{ fontSize: '0.875rem', color: '#111827' }}>
                  {i + 1}. {req}
                </span>
                <button
                  onClick={() => handleRemove(i)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    color: '#dc2626',
                    flexShrink: 0,
                    padding: '0.25rem 0.5rem',
                  }}
                >
                  {t('common.delete', '삭제')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginBottom: '1rem' }}>
            {t('admin.settings.eligibility.empty', '등록된 자격 요건이 없습니다.')}
          </p>
        )}

        {/* Add New Item */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <TextField
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={t('admin.settings.eligibility.placeholder', '새 자격 요건을 입력하세요')}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
            fullWidth
          />
          <Button variant="outline" onClick={handleAdd} disabled={!newItem.trim()}>
            {t('common.add', '추가')}
          </Button>
        </div>

        {/* Save */}
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={updateEligibility.isPending}
        >
          {updateEligibility.isPending
            ? t('common.saving', '저장 중...')
            : t('common.save', '저장')}
        </Button>
      </div>
    </div>
  )
}
