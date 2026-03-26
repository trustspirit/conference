import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { validateFiles } from '../lib/utils'

interface ExistingFile {
  url: string
  fileName: string
}

interface Props {
  files: File[]
  onFilesChange: (files: File[]) => void
  label?: string
  required?: boolean
  disabled?: boolean
  existingCount?: number
  existingLabel?: string
  existingFiles?: ExistingFile[]
}

export default function FileUpload({
  files,
  onFilesChange,
  label,
  required = true,
  disabled = false,
  existingCount,
  existingLabel,
  existingFiles
}: Props) {
  const { t } = useTranslation()
  const [errors, setErrors] = useState<string[]>([])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    const { valid, errors: fileErrs } = validateFiles(selected, t)
    setErrors(fileErrs)
    onFilesChange([...files, ...valid])
    e.target.value = ''
  }

  // Generate preview URLs synchronously for render, clean up on files change / unmount
  const previews = useMemo(
    () =>
      files.map((f) => ({
        url: URL.createObjectURL(f),
        isImage: f.type.startsWith('image/')
      })),
    [files]
  )

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url))
    }
  }, [previews])

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label ?? t('field.receipts')} {required && <span className="text-red-500">*</span>}
      </label>
      {existingCount && existingCount > 0 && files.length === 0 && existingLabel && (
        <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
          {existingLabel}
        </div>
      )}
      {existingFiles && existingFiles.length > 0 && files.length === 0 && (
        <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {existingFiles.map((ef, i) => {
            const isImage = /\.(png|jpe?g|gif|webp)$/i.test(ef.fileName) || ef.url.includes('image')
            return (
              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                {isImage ? (
                  <img
                    src={ef.url}
                    alt={ef.fileName}
                    className="w-full h-32 object-contain bg-white"
                  />
                ) : (
                  <div className="w-full h-32 bg-white flex items-center justify-center">
                    <span className="text-xs text-gray-400">PDF</span>
                  </div>
                )}
                <div className="px-2 py-1.5 border-t">
                  <span className="text-xs text-gray-600 truncate block">{ef.fileName}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <input
        type="file"
        multiple
        accept="image/*,.pdf"
        onChange={handleChange}
        disabled={disabled}
        className={`w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium ${disabled ? 'file:bg-gray-100 file:text-gray-400 opacity-50 cursor-not-allowed' : 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'}`}
      />
      <p className="text-xs text-gray-400 mt-1">{disabled ? t('form.receiptNotRequired') : t('form.receiptHint')}</p>
      {errors.length > 0 && (
        <ul className="mt-2 text-sm text-red-600 space-y-1">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}
      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map((f, i) => (
            <div key={i} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              {previews[i].isImage ? (
                <img
                  src={previews[i].url}
                  alt={f.name}
                  className="w-full h-32 object-contain bg-white"
                />
              ) : (
                <div className="w-full h-32 bg-white flex items-center justify-center p-3">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-8 h-8 text-red-500 shrink-0"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 8V3l5 5h-5zm-2 8.5c0 .28-.22.5-.5.5h-2c-.28 0-.5-.22-.5-.5v-4c0-.28.22-.5.5-.5h2c.28 0 .5.22.5.5v4z" />
                    </svg>
                    <span className="text-sm text-gray-700 truncate">{f.name}</span>
                  </div>
                </div>
              )}
              <div className="px-2 py-1.5 border-t flex items-center justify-between gap-1">
                <span className="text-xs text-gray-600 truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => onFilesChange(files.filter((_, j) => j !== i))}
                  className="text-xs text-red-500 hover:text-red-700 shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
