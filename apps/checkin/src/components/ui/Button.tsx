import React from 'react'
import { Button as TrustButton } from 'trust-ui-react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  fullWidth?: boolean
  children: React.ReactNode
}

const variantMap: Record<ButtonVariant, 'primary' | 'secondary' | 'danger' | 'ghost'> = {
  primary: 'primary',
  secondary: 'secondary',
  danger: 'danger',
  ghost: 'ghost'
}

function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps): React.ReactElement {
  return (
    <TrustButton
      variant={variantMap[variant]}
      size={size}
      loading={isLoading}
      fullWidth={fullWidth}
      disabled={disabled}
      className={className}
      {...props}
    >
      {children}
    </TrustButton>
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
