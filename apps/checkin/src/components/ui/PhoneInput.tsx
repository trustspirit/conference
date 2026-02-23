import React, { useCallback } from 'react'
import { formatPhoneNumber } from '../../utils/phoneFormat'

interface PhoneInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'type'
> {
  value: string
  onChange: (value: string) => void
}

function PhoneInput({ value, onChange, className, ...props }: PhoneInputProps): React.ReactElement {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneNumber(e.target.value)
      onChange(formatted)
    },
    [onChange]
  )

  return <input type="tel" value={value} onChange={handleChange} className={className} {...props} />
}

export default PhoneInput
