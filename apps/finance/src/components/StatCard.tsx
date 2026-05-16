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
    gray: 'bg-[#002C5F]',
    yellow: 'bg-[#6B7280]',
    green: 'bg-[#007FA8]',
    blue: 'bg-[#002C5F]',
    red: 'bg-[#A43F3F]'
  }
  return (
    <div className="finance-panel rounded-lg p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs text-[#667085]">{label}</p>
      </div>
      <p className="text-lg font-bold text-[#111827]">{value}</p>
      <div className={`mt-3 h-0.5 w-full ${colors[color]}`} />
    </div>
  )
}
