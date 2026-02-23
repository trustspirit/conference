import React, { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

type TooltipPosition = 'top' | 'bottom'

interface TooltipProps {
  title: string
  items: Array<{ id: string; name: string }>
  maxItems?: number
  position?: TooltipPosition
}

function Tooltip({
  title,
  items,
  maxItems = 5,
  position = 'bottom'
}: TooltipProps): React.ReactElement | null {
  const { t } = useTranslation()
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  const displayItems = items.slice(0, maxItems)
  const remainingCount = items.length - maxItems

  useEffect(() => {
    // Find the parent element with 'relative' positioning
    const parent = tooltipRef.current?.parentElement
    if (parent) {
      const rect = parent.getBoundingClientRect()
      if (position === 'bottom') {
        setCoords({
          top: rect.bottom + 4,
          left: rect.left
        })
      } else {
        setCoords({
          top: rect.top - 4,
          left: rect.left
        })
      }
    }
  }, [position])

  const arrowClasses =
    position === 'bottom' ? 'bottom-full border-b-[#050505]' : 'top-full border-t-[#050505]'

  const arrowBorderClasses =
    position === 'bottom'
      ? 'border-l-4 border-r-4 border-b-4 border-transparent border-b-[#050505]'
      : 'border-l-4 border-r-4 border-t-4 border-transparent border-t-[#050505]'

  const tooltipContent = (
    <div
      className="fixed bg-[#050505] text-white text-xs rounded-lg py-2 px-3 z-[9999] min-w-[160px] max-w-[240px] shadow-lg pointer-events-none"
      style={
        coords
          ? {
              top: position === 'bottom' ? coords.top : 'auto',
              bottom: position === 'top' ? `calc(100vh - ${coords.top}px)` : 'auto',
              left: coords.left
            }
          : { visibility: 'hidden' }
      }
    >
      <div className={`absolute left-4 ${arrowClasses} w-0 h-0 ${arrowBorderClasses}`} />
      <div className="font-semibold mb-1">{title}:</div>
      {displayItems.map((item) => (
        <div key={item.id} className="truncate">
          {item.name}
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="text-gray-400 mt-1">
          +{remainingCount} {t('common.more')}
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Hidden ref element to get parent position */}
      <span ref={tooltipRef} className="absolute w-0 h-0" />
      {createPortal(tooltipContent, document.body)}
    </>
  )
}

export default Tooltip
