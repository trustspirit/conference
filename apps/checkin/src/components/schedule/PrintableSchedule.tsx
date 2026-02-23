import React, { forwardRef } from 'react'
import type { ScheduleEvent } from '../../types'
import { getEventColorStyles } from '../../utils/scheduleColors'
import { formatTime, formatDate, getWeekDates, getEventsForDay, isSameDay } from './scheduleUtils'

interface PrintableScheduleProps {
  schedules: ScheduleEvent[]
  selectedDate: Date
  viewMode: 'week' | 'day'
  title?: string
}

const PrintableSchedule = forwardRef<HTMLDivElement, PrintableScheduleProps>(
  ({ schedules, selectedDate, viewMode, title }, ref) => {
    const dates = viewMode === 'week' ? getWeekDates(selectedDate) : [selectedDate]
    const now = new Date()

    // Get display title
    const getDisplayTitle = () => {
      if (title) return title
      if (viewMode === 'week') {
        const start = dates[0]
        const end = dates[6]
        return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 - ${end.getMonth() + 1}월 ${end.getDate()}일 스케줄`
      }
      return `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 스케줄`
    }

    // Sort events by start time
    const sortedSchedules = [...schedules].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    return (
      <div
        ref={ref}
        className="bg-white p-8 min-w-[800px]"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Header */}
        <div className="border-b-2 border-[#1877F2] pb-4 mb-6">
          <h1 className="text-2xl font-bold text-[#050505]">{getDisplayTitle()}</h1>
          <p className="text-sm text-[#65676B] mt-1">
            출력일시: {now.toLocaleDateString('ko-KR')} {now.toLocaleTimeString('ko-KR')}
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#F0F2F5] rounded-lg p-4">
            <div className="text-sm text-[#65676B]">총 일정</div>
            <div className="text-2xl font-bold text-[#050505]">{schedules.length}개</div>
          </div>
          <div className="bg-[#F0F2F5] rounded-lg p-4">
            <div className="text-sm text-[#65676B]">기간</div>
            <div className="text-lg font-semibold text-[#050505]">
              {viewMode === 'week' ? '주간' : '일간'}
            </div>
          </div>
          <div className="bg-[#F0F2F5] rounded-lg p-4">
            <div className="text-sm text-[#65676B]">날짜</div>
            <div className="text-lg font-semibold text-[#050505]">
              {formatDate(selectedDate, 'short')}
            </div>
          </div>
        </div>

        {/* Schedule by Day */}
        {dates.map((date, dayIndex) => {
          const dayEvents = getEventsForDay(sortedSchedules, date)
          const isToday = isSameDay(date, now)

          if (dayEvents.length === 0 && viewMode === 'week') return null

          return (
            <div key={dayIndex} className="mb-6">
              {/* Day Header */}
              <div
                className={`flex items-center gap-3 mb-3 pb-2 border-b ${
                  isToday ? 'border-[#1877F2]' : 'border-[#DADDE1]'
                }`}
              >
                <div
                  className={`text-lg font-semibold ${
                    isToday ? 'text-[#1877F2]' : 'text-[#050505]'
                  }`}
                >
                  {date.toLocaleDateString('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })}
                </div>
                {isToday && (
                  <span className="px-2 py-0.5 bg-[#1877F2] text-white text-xs rounded-full">
                    오늘
                  </span>
                )}
                <span className="text-sm text-[#65676B]">{dayEvents.length}개 일정</span>
              </div>

              {/* Events List */}
              {dayEvents.length === 0 ? (
                <p className="text-[#65676B] text-sm py-4">일정이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map((event) => {
                    const colors = getEventColorStyles(event.color, event.colorIndex)
                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-4 p-3 rounded-lg border-l-4"
                        style={{
                          backgroundColor: colors.bg,
                          borderColor: colors.border
                        }}
                      >
                        {/* Time */}
                        <div className="w-32 shrink-0">
                          <div className="text-sm font-medium" style={{ color: colors.text }}>
                            {formatTime(new Date(event.startTime))}
                          </div>
                          <div className="text-xs text-[#65676B]">
                            ~ {formatTime(new Date(event.endTime))}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[#050505]">{event.title}</div>
                          {event.location && (
                            <div className="text-sm text-[#65676B] mt-0.5 flex items-center gap-1">
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              {event.location}
                            </div>
                          )}
                          {event.description && (
                            <div className="text-sm text-[#65676B] mt-1">{event.description}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* All Events Table (for week view) */}
        {viewMode === 'week' && schedules.length > 0 && (
          <div className="mt-8 pt-6 border-t border-[#DADDE1]">
            <h2 className="text-lg font-semibold text-[#050505] mb-4">전체 일정 목록</h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F0F2F5]">
                  <th className="text-left p-2 text-sm font-medium text-[#050505] border border-[#DADDE1]">
                    날짜
                  </th>
                  <th className="text-left p-2 text-sm font-medium text-[#050505] border border-[#DADDE1]">
                    시간
                  </th>
                  <th className="text-left p-2 text-sm font-medium text-[#050505] border border-[#DADDE1]">
                    제목
                  </th>
                  <th className="text-left p-2 text-sm font-medium text-[#050505] border border-[#DADDE1]">
                    장소
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSchedules.map((event) => (
                  <tr key={event.id}>
                    <td className="p-2 text-sm border border-[#DADDE1]">
                      {formatDate(new Date(event.startTime), 'short')}
                    </td>
                    <td className="p-2 text-sm border border-[#DADDE1]">
                      {formatTime(new Date(event.startTime))} -{' '}
                      {formatTime(new Date(event.endTime))}
                    </td>
                    <td className="p-2 text-sm font-medium border border-[#DADDE1]">
                      {event.title}
                    </td>
                    <td className="p-2 text-sm border border-[#DADDE1]">{event.location || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-[#DADDE1] text-center text-xs text-[#8A8D91]">
          checkin - Schedule Export
        </div>
      </div>
    )
  }
)

PrintableSchedule.displayName = 'PrintableSchedule'

export default PrintableSchedule
