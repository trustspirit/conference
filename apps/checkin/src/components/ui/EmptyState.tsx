import React from 'react'

interface EmptyStateProps {
  message: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

function EmptyState({ message, icon, action }: EmptyStateProps): React.ReactElement {
  return (
    <div className="text-center py-8">
      {icon && <div className="mb-4 text-4xl">{icon}</div>}
      <p className="text-[#65676B]">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export default EmptyState
