import React from 'react'
import { useTranslation } from 'react-i18next'
import Select from '../ui/Select'
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('builder.linearScale.min')}</label>
          <Select
            value={config.min}
            onChange={(e) => update({ min: Number(e.target.value) })}
            className="text-sm py-1.5"
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('builder.linearScale.max')}</label>
          <Select
            value={config.max}
            onChange={(e) => update({ max: Number(e.target.value) })}
            className="text-sm py-1.5"
          >
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
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
