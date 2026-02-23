import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  cloneElement,
  isValidElement
} from 'react'
import { createPortal } from 'react-dom'

interface HoverCardProps {
  children: React.ReactElement
  content: React.ReactNode
  className?: string
  delay?: number
  interactive?: boolean
}

function HoverCard({
  children,
  content,
  className = '',
  delay = 200,
  interactive = true
}: HoverCardProps): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const [mouseOrigin, setMouseOrigin] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLElement | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isHoveringCard = useRef(false)

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !cardRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const cardRect = cardRef.current.getBoundingClientRect()
    const padding = 12
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Default: position below and centered on trigger
    let top = triggerRect.bottom + padding
    let left = triggerRect.left + triggerRect.width / 2 - cardRect.width / 2

    // Check if card overflows bottom
    if (top + cardRect.height > viewportHeight - padding) {
      // Position above trigger
      top = triggerRect.top - cardRect.height - padding
    }

    // Check if card overflows right
    if (left + cardRect.width > viewportWidth - padding) {
      left = viewportWidth - cardRect.width - padding
    }

    // Check if card overflows left
    if (left < padding) {
      left = padding
    }

    // Check if card overflows top (after flipping)
    if (top < padding) {
      top = padding
    }

    setCoords({ top, left })
  }, [])

  useEffect(() => {
    if (isVisible && cardRef.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        updatePosition()
      })
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isVisible, updatePosition])

  const handleMouseEnter = (e: React.MouseEvent) => {
    setMouseOrigin({ x: e.clientX, y: e.clientY })
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    // Small delay to allow moving to the card
    setTimeout(() => {
      if (!isHoveringCard.current) {
        setIsVisible(false)
      }
    }, 100)
  }

  const handleCardMouseEnter = () => {
    isHoveringCard.current = true
  }

  const handleCardMouseLeave = () => {
    isHoveringCard.current = false
    setIsVisible(false)
  }

  // Calculate transform origin based on mouse position relative to where card will appear
  const getTransformOrigin = () => {
    if (!triggerRef.current) return 'center top'
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const relX = mouseOrigin.x - triggerRect.left
    const relY = mouseOrigin.y - triggerRect.top
    return `${relX}px ${relY}px`
  }

  // Clone the child element and attach event handlers and ref directly
  const childWithProps = isValidElement(children)
    ? cloneElement(children, {
        ref: (node: HTMLElement | null) => {
          triggerRef.current = node
          // Forward ref if the child has one
          const { ref } = children as React.ReactElement & { ref?: React.Ref<HTMLElement> }
          if (typeof ref === 'function') {
            ref(node)
          } else if (ref && typeof ref === 'object') {
            ;(ref as React.MutableRefObject<HTMLElement | null>).current = node
          }
        },
        onMouseEnter: (e: React.MouseEvent) => {
          handleMouseEnter(e)
          // Call original handler if exists
          const originalHandler = (children.props as Record<string, unknown>).onMouseEnter as
            | React.MouseEventHandler
            | undefined
          if (originalHandler) originalHandler(e)
        },
        onMouseLeave: (e: React.MouseEvent) => {
          handleMouseLeave()
          // Call original handler if exists
          const originalHandler = (children.props as Record<string, unknown>).onMouseLeave as
            | React.MouseEventHandler
            | undefined
          if (originalHandler) originalHandler(e)
        },
        className:
          `${(children.props as Record<string, unknown>).className || ''} ${className}`.trim()
      } as React.HTMLAttributes<HTMLElement>)
    : children

  return (
    <>
      {childWithProps}
      {isVisible &&
        createPortal(
          <div
            ref={cardRef}
            className="fixed z-[9999]"
            style={{
              top: coords.top,
              left: coords.left,
              transformOrigin: getTransformOrigin(),
              animation: 'hoverCardIn 0.15s ease-out forwards',
              pointerEvents: interactive ? 'auto' : 'none'
            }}
            onMouseEnter={interactive ? handleCardMouseEnter : undefined}
            onMouseLeave={interactive ? handleCardMouseLeave : undefined}
          >
            <div className="bg-white rounded-xl shadow-2xl border border-[#DADDE1] min-w-[240px] max-w-[360px] overflow-hidden">
              {content}
            </div>
          </div>,
          document.body
        )}
      <style>{`
        @keyframes hoverCardIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  )
}

export default HoverCard
