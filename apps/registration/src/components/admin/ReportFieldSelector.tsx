import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSetAtom } from 'jotai'
import { addToastAtom } from '../../stores/toastStore'
import { getChartableFields, getTextFields, getTodayCount, getTextResponses } from '../../utils/statsUtils'
import { buildChartImagesForFields, buildDailyTrendImage } from '../../utils/renderChartToImage'
import { generateSurveyReport } from '../../utils/generateSurveyReport'
import type { Survey, SurveyResponse, SurveyField } from '../../types'

interface ReportFieldSelectorProps {
  survey: Survey
  responses: SurveyResponse[]
  isOpen: boolean
  onClose: () => void
}

function getFieldTypeBadge(field: SurveyField, t: (key: string) => string): string {
  if (field.participantField === 'gender') return t('dashboard.fieldTypeRadio')
  switch (field.type) {
    case 'radio':
    case 'dropdown':
      return t('dashboard.fieldTypeRadio')
    case 'checkbox':
      return t('dashboard.fieldTypeCheckbox')
    case 'linear_scale':
      return t('dashboard.fieldTypeScale')
    case 'church_info':
      return t('dashboard.fieldTypeChurch')
    case 'short_text':
    case 'long_text':
      return t('dashboard.fieldTypeText')
    default:
      return ''
  }
}

function ReportFieldSelector({ survey, responses, isOpen, onClose }: ReportFieldSelectorProps) {
  const { t } = useTranslation()
  const addToast = useSetAtom(addToastAtom)

  const availableFields = useMemo(
    () => [...getChartableFields(survey.fields || []), ...getTextFields(survey.fields || [])],
    [survey.fields],
  )

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(availableFields.map((f) => f.id)),
  )
  const [exporting, setExporting] = useState(false)

  const allSelected = selectedIds.size === availableFields.length

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(availableFields.map((f) => f.id)))
    }
  }

  const toggleField = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleExport = () => {
    setExporting(true)

    setTimeout(() => {
      try {
        const chartableAll = getChartableFields(survey.fields || [])
        const textAll = getTextFields(survey.fields || [])

        const chartableSelected = chartableAll.filter((f) => selectedIds.has(f.id))
        const textSelected = textAll.filter((f) => selectedIds.has(f.id))

        const chartImages = buildChartImagesForFields(chartableSelected, responses)
        const dailyTrendImage = buildDailyTrendImage(responses)

        const dates = responses.map((r) => new Date(r.createdAt).getTime())
        const earliest = new Date(Math.min(...dates))
        const today = new Date()
        const dayMs = 24 * 60 * 60 * 1000
        const diffDays = Math.max(Math.floor((today.getTime() - earliest.getTime()) / dayMs) + 1, 1)
        const avgPerDay = (responses.length / diffDays).toFixed(1)

        const textFieldsData = textSelected.map((field) => ({
          fieldId: field.id,
          label: field.label,
          responses: getTextResponses(responses, field.id),
        }))

        generateSurveyReport({
          title: survey.title,
          description: survey.description,
          totalResponses: responses.length,
          todayCount: getTodayCount(responses),
          avgPerDay,
          dailyTrendImage,
          chartImages,
          textFields: textFieldsData,
          generatedAt: new Date(),
        })

        setExporting(false)
        addToast({ message: t('dashboard.exportSuccess'), type: 'success' })
        onClose()
      } catch {
        setExporting(false)
      }
    }, 50)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{t('dashboard.reportTitle')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {/* Always included */}
          <div className="flex items-center gap-3 py-2 mb-2 text-sm text-gray-400">
            <input type="checkbox" checked disabled className="rounded" />
            <span>{t('dashboard.dailyTrendAlwaysIncluded')}</span>
          </div>

          <hr className="mb-2" />

          {/* Select all */}
          <label className="flex items-center gap-3 py-2 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
            <span className="text-sm font-medium text-gray-700">{t('dashboard.selectAll')}</span>
          </label>

          {/* Field list */}
          <div className="max-h-80 overflow-y-auto mt-1">
            {availableFields.map((field) => (
              <label key={field.id} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 rounded px-1">
                <input
                  type="checkbox"
                  checked={selectedIds.has(field.id)}
                  onChange={() => toggleField(field.id)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 flex-1">{field.label}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  {getFieldTypeBadge(field, t)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || selectedIds.size === 0}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {exporting ? t('dashboard.exporting') : t('dashboard.exportPDF')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReportFieldSelector
