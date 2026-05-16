import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChecklistItem } from '../constants/reviewChecklist'

interface Props {
  items: ChecklistItem[]
  stage: 'review' | 'approval' | 'settlement' | 'submission'
  excludeKeys?: string[]
}

export default function ReviewChecklist({ items, stage, excludeKeys }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const titleColor =
    stage === 'submission'
      ? 'text-finance-primary'
      : stage === 'approval'
        ? 'text-finance-accent'
        : 'text-finance-warning'

  const bgColor =
    stage === 'submission'
      ? 'bg-finance-primary-surface/80 border-finance-border'
      : stage === 'approval'
        ? 'bg-finance-success-bg/80 border-finance-success-border'
        : 'bg-finance-warning-bg/80 border-finance-warning-border'

  const bulletColor =
    stage === 'submission'
      ? 'text-finance-selected-ring'
      : stage === 'approval'
        ? 'text-finance-accent'
        : 'text-finance-warning'

  const filteredItems = excludeKeys?.length
    ? items.filter((item) => !excludeKeys.includes(item.key))
    : items

  return (
    <>
      {/* Desktop: sticky sidebar card */}
      <div className={`hidden sm:block sticky top-20 w-56 rounded-lg border p-4 ${bgColor}`}>
        <h4 className={`text-xs font-semibold mb-3 flex items-center gap-1.5 ${titleColor}`}>
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {t('checklist.title')}
        </h4>
        <ul className="space-y-2">
          {filteredItems.map((item) => (
            <li
              key={item.key}
              className="flex items-start gap-1.5 text-xs text-finance-muted leading-relaxed"
            >
              <span className={`mt-0.5 ${bulletColor}`}>&#8226;</span>
              {t(`checklist.${item.key}`)}
            </li>
          ))}
        </ul>
      </div>

      {/* Mobile: collapsible banner */}
      <div className={`sm:hidden rounded-lg border ${bgColor}`}>
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium ${titleColor}`}
        >
          <span className="flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t('checklist.title')}
          </span>
          <span className="text-[10px]">
            {open ? t('checklist.collapse') : t('checklist.expand')}
          </span>
        </button>
        {open && (
          <ul className="px-3 pb-3 space-y-1.5">
            {filteredItems.map((item) => (
              <li
                key={item.key}
                className="flex items-start gap-1.5 text-xs text-finance-muted leading-relaxed"
              >
                <span className={`mt-0.5 ${bulletColor}`}>&#8226;</span>
                {t(`checklist.${item.key}`)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
