interface Props {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
  className?: string
}

export default function FormField({ label, required, hint, children, className = '' }: Props) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}
