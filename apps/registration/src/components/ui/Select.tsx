import React from 'react'

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

function Select({ className = '', children, ...props }: SelectProps): React.ReactElement {
  return (
    <div className="relative">
      <select
        {...props}
        className={`appearance-none w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150 ${className}`}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
        <svg className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  )
}

export default Select
