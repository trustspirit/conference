import { useTranslation } from 'react-i18next'
import { Receipt } from '../types'

interface Props {
  receipts: Receipt[]
  title?: string
}

export default function ReceiptGallery({ receipts, title }: Props) {
  const { t } = useTranslation()
  if (receipts.length === 0) return null

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        {title ?? t('field.receipts')} ({receipts.length})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {receipts.map((r, i) => {
          const fileUrl = r.url || r.driveUrl
          const thumbUrl = r.url || (r.driveFileId ? `https://drive.google.com/thumbnail?id=${r.driveFileId}&sz=w400` : undefined)
          const isPdf = r.fileName.toLowerCase().endsWith('.pdf')
          return (
            <a key={i} href={fileUrl} target="_blank" rel="noopener noreferrer"
              className="relative block border border-gray-200 rounded-lg overflow-hidden hover:border-gray-400 transition-colors">
              <div className="aspect-[3/4] overflow-hidden bg-gray-50 relative">
                {isPdf ? (
                  fileUrl && (
                    <iframe src={`${fileUrl}#toolbar=0&navpanes=0`}
                      className="absolute top-0 left-0 border-none pointer-events-none"
                      style={{ width: '300%', height: '300%', transform: 'scale(0.333)', transformOrigin: 'top left' }}
                      title={r.fileName} />
                  )
                ) : (
                  thumbUrl && (
                    <img src={thumbUrl} alt={r.fileName}
                      className="absolute inset-0 w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  )
                )}
              </div>
              <span className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/50 text-[10px] text-white truncate">
                {r.fileName}
              </span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
