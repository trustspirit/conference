interface ItemCardProps {
  name: string
  subtitle: string
  status: string
  actions?: React.ReactNode
}

export default function ItemCard({ name, subtitle, status, actions }: ItemCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{status}</span>
          {actions}
        </div>
      </div>
    </div>
  )
}
