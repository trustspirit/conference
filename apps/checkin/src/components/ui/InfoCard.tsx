import React from 'react'

interface InfoCardProps {
  label: string
  value: React.ReactNode
  className?: string
}

function InfoCard({ label, value, className = '' }: InfoCardProps): React.ReactElement {
  return (
    <div className={`bg-[#F0F2F5] rounded-md p-3 border border-transparent ${className}`}>
      <div className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold">
        {label}
      </div>
      <div className="font-semibold text-[#050505]">{value || '-'}</div>
    </div>
  )
}

export default InfoCard
