import { BANKS } from '../constants/banks'

/** 전화번호 자동 포맷 (010-0000-0000) */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

/** 계좌번호 자동 포맷 (은행별 패턴) */
export function formatBankAccount(value: string, bankName: string): string {
  const bank = BANKS.find((b) => b.name === bankName)
  const digits = value.replace(/\D/g, '').slice(0, bank?.maxDigits ?? 16)
  if (!bank) return digits

  let result = ''
  let pos = 0
  for (const len of bank.format) {
    if (pos >= digits.length) break
    if (pos > 0) result += '-'
    result += digits.slice(pos, pos + len)
    pos += len
  }
  return result
}

/** File → base64 data URL 변환 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
  })
}

/** Firestore Timestamp → 한국어 날짜 문자열 */
export function formatFirestoreDate(date: unknown): string {
  if (date && typeof date === 'object' && 'toDate' in date) {
    return (date as { toDate: () => Date }).toDate().toLocaleDateString('ko-KR')
  }
  return '-'
}

/** Firestore Timestamp → HH:MM 시간 문자열 */
export function formatFirestoreTime(date: unknown): string {
  if (date && typeof date === 'object' && 'toDate' in date) {
    const d = (date as { toDate: () => Date }).toDate()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return ''
}

/** 파일 유효성 검증 (허용 형식 + 용량) */
export function validateFiles(
  files: File[],
  t?: (key: string, opts?: Record<string, unknown>) => string
): { valid: File[]; errors: string[] } {
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf']
  const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf']
  const MAX_FILE_SIZE = 750 * 1024 // 750KB

  const errors: string[] = []
  const valid: File[] = []

  for (const f of files) {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_TYPES.includes(f.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
      errors.push(
        t
          ? t('validation.invalidFileType', { name: f.name })
          : `"${f.name}" - Invalid format (PNG, JPG, PDF only)`
      )
    } else if (f.size > MAX_FILE_SIZE) {
      errors.push(
        t
          ? t('validation.fileTooLarge', { name: f.name, size: (f.size / 1024).toFixed(0) })
          : `"${f.name}" - Exceeds 750KB (${(f.size / 1024).toFixed(0)}KB)`
      )
    } else {
      valid.push(f)
    }
  }

  return { valid, errors }
}

/** 이미지 파일을 Canvas로 리사이즈하여 maxBytes 이하로 압축 */
export async function compressImageFile(file: File, maxBytes = 800 * 1024): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= maxBytes) return file

  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap

  // 비율을 유지하면서 최대 1600px로 축소
  const MAX_DIM = 1600
  let w = width
  let h = height
  if (w > MAX_DIM || h > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / w, MAX_DIM / h)
    w = Math.round(w * ratio)
    h = Math.round(h * ratio)
  }

  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  // quality를 낮춰가며 목표 크기 이하로 압축
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  let quality = 0.85
  let blob = await canvas.convertToBlob({ type: mimeType, quality })

  while (blob.size > maxBytes && quality > 0.1) {
    quality -= 0.1
    blob = await canvas.convertToBlob({ type: mimeType, quality })
  }

  const ext = mimeType === 'image/png' ? '.png' : '.jpg'
  const baseName = file.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}${ext}`, { type: mimeType })
}

/** 통장사본 파일 검증 (PNG/JPG/PDF, 800KB 이하) */
export function validateBankBookFile(file: File): string | null {
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf']
  const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf']
  const MAX_SIZE = 800 * 1024 // 800KB

  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
    return `PNG, JPG, PDF only`
  }
  if (file.size > MAX_SIZE) {
    return `Max 800KB (${(file.size / 1024).toFixed(0)}KB)`
  }
  return null
}
