export function isValidKey(key: string): boolean {
  return /^[A-Z0-9]{8}$/.test(key)
}
