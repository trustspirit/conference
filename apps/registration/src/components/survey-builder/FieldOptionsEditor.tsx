import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'trust-ui-react'

interface FieldOptionsEditorProps {
  options: string[]
  onChange: (options: string[]) => void
}

function FieldOptionsEditor({ options, onChange }: FieldOptionsEditorProps): React.ReactElement {
  const { t } = useTranslation()

  const handleOptionChange = (index: number, value: string) => {
    const next = [...options]
    next[index] = value
    onChange(next)
  }

  const addOption = () => {
    onChange([...options, ''])
  }

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-600 mb-1">{t('builder.options')}</label>
      {options.map((opt, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-sm text-gray-400 w-5">{index + 1}.</span>
          <input
            value={opt}
            onChange={(e) => handleOptionChange(index, e.target.value)}
            placeholder={t('builder.optionPlaceholder', { n: index + 1 })}
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150"
          />
          {options.length > 1 && (
            <button
              type="button"
              onClick={() => removeOption(index)}
              className="text-gray-400 hover:text-red-500 text-lg leading-none"
            >
              x
            </button>
          )}
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={addOption} className="p-0">
        + {t('builder.addOption')}
      </Button>
    </div>
  )
}

export default FieldOptionsEditor
