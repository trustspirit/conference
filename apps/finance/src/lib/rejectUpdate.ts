import type { RequestStatus } from '../types'

type Actor = { uid: string; name: string; email: string }

/**
 * Build the Firestore update for a rejection.
 *
 * A rejection undoes the stages the request had passed, so every review/approval
 * field is reset. The rejecter is recorded in the dedicated `rejectedBy` /
 * `rejectedAt` fields instead of being written into `reviewedBy` or
 * `approvedBy`, which would leave the request looking reviewed and approved.
 *
 * `timestamp` is injected so callers can pass Firestore's `serverTimestamp()`
 * sentinel while tests pass a plain value.
 */
export function buildRejectUpdate<T>(
  currentStatus: RequestStatus,
  rejecter: Actor,
  rejectionReason: string,
  timestamp: T
) {
  if (currentStatus !== 'pending' && currentStatus !== 'reviewed') {
    throw new Error('invalid_status')
  }
  return {
    status: 'rejected' as const,
    reviewedBy: null,
    reviewedAt: null,
    approvedBy: null,
    approvedAt: null,
    approvalSignature: null,
    rejectedBy: rejecter,
    rejectedAt: timestamp,
    rejectionReason
  }
}

/**
 * Recover the rejection audit trail from a document written before rejections
 * had their own fields.
 *
 * Back then the rejecter was written into the field of the stage being denied,
 * so the stage tells us which field holds the actor: a rejection from `reviewed`
 * overwrote `approvedBy`, a rejection from `pending` overwrote `reviewedBy`, and
 * a force rejection used `forceRejectedBy`. Returns null when the actor cannot
 * be identified, so the caller can leave the document alone and report it.
 */
export function inferLegacyRejection<T>(doc: {
  status: 'rejected' | 'force_rejected'
  reviewedBy?: Actor | null
  reviewedAt?: T
  approvedBy?: Actor | null
  approvedAt?: T
  forceRejectedBy?: Actor | null
  forceRejectedAt?: T
  rejectedBy?: Actor | null
  rejectedAt?: T
}) {
  if (doc.rejectedBy) {
    return { rejectedBy: doc.rejectedBy, rejectedAt: doc.rejectedAt }
  }
  if (doc.status === 'force_rejected') {
    if (!doc.forceRejectedBy) return null
    return { rejectedBy: doc.forceRejectedBy, rejectedAt: doc.forceRejectedAt }
  }
  if (doc.approvedBy) {
    return { rejectedBy: doc.approvedBy, rejectedAt: doc.approvedAt }
  }
  if (doc.reviewedBy) {
    return { rejectedBy: doc.reviewedBy, rejectedAt: doc.reviewedAt }
  }
  return null
}

/** Build the Firestore update for force-rejecting an already approved request. */
export function buildForceRejectUpdate<T>(
  rejecter: Actor,
  rejectionReason: string,
  timestamp: T
) {
  return {
    status: 'force_rejected' as const,
    reviewedBy: null,
    reviewedAt: null,
    approvedBy: null,
    approvedAt: null,
    approvalSignature: null,
    rejectedBy: rejecter,
    rejectedAt: timestamp,
    rejectionReason
  }
}
