import React from 'react'

const variantStyles = {
  primary: 'bg-primary text-white font-semibold hover:bg-primary-hover disabled:opacity-50 focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 active:scale-[0.98]',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  danger: 'text-red-600 hover:bg-red-50',
  ghost: 'text-gray-600 hover:bg-gray-100',
  outline: 'bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 shadow-sm',
  link: 'text-primary hover:underline font-medium p-0',
} as const

const sizeStyles = {
  sm: 'px-3 py-1 text-sm rounded-lg',
  md: 'px-4 py-2 rounded-xl',
  lg: 'w-full py-3 rounded-xl',
} as const

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantStyles
  size?: keyof typeof sizeStyles
}

function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps): React.ReactElement {
  return (
    <button
      type={type}
      className={`${sizeStyles[size]} ${variantStyles[variant]} transition-all duration-150 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
