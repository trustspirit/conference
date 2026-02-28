import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useToast, Button } from 'trust-ui-react'
import { getSurveyById, updateSurvey } from '../../services/surveys'
import Spinner from '../../components/ui/Spinner'
import SurveyBuilder from '../../components/survey-builder/SurveyBuilder'
import ThemeEditor from '../../components/survey-builder/ThemeEditor'
import type { Survey, SurveyField, SurveyTheme } from '../../types'

type Tab = 'questions' | 'theme'

const sanitizeFields = (fields: SurveyField[]): SurveyField[] =>
  fields.map((f) => {
    const cleaned = { ...f }
    if (cleaned.options) {
      cleaned.options = cleaned.options.filter((o) => o.trim() !== '')
    }
    if (cleaned.grid) {
      cleaned.grid = {
        ...cleaned.grid,
        rows: cleaned.grid.rows.filter((r) => r.trim() !== ''),
        columns: cleaned.grid.columns.filter((c) => c.trim() !== ''),
      }
    }
    return cleaned
  })

function SurveyEditPage(): React.ReactElement {
  const { t } = useTranslation()
  const { surveyId } = useParams<{ surveyId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<SurveyField[]>([])
  const [theme, setTheme] = useState<SurveyTheme>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('questions')
  const isDirty = useRef(false)

  useEffect(() => {
    const load = async () => {
      if (!surveyId) return
      try {
        const s = await getSurveyById(surveyId)
        if (s) {
          setSurvey(s)
          setTitle(s.title)
          setDescription(s.description)
          setFields(s.fields || [])
          setTheme(s.theme || {})
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [surveyId])

  const markDirty = useCallback(() => { isDirty.current = true }, [])
  const handleTitleChange = useCallback((v: string) => { setTitle(v); markDirty() }, [markDirty])
  const handleDescChange = useCallback((v: string) => { setDescription(v); markDirty() }, [markDirty])
  const handleFieldsChange = useCallback((v: SurveyField[]) => { setFields(v); markDirty() }, [markDirty])
  const handleThemeChange = useCallback((v: SurveyTheme) => { setTheme(v); markDirty() }, [markDirty])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const handleSave = async () => {
    if (!surveyId) return
    setSaving(true)
    try {
      await updateSurvey(surveyId, { title, description, fields: sanitizeFields(fields), theme })
      isDirty.current = false
      toast({ message: t('builder.saved'), variant: 'success' })
    } catch {
      toast({ message: t('builder.saveFailed'), variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = () => {
    if (!surveyId) return
    sessionStorage.setItem(
      `survey-preview-${surveyId}`,
      JSON.stringify({ title, description, fields, theme })
    )
    window.open(`/admin/survey/${surveyId}/preview`, '_blank')
  }

  if (loading) return <Spinner />

  if (!survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{t('survey.notFound')}</p>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'questions', label: t('builder.tabQuestions') },
    { key: 'theme', label: t('builder.tabTheme') },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="p-0" onClick={() => navigate('/admin')}>
              {t('common.back')}
            </Button>
            <h1 className="text-lg font-bold text-gray-900">{t('builder.editSurvey')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handlePreview}>
              {t('builder.theme.showPreview')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/admin')}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()} loading={saving}>
              {saving ? t('builder.saving') : t('builder.save')}
            </Button>
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex justify-center gap-0 border-t border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? 'text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-6">
        {activeTab === 'questions' && (
          <SurveyBuilder
            title={title}
            description={description}
            fields={fields}
            onTitleChange={handleTitleChange}
            onDescriptionChange={handleDescChange}
            onFieldsChange={handleFieldsChange}
          />
        )}
        {activeTab === 'theme' && (
          <ThemeEditor surveyId={surveyId!} theme={theme} onChange={handleThemeChange} />
        )}
      </main>
    </div>
  )
}

export default SurveyEditPage
