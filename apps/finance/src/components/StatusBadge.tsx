import { useTranslation } from 'react-i18next'
import { RequestStatus } from '../types'

const statusClass: Record<RequestStatus, string> = {
  pending: 'border-[#D8DDE5] bg-[#F8FAFC] text-[#4B5563]',
  reviewed: 'border-[#B7C4D4] bg-[#E8EEF5] text-[#002C5F]',
  approved: 'border-[#B8D8DD] bg-[#E7F3F5] text-[#007FA8]',
  rejected: 'border-[#E2B9B9] bg-[#F8ECEC] text-[#A43F3F]',
  settled: 'border-[#B7C4D4] bg-[#E8EEF5] text-[#002C5F]',
  cancelled: 'border-[#D8DDE5] bg-[#F3F4F6] text-[#667085]',
  force_rejected: 'border-[#E2B9B9] bg-[#F8ECEC] text-[#A43F3F]'
}

export default function StatusBadge({ status }: { status: RequestStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${statusClass[status]}`}
    >
      {t(`status.${status}`)}
    </span>
  )
}
