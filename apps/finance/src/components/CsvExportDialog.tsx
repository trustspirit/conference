import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Button } from 'trust-ui-react'

interface Props {
  open: boolean
  onClose: () => void
  defaultColumns: readonly string[]
  optionalColumns: readonly string[]
  getColumnLabel: (key: string) => string
  onExport: (selectedOptionals: Set<string>) => void
  isExporting: boolean
  exportMode?: 'byRequest' | 'byBudgetCode'
  onExportModeChange?: (mode: 'byRequest' | 'byBudgetCode') => void
}

export default function CsvExportDialog({
  open,
  onClose,
  defaultColumns,
  optionalColumns,
  getColumnLabel,
  onExport,
  isExporting,
  exportMode,
  onExportModeChange
}: Props) {
  const { t } = useTranslation()
  const [selectedOptionals, setSelectedOptionals] = useState<Set<string>>(new Set())

  const toggleOptional = (key: string) => {
    setSelectedOptionals((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <Dialog open={open} onClose={onClose} size="sm">
      <Dialog.Title onClose={onClose}>{t('common.exportColumns')}</Dialog.Title>
      <Dialog.Content>
        {exportMode !== undefined && onExportModeChange && (
          <div className="mb-4">
            <div className="flex gap-4">
              {(['byRequest', 'byBudgetCode'] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="exportMode"
                    value={mode}
                    checked={exportMode === mode}
                    onChange={() => onExportModeChange(mode)}
                    className="finance-radio"
                  />
                  {t(`common.export${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">{t('common.defaultColumns')}</p>
          <div className="flex flex-wrap gap-2">
            {defaultColumns.map((key) => (
              <span
                key={key}
                className="px-2.5 py-1 bg-finance-primary-surface text-finance-primary rounded text-sm"
              >
                {getColumnLabel(key)}
              </span>
            ))}
          </div>
        </div>
        {optionalColumns.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">{t('common.optionalColumns')}</p>
            <div className="flex flex-wrap gap-2">
              {optionalColumns.map((key) => (
                <button
                  key={key}
                  onClick={() => toggleOptional(key)}
                  className={`px-2.5 py-1 rounded text-sm border transition-colors ${
                    selectedOptionals.has(key) ? 'finance-chip-selected' : 'finance-chip'
                  }`}
                >
                  {selectedOptionals.has(key) ? '✓ ' : ''}
                  {getColumnLabel(key)}
                </button>
              ))}
            </div>
          </div>
        )}
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="outline" className="finance-secondary-button" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          className="finance-primary-button"
          onClick={() => onExport(selectedOptionals)}
          disabled={isExporting}
        >
          {isExporting ? t('common.exporting') : t('common.exportCsv')}
        </Button>
      </Dialog.Actions>
    </Dialog>
  )
}
