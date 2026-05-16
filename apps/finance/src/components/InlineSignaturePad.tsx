import { useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'trust-ui-react'
import SignaturePad, { SignaturePadRef } from './SignaturePad'

interface Props {
  onChange: (dataUrl: string) => void
}

export default function InlineSignaturePad({ onChange }: Props) {
  const { t } = useTranslation()
  const padRef = useRef<SignaturePadRef>(null)
  const hasDrawnRef = useRef(false)

  const handleChange = useCallback(
    (dataUrl: string) => {
      if (dataUrl) {
        hasDrawnRef.current = true
      }
      onChange(dataUrl)
    },
    [onChange]
  )

  const handleClear = () => {
    padRef.current?.clear()
    hasDrawnRef.current = false
    onChange('')
  }

  return (
    <div className="mb-6 p-4 border border-finance-border bg-finance-surface rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-finance-text-secondary">
          {t('form.signatureInline')} <span className="text-red-500">*</span>
        </label>
        <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
          {t('common.clear')}
        </Button>
      </div>
      <SignaturePad ref={padRef} onChange={handleChange} />
      <p className="text-xs text-finance-muted mt-1">{t('form.signatureInlineHint')}</p>
    </div>
  )
}
