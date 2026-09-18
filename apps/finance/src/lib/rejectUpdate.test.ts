import { describe, it, expect } from 'vitest'
import { buildRejectUpdate, buildForceRejectUpdate, inferLegacyRejection } from './rejectUpdate'

const rejecter = { uid: 'u9', name: 'Boss', email: 'boss@x.com' }
const TS = 'SERVER_TIMESTAMP'

describe('buildRejectUpdate', () => {
  it('clears the review stage when rejecting a pending request', () => {
    const update = buildRejectUpdate('pending', rejecter, 'receipt missing', TS)

    expect(update).toEqual({
      status: 'rejected',
      reviewedBy: null,
      reviewedAt: null,
      approvedBy: null,
      approvedAt: null,
      approvalSignature: null,
      rejectedBy: rejecter,
      rejectedAt: TS,
      rejectionReason: 'receipt missing'
    })
  })

  it('clears both review and approval stages when rejecting a reviewed request', () => {
    const update = buildRejectUpdate('reviewed', rejecter, 'over budget', TS)

    expect(update.reviewedBy).toBeNull()
    expect(update.reviewedAt).toBeNull()
    expect(update.approvedBy).toBeNull()
    expect(update.approvedAt).toBeNull()
    expect(update.approvalSignature).toBeNull()
  })

  it('never records the rejecter as reviewer or approver', () => {
    for (const from of ['pending', 'reviewed'] as const) {
      const update = buildRejectUpdate(from, rejecter, 'nope', TS)
      expect(update.reviewedBy).not.toEqual(rejecter)
      expect(update.approvedBy).not.toEqual(rejecter)
      expect(update.rejectedBy).toEqual(rejecter)
    }
  })

  it('produces the same shape whichever stage the rejection came from', () => {
    const fromPending = buildRejectUpdate('pending', rejecter, 'nope', TS)
    const fromReviewed = buildRejectUpdate('reviewed', rejecter, 'nope', TS)
    expect(fromPending).toEqual(fromReviewed)
  })

  it('rejects an unsupported source status', () => {
    expect(() => buildRejectUpdate('approved', rejecter, 'x', TS)).toThrow('invalid_status')
  })
})

describe('inferLegacyRejection', () => {
  const reviewer = { uid: 'u1', name: 'Reviewer', email: 'r@x.com' }
  const reviewedAt = new Date('2026-01-01')
  const rejectedAt = new Date('2026-02-02')

  it('reads the rejecter from approvedBy when rejected after review', () => {
    expect(
      inferLegacyRejection({
        status: 'rejected',
        reviewedBy: reviewer,
        reviewedAt,
        approvedBy: rejecter,
        approvedAt: rejectedAt
      })
    ).toEqual({ rejectedBy: rejecter, rejectedAt })
  })

  it('reads the rejecter from reviewedBy when rejected while pending', () => {
    expect(
      inferLegacyRejection({
        status: 'rejected',
        reviewedBy: rejecter,
        reviewedAt: rejectedAt,
        approvedBy: null
      })
    ).toEqual({ rejectedBy: rejecter, rejectedAt })
  })

  it('reads the rejecter from forceRejectedBy for a force rejection', () => {
    expect(
      inferLegacyRejection({
        status: 'force_rejected',
        reviewedBy: reviewer,
        reviewedAt,
        approvedBy: reviewer,
        approvedAt: reviewedAt,
        forceRejectedBy: rejecter,
        forceRejectedAt: rejectedAt
      })
    ).toEqual({ rejectedBy: rejecter, rejectedAt })
  })

  it('returns null when no actor can be identified', () => {
    expect(inferLegacyRejection({ status: 'rejected', reviewedBy: null, approvedBy: null })).toBeNull()
    expect(inferLegacyRejection({ status: 'force_rejected', forceRejectedBy: null })).toBeNull()
  })

  it('is idempotent — already migrated docs need no inference', () => {
    expect(
      inferLegacyRejection({
        status: 'rejected',
        reviewedBy: null,
        approvedBy: null,
        rejectedBy: rejecter,
        rejectedAt
      })
    ).toEqual({ rejectedBy: rejecter, rejectedAt })
  })
})

describe('buildForceRejectUpdate', () => {
  it('clears review and approval stages and keeps its own audit trail', () => {
    const update = buildForceRejectUpdate(rejecter, 'duplicate claim', TS)

    expect(update).toEqual({
      status: 'force_rejected',
      reviewedBy: null,
      reviewedAt: null,
      approvedBy: null,
      approvedAt: null,
      approvalSignature: null,
      rejectedBy: rejecter,
      rejectedAt: TS,
      rejectionReason: 'duplicate claim'
    })
  })
})
