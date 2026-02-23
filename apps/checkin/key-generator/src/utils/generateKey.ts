/**
 * 결정론적 키 생성 유틸리티
 * 같은 입력값에 대해 항상 같은 8자리 키를 생성합니다.
 */

// Secret key - 실제 환경에서는 환경변수로 관리하세요
const SECRET_KEY = 'your-secret-key-here-change-this'

/**
 * SHA-256 해시를 생성합니다
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * 해시 문자열을 대문자 알파벳과 숫자만의 8자리 키로 변환합니다
 */
function hashToAlphanumeric(hash: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  
  // 해시의 각 2자리 16진수를 알파벳/숫자로 변환
  for (let i = 0; i < 8; i++) {
    const hexPair = hash.substring(i * 2, i * 2 + 2)
    const num = parseInt(hexPair, 16)
    result += chars[num % chars.length]
  }
  
  return result
}

export interface UserInfo {
  lastName: string   // 성
  firstName: string  // 이름
  birthDate: string  // 생년월일 (YYYY-MM-DD)
}

/**
 * 사용자 정보를 기반으로 고유 키를 생성합니다
 * 같은 정보를 입력하면 항상 같은 키가 생성됩니다
 */
export async function generateUniqueKey(userInfo: UserInfo): Promise<string> {
  // 입력값 정규화 (공백 제거, 소문자 변환)
  const normalizedInput = [
    userInfo.lastName.trim().toLowerCase(),
    userInfo.firstName.trim().toLowerCase(),
    userInfo.birthDate, // YYYY-MM-DD 형식
    SECRET_KEY
  ].join('|')
  
  const hash = await sha256(normalizedInput)
  return hashToAlphanumeric(hash)
}

/**
 * 키가 유효한 형식인지 확인합니다
 */
export function isValidKey(key: string): boolean {
  return /^[A-Z0-9]{8}$/.test(key)
}
