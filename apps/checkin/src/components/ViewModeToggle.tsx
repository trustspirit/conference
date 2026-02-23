import React from 'react'
import { ViewMode } from '../types'

interface ViewModeToggleProps {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}

function ViewModeToggle({ mode, onChange }: ViewModeToggleProps): React.ReactElement {
  return (
    <div className="flex bg-[#F0F2F5] rounded-lg p-1">
      <button
        onClick={() => onChange(ViewMode.List)}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          mode === ViewMode.List
            ? 'bg-white text-[#050505] shadow-sm'
            : 'text-[#65676B] hover:text-[#050505]'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      <button
        onClick={() => onChange(ViewMode.Grid)}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          mode === ViewMode.Grid
            ? 'bg-white text-[#050505] shadow-sm'
            : 'text-[#65676B] hover:text-[#050505]'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      </button>
    </div>
  )
}

export default ViewModeToggle
