import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { useStatistics, useExportPDF } from '../hooks'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
)

function StatisticsPage(): React.ReactElement {
  const { t } = useTranslation()
  const stats = useStatistics()
  const reportRef = useRef<HTMLDivElement>(null)
  const { isExporting, exportPDF } = useExportPDF(reportRef, {
    filename: 'CheckIn_Statistics'
  })

  // Chart configurations
  const checkInStatusData = {
    labels: [t('participant.checkedIn'), t('participant.notCheckedIn')],
    datasets: [
      {
        data: [stats.checkedIn, stats.notCheckedIn],
        backgroundColor: ['#31A24C', '#E4E6EB'],
        borderColor: ['#31A24C', '#DADDE1'],
        borderWidth: 1
      }
    ]
  }

  const genderDistributionData = {
    labels: [
      t('participant.male'),
      t('participant.female'),
      t('participant.other'),
      t('participant.unknown')
    ],
    datasets: [
      {
        label: t('statistics.registered'),
        data: [stats.male, stats.female, stats.otherGender, stats.unknownGender],
        backgroundColor: ['#1877F2', '#F0284A', '#FFA500', '#DADDE1']
      }
    ]
  }

  const genderCheckInData = {
    labels: [t('participant.male'), t('participant.female')],
    datasets: [
      {
        label: t('statistics.registered'),
        data: [stats.male, stats.female],
        backgroundColor: 'rgba(24, 119, 242, 0.5)',
        borderColor: '#1877F2',
        borderWidth: 1
      },
      {
        label: t('participant.checkedIn'),
        data: [stats.maleCheckedIn, stats.femaleCheckedIn],
        backgroundColor: 'rgba(49, 162, 76, 0.7)',
        borderColor: '#31A24C',
        borderWidth: 1
      }
    ]
  }

  const dailyCheckInData = {
    labels: stats.dailyStats.map((d) => d.date),
    datasets: [
      {
        label: t('statistics.checkIns'),
        data: stats.dailyStats.map((d) => d.checkIns),
        borderColor: '#1877F2',
        backgroundColor: 'rgba(24, 119, 242, 0.1)',
        fill: true,
        tension: 0.3
      },
      {
        label: t('statistics.checkOuts'),
        data: stats.dailyStats.map((d) => d.checkOuts),
        borderColor: '#FA383E',
        backgroundColor: 'rgba(250, 56, 62, 0.1)',
        fill: true,
        tension: 0.3
      }
    ]
  }

  const paymentStatusData = {
    labels: [t('participant.paid'), t('participant.unpaid')],
    datasets: [
      {
        data: [stats.paid, stats.unpaid],
        backgroundColor: ['#31A24C', '#FA383E'],
        borderColor: ['#2B8A3E', '#D32F2F'],
        borderWidth: 1
      }
    ]
  }

  const topGroupsData = {
    labels: stats.topGroups.map((g) => g.name),
    datasets: [
      {
        label: t('nav.participants'),
        data: stats.topGroups.map((g) => g.participantCount),
        backgroundColor: 'rgba(24, 119, 242, 0.7)',
        borderColor: '#1877F2',
        borderWidth: 1
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    }
  }

  const barOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#050505]">{t('statistics.title')}</h1>
          <p className="text-[#65676B] mt-1">{t('statistics.overview')}</p>
        </div>
        <button
          onClick={exportPDF}
          disabled={isExporting}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isExporting
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-[#1877F2] text-white hover:bg-[#166FE5]'
          }`}
        >
          {isExporting ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {t('participant.exporting')}
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {t('participant.exportPDF')}
            </>
          )}
        </button>
      </div>

      <div ref={reportRef}>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-[#DADDE1] p-4">
            <div className="text-sm text-[#65676B] font-medium">
              {t('statistics.totalRegistered')}
            </div>
            <div className="text-3xl font-bold text-[#050505] mt-1">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg border border-[#DADDE1] p-4">
            <div className="text-sm text-[#65676B] font-medium">
              {t('statistics.currentlyCheckedIn')}
            </div>
            <div className="text-3xl font-bold text-[#31A24C] mt-1">{stats.checkedIn}</div>
            <div className="text-xs text-[#65676B] mt-1">
              {stats.checkInRate}% {t('statistics.ofTotal')}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-[#DADDE1] p-4">
            <div className="text-sm text-[#65676B] font-medium">
              {t('statistics.roomOccupancy')}
            </div>
            <div className="text-3xl font-bold text-[#1877F2] mt-1">
              {stats.currentOccupancy}/{stats.totalRoomCapacity}
            </div>
            <div className="text-xs text-[#65676B] mt-1">
              {stats.roomOccupancyRate}% {t('statistics.occupied')}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-[#DADDE1] p-4">
            <div className="text-sm text-[#65676B] font-medium">
              {t('statistics.paymentStatus')}
            </div>
            <div className="text-3xl font-bold text-[#050505] mt-1">
              <span className="text-[#31A24C]">{stats.paid}</span>
              <span className="text-[#65676B] text-lg mx-1">/</span>
              <span className="text-[#FA383E]">{stats.unpaid}</span>
            </div>
            <div className="text-xs text-[#65676B] mt-1">
              {t('participant.paid')} / {t('participant.unpaid')}
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg border border-[#DADDE1] p-4">
            <h3 className="text-sm font-semibold text-[#050505] mb-4">
              {t('statistics.checkInStatus')}
            </h3>
            <div className="h-48">
              <Doughnut data={checkInStatusData} options={chartOptions} />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#DADDE1] p-4">
            <h3 className="text-sm font-semibold text-[#050505] mb-4">
              {t('statistics.genderDistribution')}
            </h3>
            <div className="h-48">
              <Doughnut data={genderDistributionData} options={chartOptions} />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#DADDE1] p-4">
            <h3 className="text-sm font-semibold text-[#050505] mb-4">
              {t('statistics.paymentStatus')}
            </h3>
            <div className="h-48">
              <Doughnut data={paymentStatusData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-lg border border-[#DADDE1] p-4">
            <h3 className="text-sm font-semibold text-[#050505] mb-4">
              {t('statistics.registrationVsCheckIn')}
            </h3>
            <div className="h-64">
              <Bar data={genderCheckInData} options={barOptions} />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#DADDE1] p-4">
            <h3 className="text-sm font-semibold text-[#050505] mb-4">
              {t('statistics.topGroups')}
            </h3>
            <div className="h-64">
              {stats.topGroups.length > 0 ? (
                <Bar data={topGroupsData} options={barOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-[#65676B]">
                  {t('statistics.noGroupData')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daily Check-in/Check-out */}
        <div className="bg-white rounded-lg border border-[#DADDE1] p-4 mb-4">
          <h3 className="text-sm font-semibold text-[#050505] mb-4">
            {t('statistics.dailyCheckInOut')}
          </h3>
          <div className="h-72">
            <Line data={dailyCheckInData} options={barOptions} />
          </div>
        </div>

        {/* Summary Table */}
        <div className="bg-white rounded-lg border border-[#DADDE1] overflow-hidden">
          <div className="px-4 py-3 bg-[#F0F2F5] border-b border-[#DADDE1]">
            <h3 className="text-sm font-semibold text-[#050505]">
              {t('statistics.detailedStatistics')}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F7F8FA] border-b border-[#DADDE1]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#65676B] uppercase">
                    {t('statistics.category')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#65676B] uppercase">
                    {t('statistics.registered')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#65676B] uppercase">
                    {t('participant.checkedIn')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#65676B] uppercase">
                    {t('statistics.rate')}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#DADDE1]">
                  <td className="px-4 py-3 font-medium text-[#050505]">{t('statistics.total')}</td>
                  <td className="px-4 py-3 text-right text-[#050505]">{stats.total}</td>
                  <td className="px-4 py-3 text-right text-[#31A24C] font-semibold">
                    {stats.checkedIn}
                  </td>
                  <td className="px-4 py-3 text-right text-[#65676B]">{stats.checkInRate}%</td>
                </tr>
                <tr className="border-b border-[#DADDE1] bg-[#F7F8FA]">
                  <td className="px-4 py-3 font-medium text-[#050505]">{t('participant.male')}</td>
                  <td className="px-4 py-3 text-right text-[#050505]">{stats.male}</td>
                  <td className="px-4 py-3 text-right text-[#31A24C] font-semibold">
                    {stats.maleCheckedIn}
                  </td>
                  <td className="px-4 py-3 text-right text-[#65676B]">
                    {stats.male > 0 ? ((stats.maleCheckedIn / stats.male) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
                <tr className="border-b border-[#DADDE1]">
                  <td className="px-4 py-3 font-medium text-[#050505]">
                    {t('participant.female')}
                  </td>
                  <td className="px-4 py-3 text-right text-[#050505]">{stats.female}</td>
                  <td className="px-4 py-3 text-right text-[#31A24C] font-semibold">
                    {stats.femaleCheckedIn}
                  </td>
                  <td className="px-4 py-3 text-right text-[#65676B]">
                    {stats.female > 0
                      ? ((stats.femaleCheckedIn / stats.female) * 100).toFixed(1)
                      : '0'}
                    %
                  </td>
                </tr>
                <tr className="border-b border-[#DADDE1] bg-[#F7F8FA]">
                  <td className="px-4 py-3 font-medium text-[#050505]">{t('nav.groups')}</td>
                  <td className="px-4 py-3 text-right text-[#050505]" colSpan={3}>
                    {stats.totalGroups} {t('statistics.groups')}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-[#050505]">{t('nav.rooms')}</td>
                  <td className="px-4 py-3 text-right text-[#050505]" colSpan={3}>
                    {stats.totalRooms} {t('statistics.rooms')} ({stats.currentOccupancy}/
                    {stats.totalRoomCapacity} {t('statistics.occupied')})
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatisticsPage
