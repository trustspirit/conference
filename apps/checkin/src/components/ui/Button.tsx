import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  fullWidth?: boolean
  children: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[#1877F2] text-white hover:bg-[#166FE5] shadow-sm',
  secondary: 'bg-[#E4E6EB] text-[#050505] hover:bg-[#D8DADF]',
  danger: 'bg-[#FA383E] text-white hover:bg-[#D32F2F] shadow-sm',
  ghost: 'bg-transparent text-[#1877F2] hover:bg-[#F0F2F5]'
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg'
}

function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps): React.ReactElement {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}

export function IconButton({
  children,
  className = '',
  isActive = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean }): React.ReactElement {
  return (
    <button
      className={`
        w-10 h-10 flex items-center justify-center rounded-full transition-colors
        ${isActive ? 'bg-[#E7F3FF] text-[#1877F2]' : 'bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#050505]'}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
