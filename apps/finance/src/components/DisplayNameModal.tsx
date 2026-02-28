import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@conference/firebase'
import { useAuth } from '../contexts/AuthContext'
import { Committee } from '../types'
import { formatPhone, formatBankAccount, fileToBase64, validateBankBookFile } from '../lib/utils'
import { Dialog, TextField, Button, useToast } from 'trust-ui-react'
import BankSelect from './BankSelect'
import ErrorAlert from './ErrorAlert'
import CommitteeSelect from './CommitteeSelect'

export default function DisplayNameModal() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { appUser, updateAppUser, setNeedsDisplayName } = useAuth()
  const [displayName, setDisplayName] = useState(appUser?.name || '')
  const [phone, setPhone] = useState(appUser?.phone || '')
  const [bankName, setBankName] = useState(appUser?.bankName || '')
  const [bankAccount, setBankAccount] = useState(appUser?.bankAccount || '')
  const [committee, setCommittee] = useState<Committee | ''>('')
  const [bankBookFile, setBankBookFile] = useState<File | null>(null)
  const [bankBookError, setBankBookError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // Re-format account number when bank changes
  const bankNameMounted = useRef(false)
  useEffect(() => {
    if (!bankNameMounted.current) { bankNameMounted.current = true; return }
    if (bankName && bankAccount) setBankAccount(formatBankAccount(bankAccount, bankName))
  }, [bankName]) // eslint-disable-line react-hooks/exhaustive-deps

  const validate = (): string[] => {
    const errs: string[] = []
    if (!displayName.trim()) errs.push(t('validation.displayNameRequired'))
    if (!phone.trim()) errs.push(t('validation.phoneRequired'))
    if (!bankName.trim()) errs.push(t('validation.bankRequired'))
    if (!bankAccount.trim()) errs.push(t('validation.bankAccountRequired'))
    if (!committee) errs.push(t('validation.committeeRequired'))
    // bankBook is optional at initial setup - required at request submission
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
      // Upload bank book if selected
      if (bankBookFile) {
        const data = await fileToBase64(bankBookFile)
        const uploadFn = httpsCallable<
          { file: { name: string; data: string } },
          { fileName: string; storagePath: string; url: string }
        >(functions, 'uploadBankBookV2')
        const result = await uploadFn({ file: { name: bankBookFile.name, data } })
        const { storagePath, url } = result.data
        await updateAppUser({
          displayName: displayName.trim(),
          phone: phone.trim(),
          bankName: bankName.trim(),
          bankAccount: bankAccount.trim(),
          defaultCommittee: committee as Committee,
          bankBookImage: '',
          bankBookPath: storagePath,
          bankBookUrl: url,
        })
      } else {
        await updateAppUser({
          displayName: displayName.trim(),
          phone: phone.trim(),
          bankName: bankName.trim(),
          bankAccount: bankAccount.trim(),
          defaultCommittee: committee as Committee,
        })
      }
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
      <Dialog.Title>{t('setup.title')}</Dialog.Title>
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

          <BankSelect value={bankName} onChange={setBankName} label={`${t('field.bank')} *`} />

          <TextField
            label={t('field.bankAccount')}
            required
            value={bankAccount}
            onChange={(e) => setBankAccount(formatBankAccount(e.target.value, bankName))}
            placeholder={t('field.bankAccount')}
            fullWidth
          />

          {/* Bank Book Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('field.bankBook')}</label>
            <input type="file" accept=".png,.jpg,.jpeg,.pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] || null
                if (f) {
                  const err = validateBankBookFile(f)
                  if (err) { setBankBookError(err); setBankBookFile(null); e.target.value = ''; return }
                }
                setBankBookError(null)
                setBankBookFile(f)
              }}
              className="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            {bankBookError && <p className="text-xs text-red-600 mt-1">{bankBookError}</p>}
            {bankBookFile && (
              <p className="text-xs text-green-600 mt-1">{bankBookFile.name} ({(bankBookFile.size / 1024).toFixed(0)}KB)</p>
            )}
            <p className="text-xs text-gray-400 mt-1">{t('settings.bankBookRequiredHint')}</p>
          </div>

          <CommitteeSelect value={committee} onChange={setCommittee}
            name="init-committee" label={t('field.defaultCommittee')} />
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
