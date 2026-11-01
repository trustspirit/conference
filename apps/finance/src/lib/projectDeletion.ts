/** soft delete 후 영구 삭제까지의 유예 기간(일). functions의 PROJECT_PURGE_GRACE_DAYS와 동일해야 한다. */
export const PROJECT_DELETION_GRACE_DAYS = 10

export function getRemainingDeletionDays(deletedAt: unknown): number {
  if (!deletedAt) return 0
  const ts = deletedAt as { seconds?: number; toDate?: () => Date }
  const deletedDate = ts.toDate ? ts.toDate() : new Date((ts.seconds || 0) * 1000)
  const elapsed = Date.now() - deletedDate.getTime()
  return Math.max(0, PROJECT_DELETION_GRACE_DAYS - Math.floor(elapsed / (1000 * 60 * 60 * 24)))
}
