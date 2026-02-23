import React from 'react'
import { useTranslation } from 'react-i18next'

interface SurveyBuilderHeaderProps {
  title: string
  description: string
  onTitleChange: (title: string) => void
  onDescriptionChange: (description: string) => void
}

function SurveyBuilderHeader({ title, description, onTitleChange, onDescriptionChange }: SurveyBuilderHeaderProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-t-4 border-t-primary p-6 space-y-3">
      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder={t('builder.titlePlaceholder')}
        className="w-full text-2xl font-bold text-gray-900 border-0 border-b-2 border-transparent focus:border-primary focus:outline-none pb-1"
      />
      <input
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder={t('builder.descPlaceholder')}
        className="w-full text-gray-600 border-0 border-b border-transparent focus:border-primary focus:outline-none"
      />
    </div>
  )
}

export default SurveyBuilderHeader
