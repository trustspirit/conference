import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input } from './ui'
import { getResponseByEmail } from '../services/responses'

interface FindCodeModalProps {
  surveyId: string
  token: string | null
  onClose: () => void
}

function FindCodeModal({ surveyId, token, onClose }: FindCodeModalProps): React.ReactElement {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [foundCode, setFoundCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)
    setFoundCode(null)

    try {
      const response = await getResponseByEmail(surveyId, email)
      if (response) {
        setFoundCode(response.personalCode)
      } else {
        setError(t('register.findCode.notFound'))
      }
    } catch {
      setError(t('register.findCode.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-1">{t('register.findCode.title')}</h2>
        <p className="text-sm text-gray-500 mb-5">{t('register.findCode.desc')}</p>

        {foundCode ? (
          <div className="text-center">
            <div className="bg-primary-light border border-primary/20 rounded-xl p-4 mb-4">
              <p className="text-sm text-primary-text mb-1 font-medium">{t('register.success.personalCode')}</p>
              <p className="text-3xl font-mono font-bold text-gray-900 tracking-wider">{foundCode}</p>
            </div>
            <a
              href={`/register/${surveyId}?token=${token}&code=${foundCode}`}
              className="text-primary hover:underline text-sm font-medium"
            >
              {t('register.success.editLink')}
            </a>
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
              <Button type="submit" className="flex-1" disabled={loading || !email.trim()}>
                {loading ? t('common.loading') : t('register.findCode.submit')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default FindCodeModal
