import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input } from '../ui'
import type { SurveyField, FieldType, ParticipantFieldKey } from '../../types'
import FieldTypeSelector from './FieldTypeSelector'
import FieldOptionsEditor from './FieldOptionsEditor'
import LinearScaleEditor from './LinearScaleEditor'
import GridEditor from './GridEditor'
import ParticipantFieldPicker from './ParticipantFieldPicker'

interface FieldEditorProps {
  field: SurveyField
  onChange: (field: SurveyField) => void
  onDelete: () => void
  usedParticipantFields: ParticipantFieldKey[]
}

function FieldEditor({ field, onChange, onDelete, usedParticipantFields }: FieldEditorProps): React.ReactElement {
  const { t } = useTranslation()
  const [showSettings, setShowSettings] = useState(false)

  const update = (patch: Partial<SurveyField>) => {
    onChange({ ...field, ...patch })
  }

  const handleTypeChange = (type: FieldType) => {
    const patch: Partial<SurveyField> = { type }
    if (type === 'radio' || type === 'checkbox' || type === 'dropdown') {
      if (!field.options || field.options.length === 0) patch.options = ['']
    }
    if (type === 'linear_scale' && !field.linearScale) patch.linearScale = { min: 1, max: 5 }
    if (type === 'grid' && !field.grid) patch.grid = { rows: [''], columns: [''], allowMultiple: false }
    update(patch)
  }

  const isSection = field.type === 'section'
  const isChurchInfo = field.type === 'church_info'
  const hasOptions = field.type === 'radio' || field.type === 'checkbox' || field.type === 'dropdown'

  // Church info — locked card, only draggable
  if (isChurchInfo) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-primary/40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
            <span className="text-sm font-semibold text-gray-700">{t('builder.fieldType.church_info')}</span>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {t('builder.churchInfoLocked')}
            </span>
          </div>
          <Button variant="danger" size="sm" onClick={onDelete}>{t('common.delete')}</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow border-l-4 border-l-transparent focus-within:border-l-primary">
      {/* Main row */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Input
            value={field.label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder={isSection ? t('builder.sectionTitlePlaceholder') : t('builder.labelPlaceholder')}
            className="flex-1 font-medium"
          />
          <FieldTypeSelector value={field.type} onChange={handleTypeChange} />
        </div>

        <Input
          value={field.description || ''}
          onChange={(e) => update({ description: e.target.value })}
          placeholder={t('builder.descriptionPlaceholder')}
          className="border-gray-200 text-sm text-gray-600"
        />

        {hasOptions && (
          <FieldOptionsEditor options={field.options || ['']} onChange={(options) => update({ options })} />
        )}
        {field.type === 'linear_scale' && field.linearScale && (
          <LinearScaleEditor config={field.linearScale} onChange={(linearScale) => update({ linearScale })} />
        )}
        {field.type === 'grid' && field.grid && (
          <GridEditor config={field.grid} onChange={(grid) => update({ grid })} />
        )}
      </div>

      {/* Footer toolbar */}
      <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-2">
        {!isSection && (
          <>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => update({ required: e.target.checked })}
                className="rounded w-3.5 h-3.5"
              />
              {t('builder.required')}
            </label>
            <span className="w-px h-4 bg-gray-200" />
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`text-xs px-2 py-1 rounded transition-colors ${showSettings ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
            >
              ⚙
            </button>
          </>
        )}
        <div className="ml-auto">
          <Button variant="danger" size="sm" onClick={onDelete}>{t('common.delete')}</Button>
        </div>
      </div>

      {/* Expandable settings */}
      {showSettings && !isSection && (
        <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/50 flex flex-wrap items-center gap-4 text-xs">
          {field.type === 'short_text' && (
            <label className="flex items-center gap-1.5 text-gray-600">
              {t('builder.inputFormat')}
              <select
                value={field.inputType || 'text'}
                onChange={(e) => update({ inputType: e.target.value as SurveyField['inputType'] })}
                className="px-2 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:border-primary"
              >
                <option value="text">{t('builder.inputFormatText')}</option>
                <option value="number">{t('builder.inputFormatNumber')}</option>
                <option value="email">{t('builder.inputFormatEmail')}</option>
                <option value="tel">{t('builder.inputFormatTel')}</option>
              </select>
            </label>
          )}
          <label className="flex items-center gap-1.5 text-gray-600">
            {t('builder.group')}
            <input
              value={field.group || ''}
              onChange={(e) => update({ group: e.target.value || undefined })}
              placeholder={t('builder.groupPlaceholder')}
              className="w-20 px-2 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:border-primary"
            />
          </label>
          <ParticipantFieldPicker
            value={field.participantField}
            onChange={(participantField) => update({ participantField })}
            usedFields={usedParticipantFields}
          />
        </div>
      )}
    </div>
  )
}

export default FieldEditor
