import React from 'react'
import { useTranslation } from 'react-i18next'
import { Select } from 'trust-ui-react'
import type { LinearScaleConfig } from '../../types'

interface LinearScaleEditorProps {
  config: LinearScaleConfig
  onChange: (config: LinearScaleConfig) => void
}

function LinearScaleEditor({ config, onChange }: LinearScaleEditorProps): React.ReactElement {
  const { t } = useTranslation()

  const update = (patch: Partial<LinearScaleConfig>) => {
    onChange({ ...config, ...patch })
  }

  const minOptions = [
    { value: '0', label: '0' },
    { value: '1', label: '1' },
  ]

  const maxOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
    value: String(n),
    label: String(n),
  }))

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('builder.linearScale.min')}</label>
          <Select
            options={minOptions}
            value={String(config.min)}
            onChange={(v) => update({ min: Number(v) })}
            size="sm"
            fullWidth
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('builder.linearScale.max')}</label>
          <Select
            options={maxOptions}
            value={String(config.max)}
            onChange={(v) => update({ max: Number(v) })}
            size="sm"
            fullWidth
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('builder.linearScale.minLabel')}</label>
          <input
            value={config.minLabel || ''}
            onChange={(e) => update({ minLabel: e.target.value })}
            placeholder={t('builder.linearScale.labelPlaceholder')}
            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('builder.linearScale.maxLabel')}</label>
          <input
            value={config.maxLabel || ''}
            onChange={(e) => update({ maxLabel: e.target.value })}
            placeholder={t('builder.linearScale.labelPlaceholder')}
            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150"
          />
        </div>
      </div>
    </div>
  )
}

export default LinearScaleEditor
