/**
 * Sanitize a URL for safe use in CSS `url()` context.
 * Rejects non-https URLs and URLs containing CSS injection characters.
 */
export function sanitizeCssUrl(url: string): string {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return ''
  } catch {
    return ''
  }
  // Reject characters that can break out of CSS url() context
  if (/['"()\s\\]/.test(url)) return ''
  return url
}
