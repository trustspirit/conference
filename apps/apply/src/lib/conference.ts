import type { Conference } from '../types'

/**
 * 대회가 마감되었는지 확인합니다.
 * - `isClosed`가 true이면 수동 마감
 * - `deadline`이 지났으면 자동 마감
 */
export function isConferenceClosed(conference: Conference | null | undefined): boolean {
  if (!conference) return false
  if (conference.isClosed) return true
  if (conference.deadline && conference.deadline < new Date()) return true
  return false
}
