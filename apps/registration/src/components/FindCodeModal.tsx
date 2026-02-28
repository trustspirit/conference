import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, TextField, Dialog } from 'trust-ui-react'
import { sendPersonalCodeEmail } from '../services/email'

interface FindCodeModalProps {
  surveyId: string
  onClose: () => void
}

function FindCodeModal({ surveyId, onClose }: FindCodeModalProps): React.ReactElement {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    try {
      await sendPersonalCodeEmail(email, surveyId)
      setSent(true)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'functions/resource-exhausted') {
        setError(t('register.findCode.rateLimited'))
      } else if (code === 'functions/not-found') {
        setError(t('register.findCode.notFound'))
      } else {
        setError(t('register.findCode.error'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onClose={onClose} size="sm">
      <Dialog.Title onClose={onClose}>{t('register.findCode.title')}</Dialog.Title>
      <Dialog.Content>
        <p className="text-sm text-gray-500 mb-5">{t('register.findCode.desc')}</p>

        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-700 mb-1">{t('register.findCode.sent')}</p>
            <p className="text-xs text-gray-400 mb-4">{email}</p>
            <Button variant="ghost" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              fullWidth
              error={!!error}
              errorMessage={error || undefined}
            />
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
              <Button type="submit" className="flex-1" disabled={loading || !email.trim()} loading={loading}>
                {loading ? t('common.loading') : t('register.findCode.submit')}
              </Button>
            </div>
          </form>
        )}
      </Dialog.Content>
    </Dialog>
  )
}

export default FindCodeModal
