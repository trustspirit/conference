import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'trust-ui-react'
import type { SurveyField, ParticipantFieldKey } from '../../types'
import { createEmptyField, generateFieldId } from '../../services/surveyDefaults'
import FieldEditor from './FieldEditor'
import SurveyBuilderHeader from './SurveyBuilderHeader'

interface SurveyBuilderProps {
  title: string
  description: string
  fields: SurveyField[]
  onTitleChange: (title: string) => void
  onDescriptionChange: (description: string) => void
  onFieldsChange: (fields: SurveyField[]) => void
}

function SurveyBuilder({
  title,
  description,
  fields,
  onTitleChange,
  onDescriptionChange,
  onFieldsChange,
}: SurveyBuilderProps): React.ReactElement {
  const { t } = useTranslation()
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const usedParticipantFields: ParticipantFieldKey[] = fields
    .filter((f) => f.participantField)
    .map((f) => f.participantField!)

  const hasChurchInfo = fields.some((f) => f.type === 'church_info')

  const handleFieldChange = useCallback(
    (index: number, updated: SurveyField) => {
      const next = [...fields]
      next[index] = updated
      onFieldsChange(next)
    },
    [fields, onFieldsChange]
  )

  const handleDeleteField = useCallback(
    (index: number) => {
      onFieldsChange(fields.filter((_, i) => i !== index))
    },
    [fields, onFieldsChange]
  )

  const addField = () => {
    onFieldsChange([...fields, createEmptyField()])
  }

  const addSection = () => {
    onFieldsChange([
      ...fields,
      { ...createEmptyField(), type: 'section', label: '' },
    ])
  }

  const addChurchInfo = () => {
    onFieldsChange([
      ...fields,
      {
        id: generateFieldId(),
        type: 'church_info',
        label: t('builder.fieldType.church_info'),
        required: false,
      },
    ])
  }

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    const next = [...fields]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(index, 0, moved)
    onFieldsChange(next)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="space-y-4">
      <SurveyBuilderHeader
        title={title}
        description={description}
        onTitleChange={onTitleChange}
        onDescriptionChange={onDescriptionChange}
      />

      {fields.map((field, index) => (
        <div
          key={field.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={() => handleDrop(index)}
          onDragEnd={handleDragEnd}
          className={`cursor-move transition-opacity ${
            dragIndex === index ? 'opacity-50' : ''
          } ${dragOverIndex === index && dragIndex !== index ? 'border-t-2 border-t-primary' : ''}`}
        >
          <FieldEditor
            field={field}
            onChange={(updated) => handleFieldChange(index, updated)}
            onDelete={() => handleDeleteField(index)}
            usedParticipantFields={usedParticipantFields}
          />
        </div>
      ))}

      <div className="flex flex-wrap gap-3 justify-center py-4">
        <Button variant="outline" size="md" onClick={addField}>
          + {t('builder.addField')}
        </Button>
        <Button variant="outline" size="md" onClick={addSection}>
          + {t('builder.addSection')}
        </Button>
        {!hasChurchInfo && (
          <Button variant="outline" size="md" onClick={addChurchInfo}>
            + {t('builder.addChurchInfo')}
          </Button>
        )}
      </div>
    </div>
  )
}

export default SurveyBuilder
