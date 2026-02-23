import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
}

function Card({ children, className = '', padding = 'md' }: CardProps): React.ReactElement {
  return (
    <div
      className={`bg-white rounded-lg border border-[#DADDE1] shadow-sm ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  description?: string
}

export function CardHeader({ title, description }: CardHeaderProps): React.ReactElement {
  return (
    <div className="mb-6 pb-4 border-b border-[#DADDE1]">
      <h2 className="text-lg font-bold text-[#050505]">{title}</h2>
      {description && <p className="text-[#65676B] text-sm mt-1">{description}</p>}
    </div>
  )
}

export default Card
