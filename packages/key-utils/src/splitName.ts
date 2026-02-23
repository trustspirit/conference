export function splitName(fullName: string): { lastName: string; firstName: string } {
  const trimmed = fullName.trim()

  if (trimmed.includes(' ')) {
    const parts = trimmed.split(' ')
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1]
      const firstName = parts.slice(0, -1).join(' ')
      return { lastName, firstName }
    }
  }

  if (trimmed.length >= 2) {
    return {
      lastName: trimmed.charAt(0),
      firstName: trimmed.substring(1)
    }
  }

  return { lastName: trimmed, firstName: '' }
}
