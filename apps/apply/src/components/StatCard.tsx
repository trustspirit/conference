type Color = 'gray' | 'yellow' | 'green' | 'red' | 'blue'

const colorClasses: Record<Color, string> = {
  gray: 'bg-gray-50 border-gray-200',
  yellow: 'bg-yellow-50 border-yellow-200',
  green: 'bg-green-50 border-green-200',
  red: 'bg-red-50 border-red-200',
  blue: 'bg-blue-50 border-blue-200',
}

export default function StatCard({ label, value, color = 'gray' }: { label: string; value: number; color?: Color }) {
  return (
    <div className={`rounded-xl border p-6 ${colorClasses[color]}`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
