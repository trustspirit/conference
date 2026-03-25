import { useTranslation } from 'react-i18next'

interface Props {
  addRow: () => void
  cancelEditing: () => void
  saveEdits: () => void
  editSearch: string
  onEditSearchChange: (value: string) => void
  matchCount: number
}

export function EditModeBar({
  addRow,
  cancelEditing,
  saveEdits,
  editSearch,
  onEditSearchChange,
  matchCount
}: Props) {
  const { t } = useTranslation()

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg bg-blue-50 p-3">
      <span className="text-sm font-medium text-blue-800">{t('items.editing')}</span>
      <div className="relative flex-1 sm:max-w-xs">
        <svg
          className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"
          />
        </svg>
        <input
          type="text"
          value={editSearch}
          onChange={(e) => onEditSearchChange(e.target.value)}
          placeholder={t('items.search')}
          className="w-full rounded-md border border-blue-200 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {editSearch && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-blue-500">
            {matchCount}
          </span>
        )}
      </div>
      <div className="ml-auto flex gap-2">
        <button
          onClick={addRow}
          className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
        >
          + {t('items.addRow')}
        </button>
        <button
          onClick={cancelEditing}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t('items.cancel')}
        </button>
        <button
          onClick={saveEdits}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('items.save')}
        </button>
      </div>
    </div>
  )
}
