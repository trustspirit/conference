import { SelectHTMLAttributes, forwardRef } from 'react'

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'>

const Select = forwardRef<HTMLSelectElement, SelectProps>((props, ref) => (
  <select
    ref={ref}
    {...props}
    style={{
      width: '100%',
      borderRadius: '0.5rem',
      border: '1px solid #d1d5db',
      padding: '0.5rem 2rem 0.5rem 0.75rem',
      fontSize: '0.875rem',
      lineHeight: '1.25rem',
      outline: 'none',
      transition: 'border-color 0.15s',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 0.5rem center',
      backgroundSize: '1rem',
      backgroundColor: props.disabled ? '#f3f4f6' : '#fff',
      ...props.style,
    }}
    onFocus={(e) => {
      e.target.style.borderColor = '#3b82f6'
      e.target.style.outline = '2px solid #3b82f6'
      e.target.style.outlineOffset = '1px'
      props.onFocus?.(e)
    }}
    onBlur={(e) => {
      e.target.style.borderColor = '#d1d5db'
      e.target.style.outline = 'none'
      props.onBlur?.(e)
    }}
  />
))

Select.displayName = 'Select'
export default Select
