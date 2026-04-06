import type { PaymentRequest } from '../types'
import i18n from 'i18next'

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function getStatusLabel(status: string): string {
  return i18n.t(`status.${status}`, status)
}

function getCommitteeLabel(committee: string): string {
  return i18n.t(`committee.${committee}Short`, committee)
}

export function exportRequestsCsv(requests: PaymentRequest[]) {
  const header = [
    i18n.t('field.payee'),
    i18n.t('field.committee'),
    i18n.t('field.budgetCode'),
    i18n.t('field.totalAmount'),
    i18n.t('field.settlementStatus')
  ]

  const rows = requests.map((req) => {
    const codes = [...new Set(req.items.map((item) => String(item.budgetCode)))].join('/')
    return [
      escapeCsvField(req.payee),
      escapeCsvField(getCommitteeLabel(req.committee)),
      escapeCsvField(codes),
      String(req.totalAmount),
      escapeCsvField(getStatusLabel(req.status))
    ].join(',')
  })

  const bom = '\uFEFF'
  const csv = bom + [header.join(','), ...rows].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `requests_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
