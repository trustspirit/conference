import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import StatCard from './StatCard'
import { getDailyRegistrationCounts, getTodayCount } from '../../utils/statsUtils'
import type { Survey, SurveyResponse } from '../../types'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler)

interface DashboardOverviewProps {
  surveys: Survey[]
  allResponses: SurveyResponse[]
}

function DashboardOverview({ surveys, allResponses }: DashboardOverviewProps): React.ReactElement {
  const { t } = useTranslation()

  const activeSurveys = useMemo(() => surveys.filter((s) => s.isActive).length, [surveys])
  const todayCount = useMemo(() => getTodayCount(allResponses), [allResponses])

  const dailyTrend = useMemo(() => getDailyRegistrationCounts(allResponses, 14), [allResponses])

  const surveyComparison = useMemo(() => {
    const countMap = new Map<string, number>()
    for (const r of allResponses) {
      countMap.set(r.surveyId, (countMap.get(r.surveyId) ?? 0) + 1)
    }

    const labels: string[] = []
    const data: number[] = []
    for (const survey of surveys) {
      labels.push(survey.title)
      data.push(countMap.get(survey.id) ?? 0)
    }

    return { labels, data }
  }, [surveys, allResponses])

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

  const barChartData = {
    labels: surveyComparison.labels,
    datasets: [
      {
        data: surveyComparison.data,
        backgroundColor: '#3B82F6',
      },
    ],
  }

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  } as const

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
  }

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t('dashboard.totalSurveys')} value={surveys.length} />
        <StatCard label={t('dashboard.totalResponses')} value={allResponses.length} />
        <StatCard label={t('dashboard.activeSurveys')} value={activeSurveys} />
        <StatCard label={t('dashboard.today')} value={todayCount} />
      </div>

      {allResponses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('dashboard.dailyTrend')}</h3>
            <div className="h-64">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('dashboard.surveyComparison')}</h3>
            <div className="h-64">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardOverview
