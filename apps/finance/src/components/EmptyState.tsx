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
      <div className="w-16 h-16 bg-[#E8EEF5] rounded-full flex items-center justify-center mb-4">
        <DocumentIcon className="w-8 h-8 text-[#002C5F]" />
      </div>
      <p className="text-[#111827] font-medium mb-1">{title}</p>
      {description && <p className="text-sm text-[#667085] mb-4">{description}</p>}
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
