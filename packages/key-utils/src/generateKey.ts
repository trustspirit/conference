import type { KeyInput } from './types'
import { splitName } from './splitName'

const SECRET_KEY = 'your-secret-key-here-change-this'

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hashToAlphanumeric(hash: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    const hexPair = hash.substring(i * 2, i * 2 + 2)
    const num = parseInt(hexPair, 16)
    result += chars[num % chars.length]
  }
  return result
}

export async function generateUniqueKey(input: KeyInput): Promise<string> {
  const normalizedInput = [
    input.lastName.trim().toLowerCase(),
    input.firstName.trim().toLowerCase(),
    input.birthDate,
    SECRET_KEY
  ].join('|')
  const hash = await sha256(normalizedInput)
  return hashToAlphanumeric(hash)
}

export async function generateKeyFromName(
  fullName: string,
  birthDate: string
): Promise<string | null> {
  if (!fullName || !birthDate) return null
  const { lastName, firstName } = splitName(fullName)
  return generateUniqueKey({ lastName, firstName, birthDate })
}
