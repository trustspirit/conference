import React from 'react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4'
}

function Spinner({ size = 'md', className = '' }: SpinnerProps): React.ReactElement {
  return (
    <div
      className={`${sizeClasses[size]} border-[#DADDE1] border-t-[#1877F2] rounded-full animate-spin ${className}`}
    />
  )
}

export function SpinnerFullPage(): React.ReactElement {
  return (
    <div className="flex justify-center items-center py-16">
      <Spinner size="md" />
    </div>
  )
}

export default Spinner
