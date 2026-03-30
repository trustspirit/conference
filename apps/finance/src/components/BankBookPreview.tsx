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

export default function BankBookPreview({
  url,
  alt,
  maxHeight = 'max-h-32',
  className = '',
  isPdf
}: Props) {
  if (isPdf ?? isPdfUrl(url)) {
    return (
      <div className={`relative overflow-hidden ${maxHeight} aspect-3/4 ${className}`}>
        <iframe
          src={`${url}#toolbar=0&navpanes=0`}
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

  return <img src={url} alt={alt} className={`${maxHeight} ${className}`} />
}
