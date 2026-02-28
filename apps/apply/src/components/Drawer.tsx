import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

// Inject keyframes once at module level
if (typeof document !== 'undefined') {
  const id = 'drawer-slide-in-keyframes'
  if (!document.getElementById(id)) {
    const style = document.createElement('style')
    style.id = id
    style.textContent = `
      @keyframes drawer-slide-in {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
    `
    document.head.appendChild(style)
  }
}

// --- Drawer Root ---
interface DrawerProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

function DrawerRoot({ open, onClose, children, className }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // body 스크롤 방지 (이전 값 저장/복원)
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // 열릴 때 패널에 포커스
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className={className} style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      {/* Overlay */}
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          transition: 'opacity 150ms ease-out',
        }}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#fff',
          boxShadow: '-4px 0 16px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          animation: 'drawer-slide-in 150ms ease-out',
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

// --- Drawer.Header ---
interface DrawerHeaderProps {
  children: ReactNode
  onClose?: () => void
  extra?: ReactNode
  className?: string
  style?: CSSProperties
}

function DrawerHeader({ children, onClose, extra, className, style }: DrawerHeaderProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
        {children}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {extra}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              fontSize: '1.25rem',
              color: '#6b7280',
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

// --- Drawer.Content ---
interface DrawerContentProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

function DrawerContent({ children, className, style }: DrawerContentProps) {
  return (
    <div
      className={className}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.5rem',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// --- Drawer.Footer ---
interface DrawerFooterProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

function DrawerFooter({ children, className, style }: DrawerFooterProps) {
  return (
    <div
      className={className}
      style={{
        padding: '1rem 1.5rem',
        borderTop: '1px solid #e5e7eb',
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// --- Compound Export ---
const Drawer = Object.assign(DrawerRoot, {
  Header: DrawerHeader,
  Content: DrawerContent,
  Footer: DrawerFooter,
})

export default Drawer
