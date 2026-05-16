import { useTranslation } from 'react-i18next'
import { validateBankBookFile } from '../lib/utils'

interface Props {
  file: File | null
  error: string | null
  onFileChange: (file: File | null) => void
  onErrorChange: (error: string | null) => void
}

export default function InlineBankBookUpload({ file, error, onFileChange, onErrorChange }: Props) {
  const { t } = useTranslation()

  return (
    <div className="mb-6 p-4 border border-[#D8DDE5] bg-[#F8FAFC] rounded-lg">
      <label className="block text-sm font-medium text-[#374151] mb-1">
        {t('form.bankBookUploadInline')} <span className="text-red-500">*</span>
      </label>
      <input
        type="file"
        accept=".png,.jpg,.jpeg,.pdf"
        onChange={(e) => {
          const f = e.target.files?.[0] || null
          if (f) {
            const err = validateBankBookFile(f)
            if (err) {
              onErrorChange(err)
              onFileChange(null)
              e.target.value = ''
              return
            }
          }
          onErrorChange(null)
          onFileChange(f)
        }}
        className="w-full text-sm text-[#667085] file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#E8EEF5] file:text-[#002C5F] hover:file:bg-[#DCE6F0]"
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {file && (
        <p className="finance-success-text text-xs mt-1">
          {file.name} ({(file.size / 1024).toFixed(0)}KB)
        </p>
      )}
      <p className="text-xs text-[#667085] mt-1">{t('form.bankBookUploadInlineHint')}</p>
    </div>
  )
}
