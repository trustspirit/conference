import type { ReviewItem } from '../types'

export function exportReviewItemsToCSV(items: ReviewItem[], filename = 'export.csv') {
  if (!items.length) return

  const headers = ['Name', 'Email', 'Phone', 'Age', 'Gender', 'Stake', 'Ward', 'Status', 'Type', 'Created At']
  const rows = items.map((item) => [
    item.name,
    item.email,
    item.phone,
    String(item.age),
    item.gender,
    item.stake,
    item.ward,
    item.rawStatus,
    item.type,
    item.createdAt instanceof Date ? item.createdAt.toISOString().split('T')[0] : '',
  ])

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
