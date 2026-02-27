import { InputHTMLAttributes, forwardRef } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  label?: string
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, id, ...props }, ref) => (
  <label
    htmlFor={id}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.875rem',
      color: '#374151',
      cursor: props.disabled ? 'default' : 'pointer',
    }}
  >
    <input
      ref={ref}
      type="checkbox"
      id={id}
      {...props}
      style={{
        width: '1rem',
        height: '1rem',
        accentColor: '#3b82f6',
        ...props.style,
      }}
    />
    {label}
  </label>
))

Checkbox.displayName = 'Checkbox'
export default Checkbox
