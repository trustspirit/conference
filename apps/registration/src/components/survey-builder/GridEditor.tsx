import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'trust-ui-react'
import type { GridConfig } from '../../types'

interface GridEditorProps {
  config: GridConfig
  onChange: (config: GridConfig) => void
}

function GridEditor({ config, onChange }: GridEditorProps): React.ReactElement {
  const { t } = useTranslation()

  const updateRows = (index: number, value: string) => {
    const next = [...config.rows]
    next[index] = value
    onChange({ ...config, rows: next })
  }

  const updateColumns = (index: number, value: string) => {
    const next = [...config.columns]
    next[index] = value
    onChange({ ...config, columns: next })
  }

  const addRow = () => onChange({ ...config, rows: [...config.rows, ''] })
  const removeRow = (i: number) => onChange({ ...config, rows: config.rows.filter((_, idx) => idx !== i) })
  const addColumn = () => onChange({ ...config, columns: [...config.columns, ''] })
  const removeColumn = (i: number) => onChange({ ...config, columns: config.columns.filter((_, idx) => idx !== i) })

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">{t('builder.grid.rows')}</label>
        {config.rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <input
              value={row}
              onChange={(e) => updateRows(i, e.target.value)}
              placeholder={t('builder.grid.rowPlaceholder', { n: i + 1 })}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150"
            />
            {config.rows.length > 1 && (
              <button type="button" onClick={() => removeRow(i)} className="text-gray-400 hover:text-red-500 text-lg leading-none">x</button>
            )}
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addRow} className="p-0">
          + {t('builder.grid.addRow')}
        </Button>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">{t('builder.grid.columns')}</label>
        {config.columns.map((col, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <input
              value={col}
              onChange={(e) => updateColumns(i, e.target.value)}
              placeholder={t('builder.grid.colPlaceholder', { n: i + 1 })}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150"
            />
            {config.columns.length > 1 && (
              <button type="button" onClick={() => removeColumn(i)} className="text-gray-400 hover:text-red-500 text-lg leading-none">x</button>
            )}
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addColumn} className="p-0">
          + {t('builder.grid.addColumn')}
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={config.allowMultiple}
          onChange={(e) => onChange({ ...config, allowMultiple: e.target.checked })}
          className="rounded"
        />
        {t('builder.grid.allowMultiple')}
      </label>
    </div>
  )
}

export default GridEditor
