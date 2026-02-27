interface Tab {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (id: string) => void
}

export default function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '0.25rem',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '1rem',
        overflowX: 'auto',
      }}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#2563eb' : '#6b7280',
              borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              border: 'none',
              borderBottomWidth: '2px',
              borderBottomStyle: 'solid',
              borderBottomColor: isActive ? '#2563eb' : 'transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '9999px',
                  padding: '0 0.375rem',
                  minWidth: '1.25rem',
                  textAlign: 'center',
                  backgroundColor: isActive ? '#dbeafe' : '#f3f4f6',
                  color: isActive ? '#1d4ed8' : '#6b7280',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
