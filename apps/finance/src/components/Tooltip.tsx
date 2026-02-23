import { useState, useRef, useEffect } from 'react'

interface Props {
  text: string
  className?: string
  maxWidth?: string
}

export default function Tooltip({ text, className = '', maxWidth = '160px' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  return (
    <span ref={ref} className={`relative inline-block ${className}`} style={{ maxWidth }}>
      <span
        className="block truncate cursor-default"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        {text}
      </span>
      {open && (
        <span className="absolute z-50 left-0 bottom-full mb-1 px-2 py-1 rounded bg-gray-800 text-white text-xs whitespace-pre-wrap max-w-[280px] w-max shadow-lg">
          {text}
        </span>
      )}
    </span>
  )
}
