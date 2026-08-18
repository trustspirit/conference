/**
 * 가입 대기 알림의 수신자 uid 목록을 결정한다. Firestore 접근은 호출자가 한다.
 *
 * 대기자에게는 소속 대회 정보가 없다 — 가입 시 대회를 고르는 흐름이 없기 때문이다.
 * 그래서 전역 설정의 default 프로젝트를 기준으로 삼는다.
 */
export function resolvePendingSignupRecipients(
  defaultProjectId: string | null | undefined,
  projectMemberRoles: Record<string, string> | null | undefined,
  superAdminUids: string[]
): string[] {
  if (defaultProjectId && projectMemberRoles) {
    const admins = Object.entries(projectMemberRoles)
      .filter(([, role]) => role === 'admin')
      .map(([uid]) => uid)
    if (admins.length > 0) return admins
  }

  // 폴백 없이 조용히 종료하면 설정 실수 하나로 가입 신호가 사라진다.
  // super_admin 은 어차피 미배정 사용자 배정 권한을 가진 최종 책임자다.
  return [...new Set(superAdminUids)]
}
