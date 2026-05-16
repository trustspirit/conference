import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

type ActionItem = {
  label: string
  to?: string
  onClick?: () => void
  variant?: 'primary'
  disabled?: boolean
}

interface Props {
  title: string
  description?: string
  backTo?: string
  backLabel?: string
  action?: ActionItem
  actions?: ActionItem[]
}

function ActionButton({ action }: { action: ActionItem }) {
  const btnClass = 'finance-primary-button'

  if (action.to) {
    return (
      <Link
        to={action.to}
        className={`${btnClass} block w-full px-4 py-2 rounded text-sm font-semibold text-center whitespace-nowrap transition-colors sm:w-auto`}
      >
        {action.label}
      </Link>
    )
  }
  return (
    <button
      onClick={action.onClick}
      disabled={action.disabled}
      className={`${btnClass} w-full px-4 py-2 rounded text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed sm:w-auto`}
    >
      {action.label}
    </button>
  )
}

export default function PageHeader({
  title,
  description,
  backTo,
  backLabel,
  action,
  actions
}: Props) {
  const { t } = useTranslation()
  const allActions = actions ?? (action ? [action] : [])

  return (
    <div className="mb-6">
      {backTo && (
        <Link to={backTo} className="text-sm text-finance-muted hover:text-finance-primary mb-2 inline-block">
          ← {backLabel || t('common.back')}
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-finance-primary">{title}</h2>
          {description && <p className="text-sm text-finance-muted mt-1">{description}</p>}
        </div>
        {allActions.length > 0 && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {allActions.map((a, i) => (
              <ActionButton key={i} action={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
