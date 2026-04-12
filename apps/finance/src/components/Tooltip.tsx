import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  text: string
  className?: string
  maxWidth?: string
}

export default function Tooltip({ text, className = '', maxWidth = '160px' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPosition({
      top: rect.top,
      left: rect.left
    })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition])

  return (
    <span ref={ref} className={`relative inline-block ${className}`} style={{ maxWidth }}>
      {/* Mobile: show full text, no truncation */}
      <span className="block sm:hidden text-xs whitespace-pre-wrap">{text}</span>
      {/* Desktop: truncated with hover/click tooltip */}
      <span
        ref={triggerRef}
        className="hidden sm:block truncate cursor-default"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        {text}
      </span>
      {open &&
        createPortal(
          <span
            className="fixed z-50 px-2 py-1 rounded bg-gray-800 text-white text-xs whitespace-pre-wrap max-w-[280px] w-max shadow-lg pointer-events-none"
            style={{
              top: position.top,
              left: position.left,
              transform: 'translateY(-100%) translateY(-4px)'
            }}
          >
            {text}
          </span>,
          document.body
        )}
    </span>
  )
}
