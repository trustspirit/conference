import React from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

function PageHeader({ title, description, actions }: PageHeaderProps): React.ReactElement {
  return (
    <div className="mb-6 flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold text-[#050505] mb-1">{title}</h1>
        {description && <p className="text-[#65676B]">{description}</p>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  )
}

export default PageHeader
