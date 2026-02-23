import React from 'react'

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  size?: 'sm' | 'xs'
}

function Label({ size = 'sm', className = '', children, ...props }: LabelProps): React.ReactElement {
  const sizeClass = size === 'xs'
    ? 'text-xs font-medium text-gray-600'
    : 'text-sm font-medium text-gray-700'

  return (
    <label className={`block ${sizeClass} mb-1 ${className}`} {...props}>
      {children}
    </label>
  )
}

export default Label
