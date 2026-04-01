import { useState, useEffect } from 'react'

interface Props {
  url: string
  alt: string
  maxHeight?: string
  className?: string
  isPdf?: boolean
}

function isPdfUrl(url: string): boolean {
  try {
    const decoded = decodeURIComponent(url)
    return /\.pdf(\?|$)/i.test(decoded)
  } catch {
    return /\.pdf(\?|$)/i.test(url)
  }
}

function PdfPreview({ url, alt, maxHeight, className }: Omit<Props, 'isPdf'>) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    setBlobUrl(null)
    setError(false)
    const controller = new AbortController()
    let objectUrl: string | null = null

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('fetch failed')
        return res.blob()
      })
      .then((blob) => {
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(true)
      })

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url])

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 text-gray-500 text-xs ${maxHeight} aspect-3/4 ${className}`}
      >
        PDF
      </div>
    )
  }

  if (!blobUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 text-gray-400 text-xs ${maxHeight} aspect-3/4 ${className}`}
      >
        …
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${maxHeight} aspect-3/4 ${className}`}>
      <iframe
        src={`${blobUrl}#toolbar=0&navpanes=0`}
        className="absolute top-0 left-0 border-none pointer-events-none"
        style={{
          width: '300%',
          height: '300%',
          transform: 'scale(0.333)',
          transformOrigin: 'top left'
        }}
        title={alt}
      />
    </div>
  )
}

export default function BankBookPreview({
  url,
  alt,
  maxHeight = 'max-h-32',
  className = '',
  isPdf
}: Props) {
  if (isPdf ?? isPdfUrl(url)) {
    return <PdfPreview url={url} alt={alt} maxHeight={maxHeight} className={className} />
  }

  return <img src={url} alt={alt} className={`${maxHeight} ${className}`} />
}
