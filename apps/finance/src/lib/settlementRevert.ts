/**
 * Decide what to do with a request when reverting a settlement batch.
 *
 * Revert a request back to 'approved' only when it is still 'settled' AND its
 * settlementId points at one of the settlement docs being deleted in THIS batch.
 * This prevents a stale sibling-currency batch from un-settling a request that
 * was already reverted and re-settled into a different batch, and it makes a
 * mixed-currency request (settled across two batches) revert only when its own
 * batch is reverted.
 */
export function revertRequestAction(
  status: string,
  settlementId: string | null | undefined,
  batchSettlementIds: string[]
): 'revert' | 'skip' {
  if (status !== 'settled') return 'skip'
  if (!settlementId || !batchSettlementIds.includes(settlementId)) return 'skip'
  return 'revert'
}
