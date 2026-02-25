interface FirebaseError {
  code?: string
  message: string
}

const ERROR_MAP: Record<string, string> = {
  'permission-denied': '권한이 없습니다.',
  'not-found': '요청한 데이터를 찾을 수 없습니다.',
  'already-exists': '이미 존재하는 데이터입니다.',
  'resource-exhausted': '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  'failed-precondition': '작업을 수행할 수 없는 상태입니다.',
  unavailable: '서비스에 연결할 수 없습니다. 네트워크를 확인해주세요.',
  unauthenticated: '로그인이 필요합니다.',
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const fbError = error as FirebaseError
    if (fbError.code && ERROR_MAP[fbError.code]) {
      return ERROR_MAP[fbError.code]
    }
  }
  return fallback
}
