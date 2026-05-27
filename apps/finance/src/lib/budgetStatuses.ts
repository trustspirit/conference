import type { RequestStatus } from '../types'

/**
 * Request statuses that count toward project budget usage.
 * Used by both the budget warning banner and the budget-code item list.
 */
export const BUDGET_COUNTED_STATUSES: readonly RequestStatus[] = [
  'reviewed',
  'approved',
  'settled',
] as const
