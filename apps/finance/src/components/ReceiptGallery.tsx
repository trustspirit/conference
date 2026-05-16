import { useTranslation } from 'react-i18next'
import { Receipt } from '../types'
import BankBookPreview from './BankBookPreview'

interface Props {
  receipts: Receipt[]
  title?: string
}

export default function ReceiptGallery({ receipts, title }: Props) {
  const { t } = useTranslation()
  if (receipts.length === 0) return null

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
