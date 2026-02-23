import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export interface ExportMenuItem {
  id: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  divider?: boolean
}

export interface ExportMenuProps {
  items: ExportMenuItem[]
  label?: string
  disabled?: boolean
}

function ExportMenu({ items, label, disabled = false }: ExportMenuProps): React.ReactElement {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#F0F2F5] text-[#050505] rounded-lg font-semibold hover:bg-[#E4E6EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        {label || t('common.export')}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-[#DADDE1] py-2 z-20">
          <div className="px-3 py-1.5 text-xs font-semibold text-[#65676B] uppercase tracking-wide">
            {t('common.export')}
          </div>
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {item.divider && <div className="border-t border-[#DADDE1] my-2" />}
              <button
                onClick={() => {
                  item.onClick()
                  setIsOpen(false)
                }}
                className="w-full px-4 py-2 text-left text-sm text-[#050505] hover:bg-[#F0F2F5] flex items-center gap-2"
              >
                {item.icon && (
                  <span className="w-4 h-4 text-[#65676B] flex-shrink-0">{item.icon}</span>
                )}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

export default ExportMenu
