import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  required?: boolean
}

function Input({
  label,
  error,
  required,
  className = '',
  ...props
}: InputProps): React.ReactElement {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[#050505] mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-2 bg-[#F0F2F5] rounded-lg outline-none
          focus:ring-2 focus:ring-[#1877F2] placeholder-[#65676B]
          ${error ? 'ring-2 ring-[#FA383E]' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-[#FA383E]">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export function Select({
  label,
  error,
  required,
  className = '',
  children,
  ...props
}: SelectProps): React.ReactElement {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[#050505] mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        className={`
          w-full px-4 py-2 bg-[#F0F2F5] rounded-lg outline-none
          focus:ring-2 focus:ring-[#1877F2] text-[#050505]
          ${error ? 'ring-2 ring-[#FA383E]' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-sm text-[#FA383E]">{error}</p>}
    </div>
  )
}

interface SearchInputProps extends Omit<InputProps, 'type'> {
  onSearch?: (value: string) => void
}

export function SearchInput({ className = '', ...props }: SearchInputProps): React.ReactElement {
  return (
    <div className="relative">
      <Input type="text" className={`pl-10 ${className}`} {...props} />
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#65676B]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      </div>
    </div>
  )
}

export default Input
