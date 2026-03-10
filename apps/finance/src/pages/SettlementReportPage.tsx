import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useToast } from 'trust-ui-react'
import { useProject } from '../contexts/ProjectContext'
import { formatFirestoreDate } from '../lib/utils'
import { exportBatchSettlementPdf } from '../lib/pdfExport'
import { useSettlement, useSettlementBatch } from '../hooks/queries/useSettlements'
import { DEFAULT_PER_KM_RATE, calcCarTransportAmount } from '../components/ItemRow'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import InfoGrid from '../components/InfoGrid'
import ItemsTable from '../components/ItemsTable'
import ReceiptGallery from '../components/ReceiptGallery'

export default function SettlementReportPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { id } = useParams<{ id: string }>()
  const { currentProject } = useProject()
  const { data: settlement, isLoading } = useSettlement(id)

  // Load all settlements in the same batch
  const batchId = settlement?.batchId
  const { data: batchSettlements, isLoading: batchLoading } = useSettlementBatch(batchId)

  const documentNo = currentProject?.documentNo || ''
  const projectName = currentProject?.name || ''
  const perKmRate = currentProject?.perKmRate ?? DEFAULT_PER_KM_RATE
  const [exporting, setExporting] = useState(false)
  const [includeBankBooks, setIncludeBankBooks] = useState(true)

  const settlements = batchSettlements && batchSettlements.length > 0 ? batchSettlements : settlement ? [settlement] : []
  const isBatch = settlements.length > 1

  const handleExportPdf = async () => {
    if (settlements.length === 0) return
    setExporting(true)
    const success = await exportBatchSettlementPdf(
      settlements, documentNo, projectName, perKmRate,
      { includeBankBooks },
    )
    if (!success) toast({ variant: 'danger', message: 'Popup blocked. Please allow popups for this site.' })
    setExporting(false)
  }

  if (isLoading || batchLoading) return <Layout><Spinner /></Layout>
  if (!settlement || (currentProject && settlement.projectId !== currentProject.id)) {
    return <Layout><p className="text-gray-500">{t('detail.notFound')}</p></Layout>
  }

  const dateStr = formatFirestoreDate(settlement.createdAt)
  const uniquePayees = [...new Set(settlements.map(s => s.payee))]
  const payeeLabel = uniquePayees.length === 1 ? uniquePayees[0] : `${t('settlement.multiPayee')} (${uniquePayees.length})`
  const uniqueCommittees = [...new Set(settlements.map(s => s.committee))]
  const committeeLabel = uniqueCommittees.length === 1 ? t(`committee.${uniqueCommittees[0]}`) : '-'
  const totalAmount = settlements.reduce((sum, s) => sum + s.totalAmount, 0)
  const totalRequests = settlements.reduce((sum, s) => sum + s.requestIds.length, 0)

  // Budget code summary
  const budgetMap = new Map<number, { name: string; total: number }>()
  for (const s of settlements) {
    for (const item of s.items) {
      const existing = budgetMap.get(item.budgetCode) || { name: item.description, total: 0 }
      const amt = item.transportDetail?.transportType === 'car'
        ? calcCarTransportAmount(item.transportDetail, perKmRate)
        : item.amount
      existing.total += amt
      budgetMap.set(item.budgetCode, existing)
    }
  }
  const budgetSummary = [...budgetMap.entries()].sort((a, b) => a[0] - b[0])

  return (
    <Layout>
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 max-w-4xl mx-auto">
        <Link to="/admin/settlements" className="inline-block text-sm text-purple-600 hover:underline mb-4">
          {t('settlement.backToList')}
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">
              {isBatch ? t('settlement.batchReport') : t('settlement.reportTitle')}
            </h2>
            <p className="text-sm text-gray-500">{t('settlement.reportSubtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={includeBankBooks}
                onChange={(e) => setIncludeBankBooks(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
              {t('settlement.includeBankBooks')}
            </label>
            <button onClick={handleExportPdf} disabled={exporting}
              className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-purple-700 disabled:bg-gray-400">
              {exporting ? t('settlement.exporting') : t('settlement.exportPdf')}
            </button>
          </div>
        </div>

        {/* Overview */}
        <InfoGrid className="mb-6" items={[
          { label: t('field.payee'), value: payeeLabel },
          { label: t('settlement.settlementDate'), value: dateStr },
          { label: t('committee.label'), value: committeeLabel },
          { label: t('settlement.requestCount'), value: String(totalRequests) },
        ]} />

        {/* Budget Code Summary */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('settlement.budgetSummary')}</h3>
          <div className="bg-gray-50 border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">{t('field.budgetCode')}</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">{t('field.totalAmount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {budgetSummary.map(([code, { total }]) => (
                  <tr key={code}>
                    <td className="px-3 py-2">{code}</td>
                    <td className="px-3 py-2 text-right font-medium">₩{total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-gray-100">
                <tr>
                  <td className="px-3 py-2 font-semibold">{t('field.totalAmount')}</td>
                  <td className="px-3 py-2 text-right font-bold">₩{totalAmount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Per-settlement detail */}
        {settlements.map((s, idx) => (
          <div key={s.id} className="mb-6 border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">
                {isBatch && <span className="text-purple-600 mr-1">#{idx + 1}</span>}
                {s.payee}
              </h3>
              <span className="text-xs text-gray-500">₩{s.totalAmount.toLocaleString()}</span>
            </div>

            <InfoGrid className="mb-3" items={[
              { label: t('field.phone'), value: s.phone },
              { label: t('field.session'), value: s.session },
              { label: t('field.bankAndAccount'), value: `${s.bankName} ${s.bankAccount}` },
              { label: t('committee.label'), value: t(`committee.${s.committee}`) },
            ]} />

            <ItemsTable items={s.items} totalAmount={s.totalAmount} />
            <ReceiptGallery receipts={s.receipts} />
          </div>
        ))}
      </div>
    </Layout>
  )
}
