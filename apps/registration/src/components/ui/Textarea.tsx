import React from 'react'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

function Textarea({ className = '', ...props }: TextareaProps): React.ReactElement {
  return (
    <textarea
      className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150 ${className}`}
      {...props}
    />
  )
}

export default Textarea
