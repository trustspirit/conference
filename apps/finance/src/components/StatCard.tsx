export default function StatCard({
  label,
  value,
  color = 'gray',
  icon
}: {
  label: string
  value: string
  color?: string
  icon?: React.ReactNode
}) {
  const colors: Record<string, string> = {
    gray: 'bg-finance-primary',
    yellow: 'bg-finance-neutral',
    green: 'bg-finance-accent',
    blue: 'bg-finance-primary',
    red: 'bg-finance-danger'
  }
  return (
    <div className="finance-panel rounded-lg p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs text-finance-muted">{label}</p>
      </div>
      <p className="text-lg font-bold text-finance-text">{value}</p>
      <div className={`mt-3 h-0.5 w-full ${colors[color]}`} />
    </div>
  )
}
