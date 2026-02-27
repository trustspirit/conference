import { InputHTMLAttributes, forwardRef } from 'react'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>

const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <input
    ref={ref}
    {...props}
    style={{
      width: '100%',
      borderRadius: '0.5rem',
      border: '1px solid #d1d5db',
      padding: '0.5rem 0.75rem',
      fontSize: '0.875rem',
      lineHeight: '1.25rem',
      outline: 'none',
      transition: 'border-color 0.15s',
      backgroundColor: props.disabled ? '#f3f4f6' : undefined,
      ...props.style,
    }}
    onFocus={(e) => {
      e.target.style.borderColor = '#3b82f6'
      props.onFocus?.(e)
    }}
    onBlur={(e) => {
      e.target.style.borderColor = '#d1d5db'
      props.onBlur?.(e)
    }}
  />
))

Input.displayName = 'Input'
export default Input
