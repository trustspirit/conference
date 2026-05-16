import { Link } from 'react-router-dom'
import { DocumentIcon } from './Icons'

interface Props {
  title: string
  description?: string
  actionLabel?: string
  actionTo?: string
}

export default function EmptyState({ title, description, actionLabel, actionTo }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-finance-primary-surface rounded-full flex items-center justify-center mb-4">
        <DocumentIcon className="w-8 h-8 text-finance-primary" />
      </div>
      <p className="text-finance-text font-medium mb-1">{title}</p>
      {description && <p className="text-sm text-finance-muted mb-4">{description}</p>}
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="finance-primary-button px-4 py-2 rounded text-sm font-semibold transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
