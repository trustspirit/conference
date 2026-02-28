import React, { useCallback } from 'react'
import { TextField } from 'trust-ui-react'
import { formatPhoneNumber } from '../../utils/phoneFormat'

interface PhoneInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'type' | 'size'
> {
  value: string
  onChange: (value: string) => void
  label?: string
  error?: string
}

function PhoneInput({ value, onChange, label, error, className, ...props }: PhoneInputProps): React.ReactElement {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneNumber(e.target.value)
      onChange(formatted)
    },
    [onChange]
  )

  return (
    <TextField
      type="tel"
      value={value}
      onChange={handleChange}
      label={label}
      error={!!error}
      errorMessage={error}
      className={className}
      placeholder={props.placeholder}
      disabled={props.disabled}
      name={props.name}
      id={props.id}
    />
  )
}

export default PhoneInput
