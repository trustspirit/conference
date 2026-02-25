import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import StatCard from './StatCard'
import ReportFieldSelector from './ReportFieldSelector'
import {
  getDailyRegistrationCounts,
  getTodayCount,
  getChartableFields,
  getTextFields,
  getOptionDistribution,
  getCheckboxDistribution,
  getScaleDistribution,
  getStakeDistribution,
  getTextResponses,
} from '../../utils/statsUtils'
import type { Survey, SurveyResponse, SurveyField } from '../../types'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1']

interface SurveyStatsProps {
  survey: Survey
  responses: SurveyResponse[]
}

function SurveyStats({ survey, responses }: SurveyStatsProps): React.ReactElement {
  const { t } = useTranslation()
  const [showReportModal, setShowReportModal] = useState(false)

  const todayCount = useMemo(() => getTodayCount(responses), [responses])

  const avgPerDay = useMemo(() => {
    if (responses.length === 0) return 0
    const dates = responses.map((r) => new Date(r.createdAt).getTime())
    const earliest = new Date(Math.min(...dates))
    earliest.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffMs = today.getTime() - earliest.getTime()
    const diffDays = Math.max(Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1, 1)
    return (responses.length / diffDays).toFixed(1)
  }, [responses])

  const dailyTrend = useMemo(() => getDailyRegistrationCounts(responses, 14), [responses])

  const chartableFields = useMemo(() => getChartableFields(survey.fields || []), [survey.fields])
  const textFields = useMemo(() => getTextFields(survey.fields || []), [survey.fields])

  const lineChartData = {
    labels: dailyTrend.labels,
    datasets: [
      {
        data: dailyTrend.data,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  }

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  } as const

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const } },
  } as const

  const barVerticalOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  } as const

  const barHorizontalOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
  }

  function renderFieldChart(field: SurveyField): React.ReactNode {
    // Gender field — always Pie
    if (field.participantField === 'gender') {
      const options = field.options && field.options.length > 0 ? field.options : ['male', 'female', 'other']
      const dist = getOptionDistribution(responses, field.id, options)
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5" key={field.id}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{field.label}</h3>
          <div className="h-64">
            <Pie
              data={{
                labels: dist.labels,
                datasets: [{ data: dist.data, backgroundColor: COLORS.slice(0, dist.labels.length) }],
              }}
              options={pieOptions}
            />
          </div>
        </div>
      )
    }

    if (field.type === 'radio' || field.type === 'dropdown') {
      const options = field.options || []
      const dist = getOptionDistribution(responses, field.id, options)
      const ChartComponent = options.length <= 6 ? Pie : Doughnut
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5" key={field.id}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{field.label}</h3>
          <div className="h-64">
            <ChartComponent
              data={{
                labels: dist.labels,
                datasets: [{ data: dist.data, backgroundColor: COLORS.slice(0, dist.labels.length) }],
              }}
              options={pieOptions}
            />
          </div>
        </div>
      )
    }

    if (field.type === 'checkbox') {
      const options = field.options || []
      const dist = getCheckboxDistribution(responses, field.id, options)
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5" key={field.id}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{field.label}</h3>
          <div className="h-64">
            <Bar
              data={{
                labels: dist.labels,
                datasets: [{ data: dist.data, backgroundColor: COLORS[0] }],
              }}
              options={barHorizontalOptions}
            />
          </div>
        </div>
      )
    }

    if (field.type === 'linear_scale') {
      const min = field.linearScale?.min ?? 1
      const max = field.linearScale?.max ?? 5
      const dist = getScaleDistribution(responses, field.id, min, max)
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5" key={field.id}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{field.label}</h3>
          <p className="text-xs text-gray-500 mb-2">
            {t('dashboard.average')}: {dist.average.toFixed(2)}
          </p>
          <div className="h-64">
            <Bar
              data={{
                labels: dist.labels,
                datasets: [{ data: dist.data, backgroundColor: COLORS[0] }],
              }}
              options={barVerticalOptions}
            />
          </div>
        </div>
      )
    }

    if (field.type === 'church_info') {
      const dist = getStakeDistribution(responses, field.id)
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5" key={field.id}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{field.label}</h3>
          <div className="h-64">
            <Doughnut
              data={{
                labels: dist.labels,
                datasets: [{ data: dist.data, backgroundColor: COLORS.slice(0, dist.labels.length) }],
              }}
              options={pieOptions}
            />
          </div>
        </div>
      )
    }

    return null
  }

  if ((!survey.fields || survey.fields.length === 0) && responses.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        {t('dashboard.noChartData')}
      </div>
    )
  }

  return (
    <div>
      {/* KPI row */}
      <div className="flex items-start gap-4 mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
          <StatCard label={t('dashboard.totalResponses')} value={responses.length} />
          <StatCard label={t('dashboard.today')} value={todayCount} />
          <StatCard label={t('dashboard.avgPerDay')} value={avgPerDay} />
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {t('dashboard.exportPDF')}
        </button>
      </div>

      {/* Daily trend */}
      {responses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('dashboard.dailyTrend')}</h3>
          <div className="h-64">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>
      )}

      {/* Field-by-field charts */}
      {chartableFields.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {chartableFields.map((field) => renderFieldChart(field))}
        </div>
      )}

      {/* Text response lists */}
      {textFields.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {textFields.map((field) => {
            const texts = getTextResponses(responses, field.id)
            return (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5" key={field.id}>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{field.label}</h3>
                {texts.length > 0 ? (
                  <ul className="max-h-64 overflow-y-auto">
                    {texts.map((text, idx) => (
                      <li key={idx} className="py-2 text-sm text-gray-700 border-b border-gray-100">
                        {text}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">{t('dashboard.noTextResponses')}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ReportFieldSelector
        survey={survey}
        responses={responses}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </div>
  )
}

export default SurveyStats
