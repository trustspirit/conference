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

export type CsvColumnKey =
  | 'payee'
  | 'committee'
  | 'budgetCode'
  | 'totalAmount'
  | 'settlementStatus'
  | 'date'
  | 'phone'
  | 'bank'
  | 'bankAccount'
  | 'comments'
  | 'requestedBy'
  | 'reviewedBy'
  | 'approvedBy'
  | 'rejectionReason'
  | 'itemDescriptions'

export const DEFAULT_CSV_COLUMNS: CsvColumnKey[] = [
  'payee',
  'committee',
  'budgetCode',
  'totalAmount',
  'settlementStatus'
]

export const OPTIONAL_CSV_COLUMNS: CsvColumnKey[] = [
  'date',
  'phone',
  'bank',
  'bankAccount',
  'comments',
  'requestedBy',
  'reviewedBy',
  'approvedBy',
  'rejectionReason',
  'itemDescriptions'
]

export function getCsvColumnLabel(key: CsvColumnKey): string {
  const labels: Record<CsvColumnKey, string> = {
    payee: i18n.t('field.payee'),
    committee: i18n.t('field.committee'),
    budgetCode: i18n.t('field.budgetCode'),
    totalAmount: i18n.t('field.totalAmount'),
    settlementStatus: i18n.t('field.settlementStatus'),
    date: i18n.t('field.date'),
    phone: i18n.t('field.phone'),
    bank: i18n.t('field.bank'),
    bankAccount: i18n.t('field.bankAccount'),
    comments: i18n.t('field.comments'),
    requestedBy: i18n.t('field.requestedBy'),
    reviewedBy: i18n.t('approval.reviewedByLabel', i18n.t('approval.reviewedBy', 'Reviewed By')),
    approvedBy: i18n.t('field.approvedBy'),
    rejectionReason: i18n.t('approval.rejectionReason', 'Rejection Reason'),
    itemDescriptions: i18n.t('field.items')
  }
  return labels[key]
}

function getCsvCellValue(req: PaymentRequest, key: CsvColumnKey): string {
  switch (key) {
    case 'payee':
      return req.payee
    case 'committee':
      return getCommitteeLabel(req.committee)
    case 'budgetCode':
      return [...new Set(req.items.map((item) => String(item.budgetCode)))].join('/')
    case 'totalAmount':
      return String(req.totalAmount)
    case 'settlementStatus':
      return getStatusLabel(req.status)
    case 'date':
      return req.date
    case 'phone':
      return req.phone
    case 'bank':
      return req.bankName
    case 'bankAccount':
      return req.bankAccount
    case 'comments':
      return req.comments || ''
    case 'requestedBy':
      return req.requestedBy?.name || ''
    case 'reviewedBy':
      return req.reviewedBy?.name || ''
    case 'approvedBy':
      return req.approvedBy?.name || ''
    case 'rejectionReason':
      return req.rejectionReason || ''
    case 'itemDescriptions':
      return req.items.map((item) => item.description).join(', ')
  }
}

export function exportRequestsCsv(requests: PaymentRequest[], columns?: CsvColumnKey[]) {
  const cols = columns ?? DEFAULT_CSV_COLUMNS

  const header = cols.map((key) => escapeCsvField(getCsvColumnLabel(key)))

  const rows = requests.map((req) =>
    cols.map((key) => escapeCsvField(getCsvCellValue(req, key))).join(',')
  )

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
