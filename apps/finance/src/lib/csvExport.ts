import type { PaymentRequest, RequestItem, Settlement } from '../types'
import i18n from 'i18next'
import { formatFirestoreDate } from './utils'

type FlattenedItem = {
  request: PaymentRequest
  item: RequestItem
}

function flattenToBudgetCodeRows(requests: PaymentRequest[]): FlattenedItem[] {
  return requests
    .flatMap((req) => req.items.map((item) => ({ request: req, item })))
    .sort((a, b) => {
      if (a.item.budgetCode !== b.item.budgetCode) {
        return a.item.budgetCode - b.item.budgetCode
      }
      return a.request.date.localeCompare(b.request.date)
    })
}

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

export type SettlementCsvColumnKey =
  | 'payee'
  | 'committee'
  | 'budgetCode'
  | 'totalAmount'
  | 'date'
  | 'bank'
  | 'bankAccount'
  | 'itemDescriptions'
  | 'approvedBy'

export const DEFAULT_SETTLEMENT_CSV_COLUMNS: SettlementCsvColumnKey[] = [
  'payee',
  'committee',
  'budgetCode',
  'totalAmount',
  'date',
]

export function getSettlementCsvColumnLabel(key: SettlementCsvColumnKey): string {
  const labels: Record<SettlementCsvColumnKey, string> = {
    payee: i18n.t('field.payee'),
    committee: i18n.t('field.committee'),
    budgetCode: i18n.t('field.budgetCode'),
    totalAmount: i18n.t('field.totalAmount'),
    date: i18n.t('settlement.settlementDate'),
    bank: i18n.t('field.bank'),
    bankAccount: i18n.t('field.bankAccount'),
    itemDescriptions: i18n.t('field.items'),
    approvedBy: i18n.t('field.approvedBy'),
  }
  return labels[key]
}

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
    default: {
      const _exhaustive: never = key
      return _exhaustive
    }
  }
}

function getBudgetCodeCsvCellValue(flattened: FlattenedItem, key: CsvColumnKey): string {
  const { request: req, item } = flattened
  switch (key) {
    case 'budgetCode':
      return String(item.budgetCode)
    case 'totalAmount':
      return String(item.amount)
    case 'itemDescriptions':
      return item.description
    case 'payee':
      return req.payee
    case 'committee':
      return getCommitteeLabel(req.committee)
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
    default: {
      const _exhaustive: never = key
      return _exhaustive
    }
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

export function exportRequestsByBudgetCodeCsv(requests: PaymentRequest[], columns?: CsvColumnKey[]) {
  const cols = columns ?? DEFAULT_CSV_COLUMNS
  const header = cols.map((key) => escapeCsvField(getCsvColumnLabel(key)))
  const flattened = flattenToBudgetCodeRows(requests)
  const rows = flattened.map((f) =>
    cols.map((key) => escapeCsvField(getBudgetCodeCsvCellValue(f, key))).join(',')
  )
  const bom = '\uFEFF'
  const csv = bom + [header.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `requests_by_budget_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

type FlattenedSettlement = {
  settlement: Settlement
  item: RequestItem
}

function flattenSettlementsToBudgetCodeRows(settlements: Settlement[]): FlattenedSettlement[] {
  return settlements
    .flatMap((s) => s.items.map((item) => ({ settlement: s, item })))
    .sort((a, b) => {
      if (a.item.budgetCode !== b.item.budgetCode) {
        return a.item.budgetCode - b.item.budgetCode
      }
      const getTime = (d: unknown): number => {
        if (d instanceof Date) return d.getTime()
        if (d && typeof d === 'object' && 'toDate' in d)
          return (d as { toDate: () => Date }).toDate().getTime()
        return 0
      }
      return getTime(a.settlement.createdAt) - getTime(b.settlement.createdAt)
    })
}

function getSettlementBudgetCodeCsvCellValue(
  flattened: FlattenedSettlement,
  key: SettlementCsvColumnKey
): string {
  const { settlement: s, item } = flattened
  switch (key) {
    case 'budgetCode':
      return String(item.budgetCode)
    case 'totalAmount':
      return String(item.amount)
    case 'itemDescriptions':
      return item.description
    case 'payee':
      return s.payee
    case 'committee':
      return getCommitteeLabel(s.committee)
    case 'date':
      return formatFirestoreDate(s.createdAt)
    case 'bank':
      return s.bankName || ''
    case 'bankAccount':
      return s.bankAccount || ''
    case 'approvedBy':
      return s.approvedBy?.name || ''
    default: {
      const _exhaustive: never = key
      return _exhaustive
    }
  }
}

function getSettlementCsvCellValue(s: Settlement, key: SettlementCsvColumnKey): string {
  switch (key) {
    case 'payee':
      return s.payee
    case 'committee':
      return getCommitteeLabel(s.committee)
    case 'budgetCode':
      return [...new Set(s.items.map((i) => String(i.budgetCode)))].join('/')
    case 'totalAmount':
      return String(s.totalAmount)
    case 'date':
      return formatFirestoreDate(s.createdAt)
    case 'bank':
      return s.bankName || ''
    case 'bankAccount':
      return s.bankAccount || ''
    case 'itemDescriptions':
      return s.items.map((i) => i.description).join(', ')
    case 'approvedBy':
      return s.approvedBy?.name || ''
    default: {
      const _exhaustive: never = key
      return _exhaustive
    }
  }
}

export function exportSettlementsCsv(
  settlements: Settlement[],
  columns: SettlementCsvColumnKey[] = DEFAULT_SETTLEMENT_CSV_COLUMNS
) {
  const header = columns.map((key) => escapeCsvField(getSettlementCsvColumnLabel(key)))
  const rows = settlements.map((s) =>
    columns.map((key) => escapeCsvField(getSettlementCsvCellValue(s, key))).join(',')
  )
  const bom = '\uFEFF'
  const csv = bom + [header.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `settlements_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function exportSettlementsByBudgetCodeCsv(
  settlements: Settlement[],
  columns: SettlementCsvColumnKey[] = DEFAULT_SETTLEMENT_CSV_COLUMNS
) {
  const header = columns.map((key) => escapeCsvField(getSettlementCsvColumnLabel(key)))
  const flattened = flattenSettlementsToBudgetCodeRows(settlements)
  const rows = flattened.map((f) =>
    columns.map((key) => escapeCsvField(getSettlementBudgetCodeCsvCellValue(f, key))).join(',')
  )
  const bom = '\uFEFF'
  const csv = bom + [header.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `settlements_by_budget_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
