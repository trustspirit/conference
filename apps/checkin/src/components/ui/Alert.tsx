import React from 'react'

type AlertVariant = 'success' | 'error' | 'warning' | 'info'

interface AlertProps {
  children: React.ReactNode
  variant?: AlertVariant
  title?: string
  className?: string
}

const variantClasses: Record<AlertVariant, string> = {
  success: 'bg-[#EFFFF6] border-[#31A24C] text-[#31A24C]',
  error: 'bg-[#FFEBEE] border-[#FA383E] text-[#FA383E]',
  warning: 'bg-[#FFF8E1] border-[#F9A825] text-[#F9A825]',
  info: 'bg-[#E7F3FF] border-[#1877F2] text-[#1877F2]'
}

function Alert({
  children,
  variant = 'info',
  title,
  className = ''
}: AlertProps): React.ReactElement {
  return (
    <div className={`p-4 rounded-md border ${variantClasses[variant]} ${className}`}>
      {title && <p className="font-bold mb-1">{title}</p>}
      <div className="font-medium">{children}</div>
    </div>
  )
}

export default Alert
