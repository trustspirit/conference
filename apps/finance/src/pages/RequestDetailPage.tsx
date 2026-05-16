import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

import {
  useRequest,
  useRequests,
  useCancelRequest,
  useReviewRequest,
  useApproveRequest,
  useRejectRequest,
  useForceRejectRequest
} from '../hooks/queries/useRequests'
import { useProject } from '../contexts/ProjectContext'
import { useUser } from '../hooks/queries/useUsers'
import { useBudgetUsage } from '../hooks/useBudgetUsage'
import { useTranslation } from 'react-i18next'
import {
  canReviewCommittee,
  canFinalApproveCommittee,
  canFinalApproveRequest,
  canApproveDirectorRequest,
  canForceReject,
  DEFAULT_APPROVAL_THRESHOLD
} from '../lib/roles'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'
import InfoGrid from '../components/InfoGrid'
import ItemsTable from '../components/ItemsTable'
import ReceiptGallery from '../components/ReceiptGallery'
import {
  ApprovalModal,
  RejectionModal,
  ForceRejectionModal
} from '../components/AdminRequestModals'
import StatusProgress from '../components/StatusProgress'
import ReviewChecklist from '../components/ReviewChecklist'
import { Dialog, Button, useToast } from 'trust-ui-react'
import { REVIEW_CHECKLIST, APPROVAL_CHECKLIST } from '../constants/reviewChecklist'
import BankBookPreview from '../components/BankBookPreview'

