import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { Dialog, Button, Checkbox, useToast } from 'trust-ui-react'

export default function ConsentDialog() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { updateAppUser, logout, setNeedsConsent } = useAuth()
  const [agreed, setAgreed] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleAgree = async () => {
    setSaving(true)
    try {
      await updateAppUser({
        consentAgreedAt: new Date().toISOString()
      })
      setNeedsConsent(false)
    } catch {
      toast({ variant: 'danger', message: t('common.loadError', '오류가 발생했습니다.') })
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={() => {}} size="md">
      <Dialog.Title>{t('consent.title', '개인정보 처리 동의')}</Dialog.Title>
      <Dialog.Content>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-4">
          <p className="text-sm text-gray-700 leading-relaxed">{t('consent.agreement')}</p>
        </div>

        <Checkbox
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          label={t('consent.checkboxLabel', '위 내용을 읽었으며 동의합니다.')}
        />
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="outline" onClick={logout}>
          {t('nav.logout', '로그아웃')}
        </Button>
        <Button variant="primary" disabled={!agreed || saving} onClick={handleAgree}>
          {saving ? t('common.saving', '저장 중...') : t('consent.confirm', '동의하고 계속하기')}
        </Button>
      </Dialog.Actions>
    </Dialog>
  )
}
