import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { Committee } from '../types'
import { formatPhone } from '../lib/utils'
import { Dialog, TextField, Button, Checkbox, useToast } from 'trust-ui-react'
import ErrorAlert from './ErrorAlert'
import CommitteeSelect from './CommitteeSelect'

export default function DisplayNameModal() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { appUser, updateAppUser, setNeedsDisplayName } = useAuth()
  const [displayName, setDisplayName] = useState(appUser?.name || '')
  const [phone, setPhone] = useState(appUser?.phone || '')
  const [committee, setCommittee] = useState<Committee | ''>('')
  const [consentAgreed, setConsentAgreed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const validate = (): string[] => {
    const errs: string[] = []
    if (!displayName.trim()) errs.push(t('validation.displayNameRequired'))
    if (!phone.trim()) errs.push(t('validation.phoneRequired'))
    if (!committee) errs.push(t('validation.committeeRequired'))
    if (!consentAgreed) errs.push(t('validation.consentRequired'))
    return errs
  }

  const handleSave = async () => {
    const validationErrors = validate()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors([])
    setSaving(true)
    try {
      await updateAppUser({
        displayName: displayName.trim(),
        phone: phone.trim(),
        defaultCommittee: committee as Committee,
        consentAgreedAt: new Date().toISOString()
      })
      setNeedsDisplayName(false)
    } catch (error) {
      console.error('Failed to save profile:', error)
      toast({ variant: 'danger', message: t('settings.saveFailed') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={() => {}} size="md">
      <Dialog.Title showClose={false}>{t('setup.title')}</Dialog.Title>
      <Dialog.Content>
        <p className="text-sm text-gray-500 mb-4">{t('setup.description')}</p>

        <ErrorAlert errors={errors} />

        <div className="space-y-3">
          <TextField
            label={t('field.displayName')}
            required
            helperText={t('settings.displayNameHint')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoFocus
            fullWidth
          />

          <TextField
            label={t('field.phone')}
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="010-0000-0000"
            fullWidth
          />

          <CommitteeSelect
            value={committee}
            onChange={setCommittee}
            name="init-committee"
            label={t('field.defaultCommittee')}
          />

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="text-sm text-gray-700 leading-relaxed">{t('consent.agreement')}</p>
            <Checkbox
              checked={consentAgreed}
              onChange={(e) => setConsentAgreed(e.target.checked)}
              label={t('consent.checkboxLabel')}
            />
          </div>
        </div>
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="primary" onClick={handleSave} loading={saving} fullWidth>
          {saving ? t('setup.saving') : t('setup.start')}
        </Button>
      </Dialog.Actions>
    </Dialog>
  )
}
