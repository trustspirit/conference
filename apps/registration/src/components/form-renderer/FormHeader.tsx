import React from 'react'
import type { SurveyTheme } from '../../types'
import { sanitizeCssUrl } from '../../utils/sanitizeUrl'

interface FormHeaderProps {
  title: string
  description?: string
  theme?: SurveyTheme
}

function FormHeader({ title, description, theme }: FormHeaderProps): React.ReactElement {
  const safeImageUrl = sanitizeCssUrl(theme?.headerImageUrl || '')

  if (safeImageUrl) {
    return (
      <div
        className="relative h-48 sm:h-56 bg-cover bg-center sm:rounded-t-xl overflow-hidden"
        style={{ backgroundImage: `url(${safeImageUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-8 pb-6">
          <h1 className="text-2xl font-bold text-white leading-tight">{title}</h1>
          {description && <p className="text-white/80 text-sm mt-1.5 leading-relaxed">{description}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white sm:rounded-t-xl border border-b-0 border-gray-200 overflow-hidden">
      <div className="h-3 bg-primary" />
      <div className="px-8 py-7">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">{title}</h1>
        {description && <p className="text-gray-500 text-[15px] mt-2 leading-relaxed">{description}</p>}
      </div>
    </div>
  )
}

export default FormHeader
