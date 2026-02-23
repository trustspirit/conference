import React from 'react'
import { useTranslation } from 'react-i18next'
import type { SurveyField, SurveyResponse } from '../../types'

interface ResponseTableProps {
  responses: SurveyResponse[]
  fields?: SurveyField[]
}

const getCellValue = (resp: SurveyResponse, fieldId: string): string => {
  const val = resp.data[fieldId]
  if (val === undefined || val === null) return '-'
  if (Array.isArray(val)) return val.join(', ')
  if (typeof val === 'object') {
    return Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('/') : v}`)
      .join('; ')
  }
  return String(val)
}

function ResponseTable({ responses, fields }: ResponseTableProps): React.ReactElement {
  const { t } = useTranslation()

  const useDynamic = fields && fields.length > 0
  const displayFields = useDynamic ? fields.filter((f) => f.type !== 'section') : null

  if (responses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        {t('survey.noResponses')}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{t('survey.table.number')}</th>
              {useDynamic ? (
                displayFields!.map((field) => (
                  <th key={field.id} className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                    {field.label}
                  </th>
                ))
              ) : (
                <>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{t('survey.table.name')}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{t('survey.table.email')}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{t('survey.table.phone')}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{t('survey.table.ward')}</th>
                </>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{t('survey.table.code')}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{t('survey.table.date')}</th>
            </tr>
          </thead>
          <tbody>
            {responses.map((resp, index) => (
              <tr key={resp.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                {useDynamic ? (
                  displayFields!.map((field) => (
                    <td key={field.id} className="px-4 py-3 text-gray-600 text-sm">
                      {getCellValue(resp, field.id)}
                    </td>
                  ))
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-900">{(resp.data as Record<string, unknown>).name as string}</td>
                    <td className="px-4 py-3 text-gray-600">{(resp.data as Record<string, unknown>).email as string}</td>
                    <td className="px-4 py-3 text-gray-600">{((resp.data as Record<string, unknown>).phoneNumber as string) || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{((resp.data as Record<string, unknown>).ward as string) || '-'}</td>
                  </>
                )}
                <td className="px-4 py-3 font-mono text-sm text-gray-500">{resp.personalCode}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{resp.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ResponseTable
