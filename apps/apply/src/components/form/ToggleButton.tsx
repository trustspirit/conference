import { useTranslation } from 'react-i18next'

interface ToggleButtonProps {
  value: boolean
  onChange: (value: boolean) => void
  labelYes?: string
  labelNo?: string
  disabled?: boolean
}

export default function ToggleButton({
  value,
  onChange,
  labelYes,
  labelNo,
  disabled = false,
}: ToggleButtonProps) {
  const { t } = useTranslation()
  const yesLabel = labelYes || t('common.yes', 'Yes')
  const noLabel = labelNo || t('common.no', 'No')

  return (
    <div style={{ display: 'inline-flex', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #d1d5db' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        style={{
          padding: '0.375rem 0.75rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: value ? '#2563eb' : '#fff',
          color: value ? '#fff' : '#6b7280',
          transition: 'background-color 0.15s, color 0.15s',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {yesLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        style={{
          padding: '0.375rem 0.75rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          border: 'none',
          borderLeft: '1px solid #d1d5db',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: !value ? '#2563eb' : '#fff',
          color: !value ? '#fff' : '#6b7280',
          transition: 'background-color 0.15s, color 0.15s',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {noLabel}
      </button>
    </div>
  )
}
