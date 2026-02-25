import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input, Label } from '../ui'
import { uploadHeaderImage } from '../../services/storage'
import type { SurveyTheme } from '../../types'
import { sanitizeCssUrl } from '../../utils/sanitizeUrl'

interface ThemeEditorProps {
  surveyId: string
  theme: SurveyTheme
  onChange: (theme: SurveyTheme) => void
}

const DEFAULT_COLOR = '#2563eb'
const MAX_FILE_SIZE = 1.5 * 1024 * 1024 // 1.5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

function ThemeEditor({ surveyId, theme, onChange }: ThemeEditorProps): React.ReactElement {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...theme, primaryColor: e.target.value })
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null)
    onChange({ ...theme, headerImageUrl: e.target.value })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError(t('builder.theme.invalidFileType'))
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setImageError(t('builder.theme.fileTooLarge'))
      return
    }

    setImageError(null)
    setUploading(true)
    try {
      const url = await uploadHeaderImage(surveyId, file)
      onChange({ ...theme, headerImageUrl: url })
    } catch {
      setImageError(t('builder.saveFailed'))
    } finally {
      setUploading(false)
    }

    // reset input so same file can be re-selected
    e.target.value = ''
  }

  const handleRemoveImage = () => {
    setImageError(null)
    onChange({ ...theme, headerImageUrl: '' })
  }

  const handleReset = () => {
    setImageError(null)
    onChange({ primaryColor: DEFAULT_COLOR, headerImageUrl: '' })
  }

  const hasImage = !!theme.headerImageUrl

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{t('builder.theme.title')}</h3>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          {t('builder.theme.reset')}
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label size="xs">{t('builder.theme.primaryColor')}</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={theme.primaryColor || DEFAULT_COLOR}
              onChange={handleColorChange}
              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
            />
            <Input
              value={theme.primaryColor || DEFAULT_COLOR}
              onChange={(e) => onChange({ ...theme, primaryColor: e.target.value })}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <Label size="xs">{t('builder.theme.headerImage')}</Label>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png"
            onChange={handleFileUpload}
            className="hidden"
          />

          {hasImage ? (
            <div className="space-y-2">
              <div
                className="h-24 bg-cover bg-center rounded-lg border border-gray-200 relative group"
                style={{ backgroundImage: `url(${sanitizeCssUrl(theme.headerImageUrl || '')})` }}
              >
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {t('builder.theme.removeImage')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-20 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" />
                  </svg>
                )}
                <span className="text-xs font-medium">
                  {uploading ? t('common.loading') : t('builder.theme.uploadImage')}
                </span>
              </button>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{t('builder.theme.orEnterUrl')}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <Input
                value={theme.headerImageUrl || ''}
                onChange={handleUrlChange}
                placeholder={t('builder.theme.headerImagePlaceholder')}
              />
            </div>
          )}

          {imageError && (
            <p className="mt-1 text-xs text-red-500">{imageError}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ThemeEditor
