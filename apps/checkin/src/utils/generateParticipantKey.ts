/**
 * 참가자 고유 키 생성 유틸리티
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
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
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

export interface ParticipantKeyInfo {
  lastName: string // 성
  firstName: string // 이름
  birthDate: string // 생년월일 (YYYY-MM-DD)
}

/**
 * 전체 이름에서 성과 이름을 분리합니다
 * 한국어 이름의 경우 첫 글자가 성, 나머지가 이름
 * 영어 이름의 경우 공백으로 분리
 */
export function splitName(fullName: string): { lastName: string; firstName: string } {
  const trimmed = fullName.trim()

  // 공백이 있는 경우 (영어 이름 등)
  if (trimmed.includes(' ')) {
    const parts = trimmed.split(' ')
    // 영어: First Last 순서
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1]
      const firstName = parts.slice(0, -1).join(' ')
      return { lastName, firstName }
    }
  }

  // 한국어 이름: 첫 글자가 성, 나머지가 이름
  if (trimmed.length >= 2) {
    return {
      lastName: trimmed.charAt(0),
      firstName: trimmed.substring(1)
    }
  }

  // 이름이 1글자인 경우
  return { lastName: trimmed, firstName: '' }
}

/**
 * 참가자 정보를 기반으로 고유 키를 생성합니다
 * 같은 정보를 입력하면 항상 같은 키가 생성됩니다
 */
export async function generateParticipantKey(info: ParticipantKeyInfo): Promise<string> {
  // 입력값 정규화 (공백 제거, 소문자 변환)
  const normalizedInput = [
    info.lastName.trim().toLowerCase(),
    info.firstName.trim().toLowerCase(),
    info.birthDate, // YYYY-MM-DD 형식
    SECRET_KEY
  ].join('|')

  const hash = await sha256(normalizedInput)
  return hashToAlphanumeric(hash)
}

/**
 * 참가자 이름과 생년월일로 키를 생성합니다
 */
export async function generateKeyFromParticipant(
  name: string,
  birthDate: string
): Promise<string | null> {
  if (!name || !birthDate) {
    return null
  }

  const { lastName, firstName } = splitName(name)
  return generateParticipantKey({ lastName, firstName, birthDate })
}

/**
 * 키가 유효한 형식인지 확인합니다
 */
export function isValidParticipantKey(key: string): boolean {
  return /^[A-Z0-9]{8}$/.test(key)
}
