import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from 'trust-ui-react'
import type { Survey } from '../../types'

interface SurveyCardProps {
  survey: Survey
  onCopyLink: () => void
  onToggleActive: () => void
  onDelete: () => void
}

function SurveyCard({ survey, onCopyLink, onToggleActive, onDelete }: SurveyCardProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between hover:shadow-md transition-shadow">
      <div className="flex-1">
        <Link to={`/admin/survey/${survey.id}`} className="font-semibold text-gray-900 hover:text-primary">
          {survey.title}
        </Link>
        <p className="text-sm text-gray-500 mt-1">
          {survey.isActive ? t('common.active') : t('common.inactive')} · {survey.createdAt.toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link to={`/admin/survey/${survey.id}/edit`}>
          <Button variant="secondary" size="sm">{t('builder.edit')}</Button>
        </Link>
        <Button variant="secondary" size="sm" onClick={onCopyLink}>{t('survey.copyLink')}</Button>
        <Button variant="secondary" size="sm" onClick={onToggleActive}>
          {survey.isActive ? t('survey.deactivate') : t('survey.activate')}
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>{t('common.delete')}</Button>
      </div>
    </div>
  )
}

export default SurveyCard
