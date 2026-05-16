import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useToast } from 'trust-ui-react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@conference/firebase'
import { useProject } from '../contexts/ProjectContext'
import { useInfiniteRequests } from '../hooks/queries/useRequests'
import { Committee, Receipt } from '../types'
import Layout from '../components/Layout'
import { DownloadIcon } from '../components/Icons'
import Spinner from '../components/Spinner'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import InfiniteScrollSentinel from '../components/InfiniteScrollSentinel'
import FinanceTable from '../components/table/FinanceTable'
import JSZip from 'jszip'

interface ReceiptRow {
  receipt: Receipt
  requestDate: string
  payee: string
  committee: Committee
  requestId: string
}

function isPdf(fileName: string) {
  return fileName.toLowerCase().endsWith('.pdf')
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-finance-surface text-finance-placeholder ${className}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
      <span className="text-[9px] font-medium">PDF</span>
    </div>
  )
}

export default function ReceiptsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { currentProject } = useProject()
  const {
    data,
    isLoading: loading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  } = useInfiniteRequests(currentProject?.id)
  const [committeeFilter, setCommitteeFilter] = useState<Committee | 'all'>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState(false)

  const rows: ReceiptRow[] = useMemo(() => {
    const requests = data?.pages.flatMap((p) => p.items) ?? []
    const result: ReceiptRow[] = []
    for (const req of requests.filter((r) => r.status !== 'cancelled')) {
      for (const receipt of req.receipts) {
        result.push({
          receipt,
          requestDate: req.date,
          payee: req.payee,
          committee: req.committee,
          requestId: req.id
        })
      }
    }
    return result
  }, [data])

  const filtered =
    committeeFilter === 'all' ? rows : rows.filter((r) => r.committee === committeeFilter)

  const getRowKey = (row: ReceiptRow) =>
    `${row.requestId}:${row.receipt.storagePath || row.receipt.url || row.receipt.fileName}`

  const allSelected = filtered.length > 0 && filtered.every((row) => selected.has(getRowKey(row)))
  const someSelected = selected.size > 0

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(getRowKey)))
    }
  }

  const toggleOne = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Reset selection when filter changes
  const handleFilterChange = (f: Committee | 'all') => {
    setCommitteeFilter(f)
    setSelected(new Set())
  }

  const downloadFn = httpsCallable<
    { storagePath: string },
    { data: string; contentType: string; fileName: string }
  >(functions, 'downloadFileV2')

  const downloadOneFile = async (
    row: ReceiptRow
  ): Promise<{ bytes: Uint8Array; ext: string } | null> => {
    try {
      if (row.receipt.storagePath) {
        const result = await downloadFn({
          storagePath: row.receipt.storagePath
        })
        const binary = atob(result.data.data)
        const bytes = new Uint8Array(binary.length)
        for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j)
        return { bytes, ext: row.receipt.fileName.split('.').pop() || 'jpg' }
      } else {
        const url = row.receipt.url || row.receipt.driveUrl
        if (!url) return null
        const response = await fetch(url, { mode: 'cors' })
        if (!response.ok) return null
        const blob = await response.blob()
        if (blob.size === 0) return null
        const reader = new FileReader()
        const bytes = await new Promise<Uint8Array>((resolve) => {
          reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
          reader.readAsArrayBuffer(blob)
        })
        return { bytes, ext: row.receipt.fileName.split('.').pop() || 'jpg' }
      }
    } catch (err) {
      console.warn('Download error:', row.receipt.fileName, err)
      return null
    }
  }

  const handleDownload = async () => {
    if (selected.size === 0) return
    setDownloading(true)

    try {
      const selectedRows = filtered.filter((row) => selected.has(getRowKey(row)))

      // Single file: download directly
      if (selectedRows.length === 1) {
        const row = selectedRows[0]
        const file = await downloadOneFile(row)
        if (!file) {
          toast({ variant: 'danger', message: t('receipts.downloadFailed') })
          return
        }
        const blob = new Blob([file.bytes as unknown as BlobPart])
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `${row.requestDate}_${row.payee}.${file.ext}`
        link.click()
        URL.revokeObjectURL(link.href)
        return
      }

      // Multiple files: ZIP
      const zip = new JSZip()
      let failCount = 0
      await Promise.all(
        selectedRows.map(async (row, i) => {
          const file = await downloadOneFile(row)
          if (!file) {
            failCount++
            return
          }
          const name = `${row.requestDate}_${row.payee}_${i + 1}.${file.ext}`
          zip.file(name, file.bytes)
        })
      )

      if (failCount > 0) {
        toast({
          variant: 'danger',
          message: t('receipts.partialDownload', {
            failed: failCount,
            total: selectedRows.length
          })
        })
      }
      if (Object.keys(zip.files).length === 0) return

      const content = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(content)
      const label = committeeFilter === 'all' ? 'all' : t(`committee.${committeeFilter}Short`)
      link.download = `receipts_${label}_${new Date().toISOString().slice(0, 10)}.zip`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      console.error('Download failed:', err)
      toast({ variant: 'danger', message: t('receipts.downloadFailed') })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Layout>
      <PageHeader title={t('receipts.title')} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['all', 'operations', 'preparation'] as const).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={`px-3 py-1 rounded text-sm font-semibold border transition-colors ${
              committeeFilter === f
                ? 'finance-tab-active'
                : 'bg-white text-finance-muted border-finance-border hover:text-finance-primary hover:bg-finance-primary-subtle'
            }`}
          >
            {f === 'all' ? t('status.all') : t(`committee.${f}Short`)}
          </button>
        ))}

        {someSelected && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex w-full items-center justify-center gap-1.5 rounded px-4 py-1.5 text-sm font-semibold finance-primary-button disabled:bg-gray-400 sm:ml-auto sm:w-auto"
          >
            <DownloadIcon className="w-4 h-4" />
            {downloading
              ? t('receipts.downloading')
              : selected.size === 1
                ? t('receipts.download')
                : t('receipts.downloadZip', { count: selected.size })}
          </button>
        )}
      </div>

      <p className="text-xs text-finance-muted mb-4">
        {t('receipts.totalCount', { count: filtered.length })}
      </p>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState title={t('receipts.noReceipts')} />
      ) : (
        <>
          {/* Desktop table view */}
          <div className="hidden sm:block">
            <FinanceTable>
              <FinanceTable.Head>
                <tr>
                  <FinanceTable.Th className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="finance-checkbox"
                    />
                  </FinanceTable.Th>
                  <FinanceTable.Th>{t('field.receipts')}</FinanceTable.Th>
                  <FinanceTable.Th>{t('field.payee')}</FinanceTable.Th>
                  <FinanceTable.Th>{t('field.date')}</FinanceTable.Th>
                  <FinanceTable.Th>{t('field.committee')}</FinanceTable.Th>
                  <FinanceTable.Th align="center"></FinanceTable.Th>
                </tr>
              </FinanceTable.Head>
              <FinanceTable.Body>
                {filtered.map((row) => {
                  const key = getRowKey(row)
                  const imgUrl = row.receipt.url || row.receipt.driveUrl
                  return (
                    <FinanceTable.Row key={key} selected={selected.has(key)}>
                      <FinanceTable.Td>
                        <input
                          type="checkbox"
                          checked={selected.has(key)}
                          onChange={() => toggleOne(key)}
                          className="finance-checkbox"
                        />
                      </FinanceTable.Td>
                      <FinanceTable.Td>
                        <div className="flex items-center gap-3">
                          {imgUrl && (
                            <a href={imgUrl} target="_blank" rel="noopener noreferrer">
                              {isPdf(row.receipt.fileName) ? (
                                <object
                                  data={imgUrl}
                                  type="application/pdf"
                                  className="w-10 h-10 rounded border border-finance-border bg-white pointer-events-none"
                                >
                                  <PdfIcon className="w-10 h-10 rounded border border-finance-border" />
                                </object>
                              ) : (
                                <img
                                  src={imgUrl}
                                  alt={row.receipt.fileName}
                                  className="w-10 h-10 object-cover rounded border border-finance-border bg-finance-surface"
                                />
                              )}
                            </a>
                          )}
                          <a
                            href={imgUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-finance-primary hover:underline text-xs truncate max-w-[200px]"
                          >
                            {row.receipt.fileName}
                          </a>
                        </div>
                      </FinanceTable.Td>
                      <FinanceTable.Td className="text-gray-700">{row.payee}</FinanceTable.Td>
                      <FinanceTable.Td className="text-gray-500">{row.requestDate}</FinanceTable.Td>
                      <FinanceTable.Td className="text-gray-500">
                        {t(`committee.${row.committee}Short`)}
                      </FinanceTable.Td>
                      <FinanceTable.Td align="center">
                        <Link
                          to={`/request/${row.requestId}`}
                          className="text-xs text-finance-primary hover:underline"
                        >
                          {t('receipts.viewRequest')}
                        </Link>
                      </FinanceTable.Td>
                    </FinanceTable.Row>
                  )
                })}
              </FinanceTable.Body>
            </FinanceTable>
          </div>

          {/* Mobile card view */}
          <div className="sm:hidden space-y-2">
            {filtered.map((row) => {
              const key = getRowKey(row)
              const imgUrl = row.receipt.url || row.receipt.driveUrl
              return (
                <div
                  key={key}
                  className={`finance-panel rounded-lg p-3 flex items-center gap-3 ${selected.has(key) ? 'ring-2 ring-finance-selected-ring' : ''}`}
                  onClick={() => toggleOne(key)}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => toggleOne(key)}
                    onClick={(e) => e.stopPropagation()}
                    className="finance-checkbox"
                  />
                  {imgUrl &&
                    (isPdf(row.receipt.fileName) ? (
                      <object
                        data={imgUrl}
                        type="application/pdf"
                        className="w-12 h-12 rounded border border-finance-border bg-white pointer-events-none shrink-0"
                      >
                        <PdfIcon className="w-12 h-12 rounded border border-finance-border shrink-0" />
                      </object>
                    ) : (
                      <img
                        src={imgUrl}
                        alt={row.receipt.fileName}
                        className="w-12 h-12 object-cover rounded border border-finance-border bg-finance-surface shrink-0"
                      />
                    ))}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {row.receipt.fileName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {row.payee} &middot; {row.requestDate}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t(`committee.${row.committee}Short`)}
                      {' · '}
                      <Link
                        to={`/request/${row.requestId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-finance-primary hover:underline"
                      >
                        {t('receipts.viewRequest')}
                      </Link>
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <InfiniteScrollSentinel
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        </>
      )}
    </Layout>
  )
}
