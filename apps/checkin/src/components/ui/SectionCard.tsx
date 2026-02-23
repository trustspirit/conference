import React from 'react'

export interface SectionCardProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
  noPadding?: boolean
}

const variantStyles = {
  default: 'bg-white border-[#DADDE1]',
  success: 'bg-[#EFFFF6] border-[#31A24C]/30',
  warning: 'bg-[#FFF8E1] border-[#FFECB3]',
  danger: 'bg-[#FFEBEE] border-[#FA383E]/30'
}

function SectionCard({
  title,
  description,
  children,
  className = '',
  actions,
  variant = 'default',
  noPadding = false
}: SectionCardProps): React.ReactElement {
  return (
    <div className={`rounded-lg border shadow-sm ${variantStyles[variant]} ${className}`}>
      {(title || description || actions) && (
        <div className="flex items-start justify-between p-6 pb-0">
          <div>
            {title && <h2 className="text-lg font-bold text-[#050505]">{title}</h2>}
            {description && <p className="text-sm text-[#65676B] mt-1">{description}</p>}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  )
}

export default SectionCard
