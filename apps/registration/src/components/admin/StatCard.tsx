import React from 'react'

interface StatCardProps {
  label: string
  value: number | string
  icon?: React.ReactNode
  color?: string
}

function StatCard({ label, value, icon, color = 'text-gray-900' }: StatCardProps): React.ReactElement {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      {icon && (
        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-3">
          {icon}
        </div>
      )}
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  )
}

export default StatCard
