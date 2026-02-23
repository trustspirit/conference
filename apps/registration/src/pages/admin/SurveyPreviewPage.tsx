import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getSurveyById } from '../../services/surveys'
import { Button, Spinner } from '../../components/ui'
import ThemeProvider from '../../components/ThemeProvider'
import FormHeader from '../../components/form-renderer/FormHeader'
import DynamicForm from '../../components/form-renderer/DynamicForm'
import type { SurveyField, SurveyTheme } from '../../types'

interface PreviewData {
  title: string
  description: string
  fields: SurveyField[]
  theme?: SurveyTheme
}

function SurveyPreviewPage(): React.ReactElement {
  const { t } = useTranslation()
  const { surveyId } = useParams<{ surveyId: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem(`survey-preview-${surveyId}`)
    if (stored) {
      try {
        setData(JSON.parse(stored))
        setLoading(false)
        return
      } catch {
        // fall through to DB
      }
    }

    const load = async () => {
      if (!surveyId) return
      try {
        const s = await getSurveyById(surveyId)
        if (s) {
          setData({
            title: s.title,
            description: s.description,
            fields: s.fields || [],
            theme: s.theme,
          })
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [surveyId])

  const handleSubmit = async () => {
    // no-op in preview
  }

  if (loading) return <Spinner />

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{t('survey.notFound')}</p>
      </div>
    )
  }

  return (
    <ThemeProvider theme={data.theme}>
      {/* Preview banner */}
      <div className="bg-gray-900 text-white px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <span className="text-sm font-medium">{t('builder.theme.preview')}</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
          onClick={() => navigate(`/admin/survey/${surveyId}/edit`)}
        >
          {t('common.back')}
        </Button>
      </div>

      <div className="min-h-screen bg-gray-100 sm:py-10 sm:px-4">
        <div className="max-w-2xl mx-auto sm:shadow-lg sm:rounded-xl overflow-hidden">
          <FormHeader
            title={data.title || t('builder.untitledSurvey')}
            description={data.description}
            theme={data.theme}
          />
          {data.fields.length > 0 ? (
            <DynamicForm
              fields={data.fields}
              onSubmit={handleSubmit}
              isLoading={false}
              submitLabel={t('register.register')}
            />
          ) : (
            <div className="bg-white border border-gray-200 sm:rounded-b-xl p-8 text-center">
              <p className="text-gray-400 text-sm">{t('builder.addField')}</p>
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  )
}

export default SurveyPreviewPage
