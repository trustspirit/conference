import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { Button, Checkbox } from 'trust-ui-react'

export default function ConsentDialog() {
  const { t } = useTranslation()
  const { updateAppUser, logout, setNeedsConsent } = useAuth()
  const [agreed, setAgreed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleAgree = async () => {
    setSaving(true)
    setError('')
    try {
      await updateAppUser({
        consentAgreedAt: new Date().toISOString(),
      })
      setNeedsConsent(false)
    } catch {
      setError(t('errors.generic', '오류가 발생했습니다. 다시 시도해주세요.'))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-5">
        <h2 className="text-lg font-bold text-gray-900">
          {t('consent.title', '개인정보 처리 동의')}
        </h2>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            {t('consent.agreement')}
          </p>
        </div>

        <Checkbox
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          label={t('consent.checkboxLabel', '위 내용을 읽었으며 동의합니다.')}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <Button
            variant="outline"
            fullWidth
            onClick={logout}
          >
            {t('auth.logout', '로그아웃')}
          </Button>
          <Button
            variant="primary"
            fullWidth
            disabled={!agreed || saving}
            onClick={handleAgree}
          >
            {saving ? t('common.saving', '저장 중...') : t('consent.confirm', '동의하고 계속하기')}
          </Button>
        </div>
      </div>
    </div>
  )
}
