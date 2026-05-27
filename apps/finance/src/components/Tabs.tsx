import { type ReactNode } from 'react'

export interface TabDef<K extends string> {
  key: K
  label: ReactNode
}

interface TabsProps<K extends string> {
  tabs: TabDef<K>[]
  active: K
  onChange: (key: K) => void
  className?: string
}

export default function Tabs<K extends string>({
  tabs, active, onChange, className = '',
}: TabsProps<K>) {
  if (tabs.length <= 1) return null
  return (
    <div
      role="tablist"
      aria-label="dashboard tabs"
      className={`border-b border-finance-border px-2 flex gap-1 overflow-x-auto ${className}`}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
              e.preventDefault()
              const idx = tabs.findIndex((t) => t.key === active)
              const next = e.key === 'ArrowRight'
                ? (idx + 1) % tabs.length
                : (idx - 1 + tabs.length) % tabs.length
              onChange(tabs[next].key)
            }}
            className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
              selected
                ? 'border-finance-primary text-finance-primary font-semibold'
                : 'border-transparent text-finance-muted hover:text-finance-primary'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
