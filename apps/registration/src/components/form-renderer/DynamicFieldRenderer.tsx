import React from 'react'
import { Input, Textarea, Select } from '../ui'
import type { SurveyField } from '../../types'
import LinearScaleInput from './LinearScaleInput'
import GridInput from './GridInput'
import ChurchInfoInput from './ChurchInfoInput'

interface DynamicFieldRendererProps {
  field: SurveyField
  value: unknown
  onChange: (value: unknown) => void
  formData?: Record<string, unknown>
}

function resolveOptions(field: SurveyField, formData?: Record<string, unknown>): string[] {
  if (field.dependsOn && field.conditionalOptions && formData) {
    const parentValue = formData[field.dependsOn] as string | undefined
    if (parentValue) return field.conditionalOptions[parentValue] || []
    return []
  }
  return field.options || []
}

/** Format phone number as 010-1234-5678 */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function DynamicFieldRenderer({ field, value, onChange, formData }: DynamicFieldRendererProps): React.ReactElement {
  const inputType = field.inputType || 'text'

  switch (field.type) {
    case 'short_text': {
      // Tel — auto-format
      if (inputType === 'tel') {
        return (
          <Input
            type="tel"
            inputMode="numeric"
            value={(value as string) || ''}
            onChange={(e) => onChange(formatPhone(e.target.value))}
            placeholder="010-0000-0000"
            required={field.required}
          />
        )
      }

      // Email — pattern validation
      if (inputType === 'email') {
        return (
          <Input
            type="email"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="email@example.com"
            required={field.required}
          />
        )
      }

      // Number
      if (inputType === 'number') {
        return (
          <Input
            type="number"
            inputMode="numeric"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
        )
      }

      // Default text
      return (
        <Input
          type="text"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      )
    }

    case 'long_text':
      return (
        <Textarea
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          rows={4}
        />
      )

    case 'radio':
      return (
        <div className="space-y-1.5">
          {resolveOptions(field, formData).map((opt, idx) => (
            <label key={`${field.id}_${idx}`} className="flex items-center gap-3 py-1.5 cursor-pointer group">
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-gray-700 text-sm group-hover:text-gray-900">{opt}</span>
            </label>
          ))}
        </div>
      )

    case 'checkbox':
      return (
        <div className="space-y-1.5">
          {resolveOptions(field, formData).map((opt, idx) => {
            const checked = Array.isArray(value) && value.includes(opt)
            return (
              <label key={`${field.id}_${idx}`} className="flex items-center gap-3 py-1.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const arr = Array.isArray(value) ? [...value] : []
                    if (checked) onChange(arr.filter((v) => v !== opt))
                    else onChange([...arr, opt])
                  }}
                  className="w-4 h-4 accent-primary rounded"
                />
                <span className="text-gray-700 text-sm group-hover:text-gray-900">{opt}</span>
              </label>
            )
          })}
        </div>
      )

    case 'dropdown': {
      const opts = resolveOptions(field, formData)
      const disabled = field.dependsOn && opts.length === 0
      return (
        <Select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          disabled={!!disabled}
        >
          <option value="">{''}</option>
          {opts.map((opt, idx) => (
            <option key={`${field.id}_${idx}`} value={opt}>{opt}</option>
          ))}
        </Select>
      )
    }

    case 'church_info':
      return (
        <ChurchInfoInput
          value={(value as { stake: string; ward: string }) || { stake: '', ward: '' }}
          onChange={onChange}
          required={field.required}
        />
      )

    case 'linear_scale':
      if (!field.linearScale) return <p className="text-sm text-red-500">Linear scale configuration is missing.</p>
      return <LinearScaleInput config={field.linearScale} value={value as number | undefined} onChange={onChange} />

    case 'grid':
      if (!field.grid) return <p className="text-sm text-red-500">Grid configuration is missing.</p>
      return <GridInput config={field.grid} value={(value as Record<string, string | string[]>) || {}} onChange={onChange} />

    case 'date':
      return <Input type="date" value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} required={field.required} />

    case 'time':
      return <Input type="time" value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} required={field.required} />

    case 'section':
      return <></>

    default:
      return <></>
  }
}

export default DynamicFieldRenderer
