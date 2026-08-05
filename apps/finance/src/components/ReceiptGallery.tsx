import { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Receipt, ReceiptDisplaySizes } from '../types'
import BankBookPreview from './BankBookPreview'

interface Props {
  receipts: Receipt[]
  title?: string
  /** Map of storagePath → 'large' (absence implies normal size). */
  displaySizes?: ReceiptDisplaySizes
  /** When provided, each tile shows a toggle to flip the receipt's PDF size.
   *  Receives the receipt's storagePath and the desired next size. */
  onToggleDisplaySize?: (storagePath: string, next: 'normal' | 'large') => void | Promise<void>
  /** When true, disables the toggle button while a size update is in flight. */
  isPending?: boolean
}

export default function ReceiptGallery({
  receipts,
  title,
  displaySizes,
  onToggleDisplaySize,
  isPending
}: Props) {
  const { t } = useTranslation()
  if (receipts.length === 0) return null

  const handleToggle = (e: MouseEvent, storagePath: string, isLarge: boolean) => {
    e.preventDefault()
    e.stopPropagation()
    if (!onToggleDisplaySize || !storagePath) return
    onToggleDisplaySize(storagePath, isLarge ? 'normal' : 'large')
  }

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-finance-primary mb-3">
        {title ?? t('field.receipts')} ({receipts.length})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {receipts.map((r, i) => {
          const fileUrl = r.url || r.driveUrl
          const thumbUrl =
            r.url ||
            (r.driveFileId
              ? `https://drive.google.com/thumbnail?id=${r.driveFileId}&sz=w400`
              : undefined)
          const isLarge = displaySizes?.[r.storagePath] === 'large'
          const canToggle = onToggleDisplaySize && !!r.storagePath
          return (
            <a
              key={i}
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block border border-finance-border rounded-lg overflow-hidden hover:border-finance-primary transition-colors"
            >
              <div className="aspect-[3/4] overflow-hidden bg-finance-surface relative">
                {fileUrl ? (
                  <BankBookPreview
                    url={thumbUrl || fileUrl}
                    alt={r.fileName}
                    maxHeight=""
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                ) : null}
                {isLarge && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-finance-accent text-[10px] font-semibold text-white shadow">
                    {t('receipts.sizeLargeBadge')}
                  </span>
                )}
                {canToggle && (
                  <button
                    type="button"
                    onClick={(e) => handleToggle(e, r.storagePath, isLarge)}
                    disabled={isPending}
                    className="absolute top-1 right-1 p-2 rounded bg-white/90 hover:bg-white shadow text-finance-text disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={isLarge ? t('receipts.markNormal') : t('receipts.markLarge')}
                    title={isLarge ? t('receipts.markNormal') : t('receipts.markLarge')}
                  >
                    {isLarge ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="4 14 10 14 10 20" />
                        <polyline points="20 10 14 10 14 4" />
                        <line x1="14" y1="10" x2="21" y2="3" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    ) : (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
              <span className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-finance-primary-hover/80 text-[10px] text-white truncate">
                {r.fileName}
              </span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
