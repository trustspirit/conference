import { LabelHTMLAttributes } from 'react'

type LabelProps = Omit<LabelHTMLAttributes<HTMLLabelElement>, 'className'>

export default function Label(props: LabelProps) {
  return (
    <label
      {...props}
      style={{
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: '#374151',
        marginBottom: '0.25rem',
        ...props.style,
      }}
    />
  )
}
