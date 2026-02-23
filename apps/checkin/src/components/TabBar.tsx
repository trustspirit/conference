import React from 'react'

interface Tab<T extends string> {
  id: T
  label: string
  count?: number
}

interface TabBarProps<T extends string> {
  tabs: Tab<T>[]
  activeTab: T
  onChange: (tab: T) => void
}

function TabBar<T extends string>({
  tabs,
  activeTab,
  onChange
}: TabBarProps<T>): React.ReactElement {
  return (
    <div className="flex border-b border-[#DADDE1] mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative px-4 py-3 font-medium text-[15px] transition-colors ${
            activeTab === tab.id
              ? 'text-[#1877F2] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-[#1877F2] after:rounded-t-sm'
              : 'text-[#65676B] hover:bg-[#F2F2F2] rounded-t-lg'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && ` (${tab.count})`}
        </button>
      ))}
    </div>
  )
}

export default TabBar
