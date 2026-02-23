/**
 * Format Korean phone number as user types
 * Supports:
 * - Mobile: 010-1234-5678
 * - Seoul landline: 02-1234-5678
 * - Other landlines: 031-123-4567
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const numbers = value.replace(/\D/g, '')

  // Limit to 11 digits max
  const limited = numbers.slice(0, 11)

  if (limited.length === 0) return ''

  // Mobile numbers (010, 011, 016, 017, 018, 019)
  if (limited.startsWith('01')) {
    if (limited.length <= 3) {
      return limited
    } else if (limited.length <= 7) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`
    }
  }

  // Seoul landline (02)
  if (limited.startsWith('02')) {
    if (limited.length <= 2) {
      return limited
    } else if (limited.length <= 5) {
      return `${limited.slice(0, 2)}-${limited.slice(2)}`
    } else if (limited.length <= 9) {
      return `${limited.slice(0, 2)}-${limited.slice(2, 5)}-${limited.slice(5)}`
    } else {
      return `${limited.slice(0, 2)}-${limited.slice(2, 6)}-${limited.slice(6)}`
    }
  }

  // Other landlines (031, 032, etc.)
  if (limited.length <= 3) {
    return limited
  } else if (limited.length <= 6) {
    return `${limited.slice(0, 3)}-${limited.slice(3)}`
  } else if (limited.length <= 10) {
    return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`
  } else {
    return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`
  }
}

/**
 * Remove formatting from phone number (for storage)
 */
export function unformatPhoneNumber(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Validate Korean phone number
 */
export function isValidPhoneNumber(value: string): boolean {
  const numbers = value.replace(/\D/g, '')
  // Valid lengths: 9-11 digits
  return numbers.length >= 9 && numbers.length <= 11
}