export default function RequestDetailPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { id } = useParams<{ id: string }>()
  const { user, appUser, updateAppUser } = useAuth()
  const { currentProject } = useProject()
  const navigate = useNavigate()
  const location = useLocation()
  const backPath = (location.state as { from?: string })?.from || '/my-requests'
  const role = appUser?.role || 'user'
  const threshold = currentProject?.directorApprovalThreshold ?? DEFAULT_APPROVAL_THRESHOLD

  const cancelMutation = useCancelRequest()
  const reviewMutation = useReviewRequest()
  const approveMutation = useApproveRequest()
  const rejectMutation = useRejectRequest()
  const forceRejectMutation = useForceRejectRequest()
  const budgetUsage = useBudgetUsage()

  const { data: request, isLoading: requestLoading } = useRequest(id)
  const { data: requester, isLoading: requesterLoading } = useUser(request?.requestedBy.uid)
  const { data: originalRequest } = useRequest(request?.originalRequestId ?? undefined)
  const loading = requestLoading || requesterLoading

  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [showForceRejectionModal, setShowForceRejectionModal] = useState(false)
  const [showReviewConfirm, setShowReviewConfirm] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    onConfirm: () => void
    message: string
  }>({ open: false, onConfirm: () => {}, message: '' })
  const closeConfirm = () => setConfirmDialog((prev) => ({ ...prev, open: false }))
  const [slideState, setSlideState] = useState<'idle' | 'out' | 'in'>('idle')
  const isFirstMount = useRef(true)

  // Fetch all requests for auto-navigation
  const { data: allRequests = [] } = useRequests(currentProject?.id)

  const actionableRequests = useMemo(() => {
    if (!allRequests.length || !user) return []
    return allRequests.filter((r) => {
      if (r.requestedBy.uid === user.uid) return false
      if (r.status === 'pending' && canReviewCommittee(role, r.committee)) return true
      if (r.status === 'reviewed' && canFinalApproveCommittee(role, r.committee)) return true
      return false
    })
  }, [allRequests, user, role])

  const currentIndex = actionableRequests.findIndex((r) => r.id === id)
  const nextId =
    currentIndex >= 0 && currentIndex < actionableRequests.length - 1
      ? actionableRequests[currentIndex + 1].id
      : null
  const remainingCount = currentIndex >= 0 ? actionableRequests.length - currentIndex - 1 : 0

  const nextIdRef = useRef(nextId)
  useEffect(() => {
    nextIdRef.current = nextId
  }, [nextId])

  const navigateToNext = useCallback(() => {
    setSlideState('out')
    setTimeout(() => {
      window.scrollTo({ top: 0 })
      if (nextIdRef.current) {
        navigate(`/request/${nextIdRef.current}`, { state: { from: backPath } })
      } else {
        navigate(backPath)
      }
    }, 300)
  }, [navigate, backPath])

  // Slide-in animation on route change
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    // Use rAF to avoid setState directly in effect body
    const raf1 = requestAnimationFrame(() => {
      setSlideState('in')
      const raf2 = requestAnimationFrame(() => {
        setSlideState('idle')
      })
      return () => cancelAnimationFrame(raf2)
    })
    return () => cancelAnimationFrame(raf1)
  }, [id])

  const isSelf = request?.requestedBy.uid === user?.uid

  // Director-filed request: only executive/admin can approve
  const isDirectorRequest =
    requester?.role === 'session_director' || requester?.role === 'logistic_admin'

  // Review action (pending → reviewed)
  const canDoReview =
    request?.status === 'pending' && !isSelf && canReviewCommittee(role, request.committee)

  // Approve action (reviewed → approved)
  const canDoApprove =
    request?.status === 'reviewed' &&
    !isSelf &&
    canFinalApproveRequest(role, request.committee, request.totalAmount, threshold) &&
    (!isDirectorRequest || canApproveDirectorRequest(role))

  // Reject action (pending or reviewed) — rejection doesn't require amount threshold
  const canDoReject =
    (request?.status === 'pending' && !isSelf && canReviewCommittee(role, request.committee)) ||
    (request?.status === 'reviewed' &&
      !isSelf &&
      canFinalApproveCommittee(role, request.committee) &&
      (!isDirectorRequest || canApproveDirectorRequest(role)))

  // Force reject action (approved → force_rejected) — finance_prep/admin only
  const canDoForceReject = request?.status === 'approved' && canForceReject(role)

  const showChecklist = canDoReview || canDoApprove
  const checklistItems = canDoReview ? REVIEW_CHECKLIST : APPROVAL_CHECKLIST

  const handleReview = () => {
    if (!user || !appUser || !request) return
    if (isSelf) {
      toast({ variant: 'danger', message: t('approval.selfReviewError') })
      return
    }
    setShowReviewConfirm(true)
  }

  const handleReviewConfirm = () => {
    if (!user || !appUser || !request) return
    setShowReviewConfirm(false)
    const name = appUser.displayName || appUser.name
    reviewMutation.mutate(
      {
        requestId: request.id,
        projectId: currentProject!.id,
        reviewer: { uid: user.uid, name, email: appUser.email }
      },
      { onSuccess: navigateToNext }
    )
  }

  const handleApproveOpen = () => {
    if (!request) return
    if (isSelf) {
      toast({ variant: 'danger', message: t('approval.selfApproveError') })
      return
    }
    if (!canFinalApproveRequest(role, request.committee, request.totalAmount, threshold)) {
      if (request.totalAmount > threshold)
        toast({ variant: 'info', message: t('approval.directorRequired') })
      return
    }
    setShowApprovalModal(true)
  }

  const handleApproveConfirm = (signature: string) => {
    if (!user || !appUser || !request) return
    const name = appUser.displayName || appUser.name
    approveMutation.mutate(
      {
        requestId: request.id,
        projectId: currentProject!.id,
        approver: { uid: user.uid, name, email: appUser.email },
        signature
      },
      {
        onSuccess: () => {
          setShowApprovalModal(false)
          navigateToNext()
        }
      }
    )
  }

  const handleRejectOpen = () => {
    if (!request) return
    if (isSelf) {
      toast({ variant: 'danger', message: t('approval.selfRejectError') })
      return
    }
    setShowRejectionModal(true)
  }

  const handleRejectConfirm = (reason: string) => {
    if (!user || !appUser || !request) return
    const name = appUser.displayName || appUser.name
    rejectMutation.mutate(
      {
        requestId: request.id,
        projectId: currentProject!.id,
        approver: { uid: user.uid, name, email: appUser.email },
        rejectionReason: reason
      },
      {
        onSuccess: () => {
          setShowRejectionModal(false)
          navigateToNext()
        }
      }
    )
  }

  const handleForceRejectOpen = () => {
    if (!request) return
    setShowForceRejectionModal(true)
  }

  const handleForceRejectConfirm = (reason: string) => {
    if (!user || !appUser || !request) return
    const name = appUser.displayName || appUser.name
    forceRejectMutation.mutate(
      {
        requestId: request.id,
        projectId: currentProject!.id,
        approver: { uid: user.uid, name, email: appUser.email },
        rejectionReason: reason
      },
      {
        onSuccess: () => {
          setShowForceRejectionModal(false)
          navigateToNext()
        },
        onError: () => {
          toast({ variant: 'danger', message: t('approval.forceRejectFailed') })
        }
      }
    )
  }

  if (loading)
    return (
      <Layout>
        <Spinner />
      </Layout>
    )
  if (!request)
    return (
      <Layout>
        <div className="text-center py-16 text-gray-500">{t('detail.notFound')}</div>
      </Layout>
    )

  return (
    <Layout>
      {/* Mobile: collapsible checklist banner */}
      {showChecklist && (
        <div className="sm:hidden mb-4">
          <ReviewChecklist
            items={checklistItems}
            stage={canDoReview ? 'review' : 'approval'}
            excludeKeys={
              request?.isCorporateCard ? ['bankBookNameMatches', 'bankBookCorrect'] : undefined
            }
          />
        </div>
      )}

      <div className="flex gap-6 justify-center">
        <div className="flex-1 min-w-0 overflow-hidden max-w-4xl">
          <div
            className={`finance-panel rounded-lg p-4 sm:p-6 ${
              slideState === 'idle'
                ? 'transition-all duration-300 ease-in-out translate-x-0 opacity-100'
                : slideState === 'out'
                  ? 'transition-all duration-300 ease-in-out -translate-x-full opacity-0'
                  : 'translate-x-full opacity-0'
            }`}
          >
            <Link
              to={backPath}
              className="inline-block text-sm text-finance-primary hover:underline mb-4"
            >
              {t('common.backToList')}
            </Link>
            <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">{t('detail.title')}</h2>
                <p className="text-sm text-gray-500">{t('detail.subtitle')}</p>
              </div>
              <StatusBadge status={request.status} />
            </div>

            <StatusProgress status={request.status} hasReview={!!request.reviewedBy} />

            {/* Requester actions: resubmit / cancel — shown prominently at top */}
            {(request.status === 'rejected' ||
              request.status === 'cancelled' ||
              request.status === 'force_rejected') &&
              user?.uid === request.requestedBy.uid && (
                <div className="mb-6 flex flex-col gap-3 rounded-lg border border-finance-border bg-finance-primary-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-finance-primary-hover">
                    {t('approval.resubmitDescription').split('.')[0]}.
                  </span>
                  <Button
                    variant="primary"
                    className="finance-primary-button"
                    onClick={() => navigate(`/request/resubmit/${request.id}`)}
                  >
                    {t('approval.resubmit')}
                  </Button>
                </div>
              )}

            {request.status === 'pending' && user?.uid === request.requestedBy.uid && (
              <div className="mb-6 flex flex-col gap-3 rounded-lg border border-finance-border bg-finance-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-finance-muted">{t('approval.cancelConfirm')}</span>
                <Button
                  variant="danger"
                  onClick={() => {
                    setConfirmDialog({
                      open: true,
                      message: t('approval.cancelConfirm'),
                      onConfirm: () => {
                        closeConfirm()
                        cancelMutation.mutate(
                          { requestId: request.id, projectId: currentProject!.id },
                          { onSuccess: () => navigate('/my-requests') }
                        )
                      }
                    })
                  }}
                  disabled={cancelMutation.isPending}
                  loading={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? t('common.saving') : t('approval.cancelRequest')}
                </Button>
              </div>
            )}

            {request.originalRequestId && originalRequest && (
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                    {t('approval.resubmitted')}
                  </span>
                  <Link
                    to={`/request/${request.originalRequestId}`}
                    className="text-xs text-finance-primary hover:underline"
                  >
                    {t('approval.originalRequest')}
                  </Link>
                </div>
                {originalRequest.rejectionReason && (
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">{t('approval.originalRejectionReason')}: </span>
                    {originalRequest.rejectionReason}
                  </p>
                )}
              </div>
            )}

            <InfoGrid
              className="mb-6"
              items={[
                { label: t('field.payee'), value: request.payee },
                { label: t('field.date'), value: request.date },
                { label: t('field.phone'), value: request.phone },
                { label: t('field.session'), value: request.session },
                ...(!request.isCorporateCard
                  ? [
                      {
                        label: t('field.bankAndAccount'),
                        value: `${request.bankName} ${request.bankAccount}`
                      }
                    ]
                  : []),
                { label: t('committee.label'), value: t(`committee.${request.committee}`) }
              ]}
            />

            <ItemsTable items={request.items} totalAmount={request.totalAmount} />

            <ReceiptGallery receipts={request.receipts} />

            {/* Bank Book — vendor requests use vendor bank book, otherwise user profile (skip for corporate card) */}
            {(() => {
              if (request.isCorporateCard) return null
              const bankBookUrl = request.isVendorRequest
                ? request.vendorBankBookUrl
                : requester?.bankBookUrl || requester?.bankBookDriveUrl
              return bankBookUrl ? (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-finance-primary mb-3">{t('field.bankBook')}</h3>
                  <div className="border border-finance-border rounded-lg overflow-hidden inline-block">
                    <a href={bankBookUrl} target="_blank" rel="noopener noreferrer">
                      <BankBookPreview
                        url={bankBookUrl}
                        alt={t('field.bankBook')}
                        maxHeight="max-h-48"
                        className="object-contain bg-finance-surface"
                      />
                    </a>
                    <div className="px-3 py-2 bg-finance-surface border-t border-finance-border">
                      <a
                        href={bankBookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-finance-primary hover:underline"
                      >
                        {t('settings.bankBookViewDrive')}
                      </a>
                    </div>
                  </div>
                </div>
              ) : null
            })()}

            {request.comments && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-finance-primary mb-1">{t('field.comments')}</h3>
                <p className="text-sm text-finance-muted">{request.comments}</p>
              </div>
            )}

            {request.status === 'rejected' && request.rejectionReason && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-800 mb-1">
                  {t('approval.rejectionReason')}
                </h3>
                <p className="text-sm text-red-700">{request.rejectionReason}</p>
              </div>
            )}

            {request.status === 'force_rejected' && request.rejectionReason && (
              <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-orange-800 mb-1">
                  {t('approval.rejectionReason')}
                </h3>
                <p className="text-sm text-orange-700">{request.rejectionReason}</p>
              </div>
            )}

            {/* Action buttons: review / approve / reject / force-reject */}
            {(canDoReview || canDoApprove || canDoReject || canDoForceReject) && (
              <div className="mb-6 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
                {canDoReview && (
                  <Button
                    variant="primary"
                    className="finance-primary-button"
                    onClick={handleReview}
                    disabled={reviewMutation.isPending}
                    loading={reviewMutation.isPending}
                  >
                    {reviewMutation.isPending ? t('common.submitting') : t('approval.review')}
                  </Button>
                )}
                {canDoApprove && (
                  <Button
                    variant="primary"
                    className="finance-primary-button"
                    onClick={handleApproveOpen}
                  >
                    {t('approval.approve')}
                  </Button>
                )}
                {canDoReject && (
                  <Button variant="danger" onClick={handleRejectOpen}>
                    {t('approval.reject')}
                  </Button>
                )}
                {canDoForceReject && (
                  <Button variant="danger" onClick={handleForceRejectOpen}>
                    {t('approval.forceReject')}
                  </Button>
                )}
                {remainingCount > 0 && (
                  <span className="ml-auto px-2.5 py-1 bg-finance-primary-surface text-finance-primary rounded-full text-xs font-medium">
                    {t('approval.remainingCount', { count: remainingCount })}
                  </span>
                )}
              </div>
            )}

            {/* Director required hint */}
            {request.status === 'reviewed' &&
              !canDoApprove &&
              request.totalAmount > threshold &&
              !isSelf && (
                <p className="text-xs text-orange-600 mb-6">{t('approval.directorRequired')}</p>
              )}

            <InfoGrid
              className="border-t pt-4"
              items={[
                {
                  label: t('field.requestedBy'),
                  value: `${request.requestedBy.name} (${request.requestedBy.email})`
                },
                ...(request.reviewedBy
                  ? [
                      {
                        label: t('approval.reviewedBy'),
                        value: `${request.reviewedBy.name} (${request.reviewedBy.email})`
                      }
                    ]
                  : []),
                {
                  label: t('field.approvedBy'),
                  value: request.approvedBy
                    ? `${request.approvedBy.name} (${request.approvedBy.email})`
                    : '-'
                }
              ]}
            />

            {(request.requestedBySignature ||
              requester?.signature ||
              request.approvalSignature) && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      {t('field.requestedBy')}
                    </h3>
                    {request.requestedBySignature || requester?.signature ? (
                      <div className="border border-finance-border rounded p-2 bg-finance-surface inline-block">
                        <img
                          src={(request.requestedBySignature || requester?.signature)!}
                          alt={t('field.requestedBy')}
                          className="max-h-20"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      {t('approval.approvalSignature')}
                    </h3>
                    {request.approvalSignature ? (
                      <div className="border border-finance-border rounded p-2 bg-finance-surface inline-block">
                        <img
                          src={request.approvalSignature}
                          alt={t('approval.approvalSignature')}
                          className="max-h-20"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {request.status === 'settled' && request.settlementId && (
              <div className="mt-4 pt-4 border-t">
                <span className="text-sm text-gray-500">{t('detail.settlementReport')}: </span>
                <Link
                  to={`/admin/settlement/${request.settlementId}`}
                  className="text-sm text-finance-primary hover:underline"
                >
                  {t('detail.viewReport')}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Desktop: sticky sidebar checklist */}
        {showChecklist && (
          <div className="hidden sm:block shrink-0">
            <ReviewChecklist
              items={checklistItems}
              stage={canDoReview ? 'review' : 'approval'}
              excludeKeys={
                request?.isCorporateCard ? ['bankBookNameMatches', 'bankBookCorrect'] : undefined
              }
            />
          </div>
        )}
      </div>

      {/* Review confirm modal */}
      <Dialog open={showReviewConfirm} onClose={() => setShowReviewConfirm(false)} size="md">
        <Dialog.Title onClose={() => setShowReviewConfirm(false)} showClose>
          {t('checklist.confirmReview')}
        </Dialog.Title>
        <Dialog.Content>
          <p className="text-sm text-finance-muted">{t('checklist.confirmReview')}</p>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="outline" onClick={() => setShowReviewConfirm(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            className="finance-primary-button"
            onClick={handleReviewConfirm}
          >
            {t('approval.review')}
          </Button>
        </Dialog.Actions>
      </Dialog>

      <ApprovalModal
        key={showApprovalModal ? 'approval-open' : 'approval-closed'}
        open={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        request={request}
        bankBookUrl={
          request?.isVendorRequest
            ? request.vendorBankBookUrl
            : requester?.bankBookUrl || requester?.bankBookDriveUrl
        }
        budgetUsage={budgetUsage}
        savedSignature={appUser?.signature}
        onConfirm={handleApproveConfirm}
        onSignatureSync={async (sig) => {
          try {
            await updateAppUser({ signature: sig })
          } catch {
            // Non-blocking — approval still proceeds
          }
        }}
        isPending={approveMutation.isPending}
      />

      <RejectionModal
        key={showRejectionModal ? 'rejection-open' : 'rejection-closed'}
        open={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
        onConfirm={handleRejectConfirm}
        isPending={rejectMutation.isPending}
      />

      <ForceRejectionModal
        key={showForceRejectionModal ? 'force-rejection-open' : 'force-rejection-closed'}
        open={showForceRejectionModal}
        onClose={() => setShowForceRejectionModal(false)}
        onConfirm={handleForceRejectConfirm}
        isPending={forceRejectMutation.isPending}
      />

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
