import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Label } from '../ui'
import type { SurveyField } from '../../types'
import DynamicFieldRenderer from './DynamicFieldRenderer'

interface DynamicFormProps {
  fields: SurveyField[]
  initialData?: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  isLoading: boolean
  submitLabel: string
}

interface SectionGroup {
  section?: SurveyField
  fields: SurveyField[]
}

/** Split fields by section boundaries */
function splitBySections(fields: SurveyField[]): SectionGroup[] {
  const groups: SectionGroup[] = []
  let current: SectionGroup = { fields: [] }

  for (const field of fields) {
    if (field.type === 'section') {
      if (current.fields.length > 0 || current.section) groups.push(current)
      current = { section: field, fields: [] }
    } else {
      current.fields.push(field)
    }
  }
  if (current.fields.length > 0 || current.section) groups.push(current)
  return groups
}

/** Split fields into rows: consecutive fields with same group → one row */
function splitIntoRows(fields: SurveyField[]): SurveyField[][] {
  const rows: SurveyField[][] = []
  let i = 0
  while (i < fields.length) {
    const field = fields[i]
    if (field.group) {
      // Collect all consecutive fields with same group
      const row: SurveyField[] = [field]
      while (i + 1 < fields.length && fields[i + 1].group === field.group) {
        i++
        row.push(fields[i])
      }
      rows.push(row)
    } else {
      rows.push([field])
    }
    i++
  }
  return rows
}

function renderField(
  field: SurveyField,
  formData: Record<string, unknown>,
  onChange: (fieldId: string, value: unknown) => void,
  colCount: number,
) {
  return (
    <div
      key={field.id}
      className={colCount === -1 ? 'flex-1 min-w-0' : colCount > 1 ? 'flex-1 basis-[180px] min-w-0' : 'w-full'}
    >
      <Label className="text-[13px] text-gray-600 font-semibold uppercase tracking-wide mb-2">
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {field.description && (
        <p className="text-xs text-gray-400 mb-2 normal-case tracking-normal font-normal">{field.description}</p>
      )}
      <DynamicFieldRenderer
        field={field}
        value={formData[field.id]}
        onChange={(value) => onChange(field.id, value)}
        formData={formData}
      />
    </div>
  )
}

function DynamicForm({ fields, initialData, onSubmit, isLoading, submitLabel }: DynamicFormProps): React.ReactElement {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const data: Record<string, unknown> = {}
    for (const field of fields) {
      data[field.id] = initialData?.[field.id] ?? (field.type === 'checkbox' ? [] : '')
    }
    return data
  })

  const dependentFieldsMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const f of fields) {
      if (f.dependsOn) {
        if (!map[f.dependsOn]) map[f.dependsOn] = []
        map[f.dependsOn].push(f.id)
      }
    }
    return map
  }, [fields])

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData((prev) => {
      const next = { ...prev, [fieldId]: value }
      const deps = dependentFieldsMap[fieldId]
      if (deps) {
        for (const depId of deps) next[depId] = ''
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const isValid = useMemo(() =>
    fields
      .filter((f) => f.required && f.type !== 'section')
      .every((f) => {
        const val = formData[f.id]
        if (Array.isArray(val)) return val.length > 0
        if (typeof val === 'object' && val !== null) return Object.keys(val).length > 0
        return val !== '' && val !== undefined && val !== null
      }),
    [fields, formData]
  )

  const sections = useMemo(() => splitBySections(fields), [fields])

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-b-xl sm:rounded-xl border border-gray-200 overflow-hidden">
      {sections.map((section, si) => {
        const rows = splitIntoRows(section.fields)
        return (
          <div key={section.section?.id || `section-${si}`}>
            {si > 0 && <hr className="border-gray-200 mx-8" />}

            {section.section && (
              <div className="px-8 pt-6 pb-1">
                {section.section.label && (
                  <h3 className="text-[15px] font-semibold text-gray-900 uppercase tracking-wide">{section.section.label}</h3>
                )}
                {section.section.description && (
                  <p className="text-sm text-gray-500 mt-1">{section.section.description}</p>
                )}
              </div>
            )}

            {rows.length > 0 && (
              <div className="px-8 py-5 space-y-5">
                {rows.map((row, ri) => (
                  <div
                    key={row.map((f) => f.id).join('-')}
                    className={row.length > 1 ? 'flex flex-wrap gap-x-6 gap-y-4' : ''}
                  >
                    {row.length >= 3 ? (
                      <>
                        {renderField(row[0], formData, handleFieldChange, 2)}
                        <div className="flex-1 basis-[180px] min-w-0 flex gap-4">
                          {row.slice(1).map((field) => renderField(field, formData, handleFieldChange, -1))}
                        </div>
                      </>
                    ) : (
                      row.map((field) => renderField(field, formData, handleFieldChange, row.length))
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <div className="px-8 pb-8 pt-2">
        <Button type="submit" size="lg" disabled={isLoading || !isValid}>
          {isLoading ? t('register.submitting') : submitLabel}
        </Button>
      </div>
    </form>
  )
}

export default DynamicForm
