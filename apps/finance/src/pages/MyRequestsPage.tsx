import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from '../contexts/ProjectContext'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { formatFirestoreTime } from '../lib/utils'
import { useInfiniteMyRequests, useCancelRequest } from '../hooks/queries/useRequests'
import type { RequestStatus } from '../types'

import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import InfiniteScrollSentinel from '../components/InfiniteScrollSentinel'
import FinanceTable from '../components/table/FinanceTable'
import { Dialog, Button } from 'trust-ui-react'

type MyFilter = 'all' | 'pending' | 'reviewed' | 'approved' | 'rejected' | 'settled'

export default function MyRequestsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentProject } = useProject()
  const [filter, setFilter] = useState<MyFilter>('all')

  const firestoreStatus: RequestStatus | RequestStatus[] | undefined =
    filter === 'all'
      ? undefined
      : filter === 'rejected'
        ? ['rejected', 'force_rejected', 'cancelled']
        : filter

  const {
    data,
    isLoading: loading,
    isFetching,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  } = useInfiniteMyRequests(currentProject?.id, user?.uid, firestoreStatus)
  const cancelMutation = useCancelRequest()
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    onConfirm: () => void
    message: string
  }>({ open: false, onConfirm: () => {}, message: '' })
  const closeConfirm = () => setConfirmDialog((prev) => ({ ...prev, open: false }))

  const allRequests = data?.pages.flatMap((p) => p.items) ?? []
  // Hide original requests that have been resubmitted (replaced by newer version)
  const resubmittedIds = new Set(
    allRequests.filter((r) => r.originalRequestId).map((r) => r.originalRequestId!)
  )
  const requests = allRequests.filter((r) => !resubmittedIds.has(r.id))
  const filterTabs: MyFilter[] = ['all', 'pending', 'reviewed', 'approved', 'settled', 'rejected']

  const handleCancel = (e: React.MouseEvent, requestId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setConfirmDialog({
      open: true,
      message: t('approval.cancelConfirm'),
      onConfirm: () => {
        closeConfirm()
        cancelMutation.mutate({ requestId, projectId: currentProject!.id })
      }
    })
  }

  return (
    <Layout>
      <PageHeader
        title={t('myRequests.title')}
        action={{ label: t('myRequests.newRequest'), to: '/request/new' }}
      />

      <div className="-mx-3 mb-6 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {filterTabs.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-4 py-2.5 rounded text-sm font-semibold border transition-colors ${
              filter === f
                ? 'finance-tab-active'
                : 'bg-white text-finance-muted border-finance-border hover:text-finance-primary hover:bg-finance-primary-subtle'
            }`}
          >
            {t(`status.${f}`, f)}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <p className="text-red-500 text-sm">{t('common.loadError')}</p>
      ) : requests.length === 0 ? (
        <EmptyState
          title={t('myRequests.noRequests')}
          description={t('myRequests.noRequestsHint')}
          actionLabel={t('myRequests.newRequest')}
          actionTo="/request/new"
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <FinanceTable>
              <FinanceTable.Head>
                <tr>
                  <FinanceTable.Th>{t('field.date')}</FinanceTable.Th>
                  <FinanceTable.Th>{t('field.committee')}</FinanceTable.Th>
                  <FinanceTable.Th>{t('field.items')}</FinanceTable.Th>
                  <FinanceTable.Th align="right">{t('field.totalAmount')}</FinanceTable.Th>
                  <FinanceTable.Th align="center">{t('status.label')}</FinanceTable.Th>
                  <FinanceTable.Th align="center"></FinanceTable.Th>
                </tr>
              </FinanceTable.Head>
              <FinanceTable.Body
                className={`transition-opacity ${isFetching && !isFetchingNextPage ? 'opacity-40' : ''}`}
              >
                {requests.map((req) => (
                  <FinanceTable.Row key={req.id}>
                    <FinanceTable.Td>
                      <Link to={`/request/${req.id}`} className="text-finance-primary hover:underline">
                        {req.date}
                      </Link>
                      {formatFirestoreTime(req.createdAt) && (
                        <span className="ml-1.5 text-xs text-gray-400">
                          {formatFirestoreTime(req.createdAt)}
                        </span>
                      )}
                    </FinanceTable.Td>
                    <FinanceTable.Td>{t(`committee.${req.committee}Short`)}</FinanceTable.Td>
                    <FinanceTable.Td>
                      {t('form.itemCount', { count: req.items.length })}
                    </FinanceTable.Td>
                    <FinanceTable.Td align="right">
                      ₩{req.totalAmount.toLocaleString()}
                    </FinanceTable.Td>
                    <FinanceTable.Td align="center">
                      <StatusBadge status={req.status} />
                    </FinanceTable.Td>
                    <FinanceTable.Td align="center">
                      {req.status === 'pending' && (
                        <button
                          onClick={(e) => handleCancel(e, req.id)}
                          disabled={cancelMutation.isPending}
                          className="px-3 py-1 rounded border border-red-200 bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                          {t('approval.cancelRequest')}
                        </button>
                      )}
                      {(req.status === 'cancelled' ||
                        req.status === 'rejected' ||
                        req.status === 'force_rejected') &&
                        !resubmittedIds.has(req.id) && (
                          <Link
                            to={`/request/resubmit/${req.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-block px-3 py-1 rounded border border-finance-border bg-finance-primary-surface text-finance-primary text-xs font-medium hover:bg-finance-primary-surface-hover transition-colors"
                          >
                            {t('approval.resubmit')}
                          </Link>
                        )}
                    </FinanceTable.Td>
                  </FinanceTable.Row>
                ))}
              </FinanceTable.Body>
            </FinanceTable>
          </div>

          {/* Mobile card list */}
          <div
            className={`sm:hidden space-y-3 transition-opacity ${isFetching && !isFetchingNextPage ? 'opacity-40' : ''}`}
          >
            {requests.map((req) => (
              <Link
                key={req.id}
                to={`/request/${req.id}`}
                className="finance-panel block rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-medium text-finance-primary">
                    {req.date}
                    {formatFirestoreTime(req.createdAt) && (
                      <span className="ml-1 text-xs text-gray-400 font-normal">
                        {formatFirestoreTime(req.createdAt)}
                      </span>
                    )}
                  </span>
                  <StatusBadge status={req.status} />
                </div>
                <div className="text-sm text-finance-muted mb-1">
                  {t(`committee.${req.committee}Short`)}
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-finance-muted">
                    {t('form.itemCount', { count: req.items.length })}
                  </span>
                  <span className="font-medium">₩{req.totalAmount.toLocaleString()}</span>
                </div>
                {req.status === 'pending' && (
                  <button
                    onClick={(e) => handleCancel(e, req.id)}
                    disabled={cancelMutation.isPending}
                    className="mt-3 w-full px-3 py-1.5 rounded border border-red-200 bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    {t('approval.cancelRequest')}
                  </button>
                )}
                {(req.status === 'cancelled' ||
                  req.status === 'rejected' ||
                  req.status === 'force_rejected') &&
                  !resubmittedIds.has(req.id) && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        navigate(`/request/resubmit/${req.id}`)
                      }}
                      className="mt-3 w-full text-center px-3 py-1.5 rounded border border-finance-border bg-finance-primary-surface text-finance-primary text-xs font-medium hover:bg-finance-primary-surface-hover transition-colors"
                    >
                      {t('approval.resubmit')}
                    </button>
                  )}
              </Link>
            ))}
          </div>

          <InfiniteScrollSentinel
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        </>
      )}
      <Dialog open={confirmDialog.open} onClose={closeConfirm} size="sm">
        <Dialog.Title onClose={closeConfirm}>{t('common.confirm')}</Dialog.Title>
        <Dialog.Content>
          <p>{confirmDialog.message}</p>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="outline" onClick={closeConfirm}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={confirmDialog.onConfirm}>
            {t('common.confirm')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Layout>
  )
}
