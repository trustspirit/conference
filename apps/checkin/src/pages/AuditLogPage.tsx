import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { readAuditLogsPaginated, clearAuditLogs } from '../services/auditLog'
import type { AuditLogEntry } from '../services/auditLog'
import { useSetAtom } from 'jotai'
import { addToastAtom } from '../stores/toastStore'
import { AuditAction, TargetType, AUDIT_ACTION_LABELS, TARGET_TYPE_LABELS } from '../types'
import { AuditLogSkeleton } from '../components'
import { isFirebaseConfigured } from '../services/firebase'
import { useInfiniteScroll } from '../hooks'

function AuditLogPage(): React.ReactElement {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<AuditLogEntry['targetType'] | 'all'>('all')
  const [isClearing, setIsClearing] = useState(false)
  const addToast = useSetAtom(addToastAtom)

  // Infinite scroll for audit logs
  const {
    items: logs,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh
  } = useInfiniteScroll({
    pageSize: 50,
    fetchFunction: readAuditLogsPaginated
  })

  // Intersection Observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoadingMore) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    observerRef.current.observe(loadMoreRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, isLoadingMore, loadMore])

  const handleClearLogs = useCallback(async () => {
    if (!confirm(t('auditLog.confirmClear'))) return

    setIsClearing(true)
    try {
      const success = await clearAuditLogs()
      if (success) {
        addToast({ type: 'success', message: t('toast.deleteSuccess') })
        refresh()
      } else {
        addToast({ type: 'error', message: t('toast.deleteFailed') })
      }
    } catch {
      addToast({ type: 'error', message: t('toast.deleteFailed') })
    } finally {
      setIsClearing(false)
    }
  }, [addToast, t, refresh])

  const formatDate = (timestamp: string) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(timestamp))
  }

  const getActionLabel = (action: AuditLogEntry['action']): string => {
    return AUDIT_ACTION_LABELS[action as AuditAction] || action
  }

  const getTargetTypeLabel = (targetType: AuditLogEntry['targetType']): string => {
    return TARGET_TYPE_LABELS[targetType as TargetType] || targetType
  }

  const getActionColor = (action: AuditLogEntry['action']): string => {
    switch (action) {
      case 'create':
      case 'import':
        return 'bg-[#E6F4EA] text-[#1E7E34]'
      case 'delete':
        return 'bg-[#FFEBEE] text-[#C62828]'
      case 'check_in':
        return 'bg-[#E3F2FD] text-[#1565C0]'
      case 'check_out':
        return 'bg-[#FFF3E0] text-[#E65100]'
      case 'assign':
        return 'bg-[#F3E5F5] text-[#7B1FA2]'
      default:
        return 'bg-[#E7F3FF] text-[#1877F2]'
    }
  }

  const filteredLogs = filter === 'all' ? logs : logs.filter((log) => log.targetType === filter)

  if (!isFirebaseConfigured()) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#050505]">{t('auditLog.title')}</h1>
            <p className="text-[#65676B] mt-1">{t('common.noData')}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#DADDE1] p-12 text-center">
          <div className="text-[#65676B] text-lg">{t('settings.disconnected')}</div>
          <p className="text-[#65676B] mt-2 text-sm">{t('settings.importConfig')}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <AuditLogSkeleton />
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#050505]">{t('auditLog.title')}</h1>
          <p className="text-[#65676B] mt-1">{t('auditLog.details')}</p>
        </div>
        <div className="flex gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="pl-4 pr-10 py-2 border border-[#DADDE1] rounded-lg bg-white text-sm font-medium appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:16px_16px]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2365676B'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`
            }}
          >
            <option value="all">{t('common.all')}</option>
            <option value="participant">{t('nav.participants')}</option>
            <option value="group">{t('nav.groups')}</option>
            <option value="room">{t('nav.rooms')}</option>
          </select>
          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              disabled={isClearing}
              className="px-4 py-2 border border-[#FA383E] text-[#FA383E] rounded-lg text-sm font-semibold hover:bg-[#FFEBEE] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearing ? t('common.loading') : t('auditLog.clearAll')}
            </button>
          )}
        </div>
      </div>

      {filteredLogs.length === 0 && !isLoading ? (
        <div className="bg-white rounded-lg border border-[#DADDE1] p-12 text-center">
          <div className="text-[#65676B] text-lg">{t('auditLog.noLogs')}</div>
          <p className="text-[#65676B] mt-2 text-sm">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#DADDE1] overflow-hidden">
          <div className="px-4 py-2 bg-[#F7F8FA] border-b border-[#DADDE1] text-xs text-[#65676B]">
            Showing {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}
            {hasMore && ' (scroll for more)'}
          </div>
          <table className="w-full">
            <thead className="bg-[#F0F2F5] border-b border-[#DADDE1]">
              <tr>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  Time
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  User
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  Action
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  Target
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-[#DADDE1] last:border-b-0 hover:bg-[#F7F8FA]"
                >
                  <td className="px-4 py-3 text-sm text-[#65676B]">{formatDate(log.timestamp)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-[#050505]">{log.userName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${getActionColor(log.action)}`}
                    >
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-[#050505]">{log.targetName}</div>
                    <div className="text-xs text-[#65676B]">
                      {getTargetTypeLabel(log.targetType)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#65676B]">
                    {log.changes && Object.keys(log.changes).length > 0 ? (
                      <div className="space-y-1">
                        {Object.entries(log.changes).map(([field, change]) => (
                          <div key={field} className="text-xs">
                            <span className="font-medium">{field}:</span>{' '}
                            <span className="text-[#FA383E]">{String(change.from || '-')}</span>
                            {' → '}
                            <span className="text-[#31A24C]">{String(change.to || '-')}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-4 border-t border-[#DADDE1]">
              {isLoadingMore ? (
                <div className="w-6 h-6 border-2 border-[#DADDE1] border-t-[#1877F2] rounded-full animate-spin" />
              ) : (
                <span className="text-[#65676B] text-sm">{t('participant.scrollToLoadMore')}</span>
              )}
            </div>
          )}
          {!hasMore && filteredLogs.length > 0 && (
            <div className="px-6 py-4 text-center text-sm text-[#65676B] border-t border-[#DADDE1]">
              {t('common.allLoaded')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AuditLogPage
