import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useToast } from 'trust-ui-react'
import { useProject } from '../contexts/ProjectContext'
import { formatFirestoreDate } from '../lib/utils'
import { exportBatchSettlementPdf } from '../lib/pdfExport'
import {
  useSettlement,
  useSettlementBatch,
  useRequestsByIds,
  useUsersByUids
} from '../hooks/queries/useSettlements'
import { useUser } from '../hooks/queries/useUsers'
import { DEFAULT_PER_KM_RATE } from '../components/ItemRow'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import InfoGrid from '../components/InfoGrid'
import ItemsTable from '../components/ItemsTable'
import ReceiptGallery from '../components/ReceiptGallery'
import BankBookPreview from '../components/BankBookPreview'
import FinanceTable from '../components/table/FinanceTable'

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
  const [routeMapDataUrls, setRouteMapDataUrls] = useState<Map<string, string>>(new Map())

  const settlements =
    batchSettlements && batchSettlements.length > 0
      ? batchSettlements
      : settlement
        ? [settlement]
        : []
  const isBatch = settlements.length > 1
  const isCorporateCard = settlements.some((s) => s.isCorporateCard)
  const corporateCardTitle =
    currentProject?.corporateCardReportTitle || t('settlement.corporateCardReport')

  // Load original requests for individual forms (preserves per-request approval signatures)
  const allRequestIds = settlements.flatMap((s) => s.requestIds)
  const { data: originalRequests, isLoading: requestsLoading } = useRequestsByIds(allRequestIds)

  // Load payee user profiles for bank book URLs
  const requesterUids = [...new Set((originalRequests || []).map((r) => r.requestedBy.uid))]
  const { data: payeeUsers, isLoading: usersLoading } = useUsersByUids(requesterUids)

  // Load creator profile for signature fallback (older settlements without createdBySignature)
  const creatorUid = settlement?.createdBy?.uid
  const { data: creatorUser } = useUser(
    settlement?.createdBySignature === undefined ? creatorUid : undefined
  )
  const creatorSignature = settlement?.createdBySignature || creatorUser?.signature || null
  const creatorName = settlement?.createdBy?.name || ''

  // Preload route map images as data URLs so they render correctly when printing via Ctrl+P
  const settlementIds = settlements.map((s) => s.id).join(',')
  useEffect(() => {
    const urls = settlements
      .flatMap((s) => s.items)
      .map((item) => item.transportDetail?.routeMapImage?.url)
      .filter((url): url is string => Boolean(url))
    if (urls.length === 0) return

    let cancelled = false
    const uniqueUrls = [...new Set(urls)]
    const map = new Map<string, string>()
    Promise.all(
      uniqueUrls.map(async (url) => {
        try {
          const res = await fetch(url)
          if (!res.ok) return
          const blob = await res.blob()
          await new Promise<void>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
              if (typeof reader.result === 'string') map.set(url, reader.result)
              resolve()
            }
            reader.onerror = () => resolve()
            reader.readAsDataURL(blob)
          })
        } catch {
          // keep original URL as fallback
        }
      })
    ).then(() => {
      if (!cancelled) setRouteMapDataUrls(new Map(map))
    })
    return () => {
      cancelled = true
    }
  }, [settlementIds]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportPdf = async () => {
    if (settlements.length === 0) return
    setExporting(true)
    try {
      const success = await exportBatchSettlementPdf(
        settlements,
        documentNo,
        projectName,
        perKmRate,
        {
          includeBankBooks,
          originalRequests: originalRequests || [],
          payeeUsers,
          reportTitle: isCorporateCard ? corporateCardTitle : undefined,
          createdBySignature: creatorSignature,
          createdByName: creatorName
        }
      )
      if (!success)
        toast({ variant: 'danger', message: 'Popup blocked. Please allow popups for this site.' })
    } catch (err) {
      console.error('PDF export failed:', err)
      toast({ variant: 'danger', message: 'PDF export failed.' })
    } finally {
      setExporting(false)
    }
  }

  const isDataLoading =
    isLoading ||
    batchLoading ||
    (allRequestIds.length > 0 && requestsLoading) ||
    (requesterUids.length > 0 && usersLoading)
  if (isDataLoading)
    return (
      <Layout>
        <Spinner />
      </Layout>
    )
  if (!settlement || (currentProject && settlement.projectId !== currentProject.id)) {
    return (
      <Layout>
        <p className="text-gray-500">{t('detail.notFound')}</p>
      </Layout>
    )
  }

  const dateStr = formatFirestoreDate(settlement.createdAt)
  const uniquePayees = [...new Set(settlements.map((s) => s.payee))]
  const uniqueApprovers = settlements.some((s) => s.approvers?.length)
    ? [...new Set(settlements.flatMap((s) => s.approvers?.map((a) => a.uid) || []))]
    : (originalRequests || []).length > 0
      ? [...new Set((originalRequests || []).map((r) => r.approvedBy?.uid).filter(Boolean))]
      : [...new Set(settlements.map((s) => s.approvedBy?.uid).filter(Boolean))]
  const needsIndividualForms = uniquePayees.length > 1 || uniqueApprovers.length > 1
  const payeeDisplay = needsIndividualForms ? 'Multi' : uniquePayees[0]
  const bankDisplay = needsIndividualForms
    ? t('settlement.seeBelow')
    : `${settlements[0].bankName} ${settlements[0].bankAccount}`
  const uniqueCommittees = [...new Set(settlements.map((s) => s.committee))]
  const committeeLabel = uniqueCommittees.map((c) => t(`committee.${c}`)).join(' / ')
  const totalAmount = settlements.reduce((sum, s) => sum + s.totalAmount, 0)
  const totalRequests = settlements.reduce((sum, s) => sum + s.requestIds.length, 0)

  // Budget code summary (use stored item.amount — already calculated at submission time)
  const budgetMap = new Map<number, { total: number; count: number }>()
  for (const s of settlements) {
    for (const item of s.items) {
      const existing = budgetMap.get(item.budgetCode) || { total: 0, count: 0 }
      existing.total += item.amount
      existing.count += 1
      budgetMap.set(item.budgetCode, existing)
    }
  }
  const budgetSummary = [...budgetMap.entries()].sort((a, b) => a[0] - b[0])

  return (
    <Layout>
      <div className="finance-panel rounded-lg p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="mb-4 flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <Link to="/admin/settlements" className="text-sm text-finance-primary hover:underline">
            {t('settlement.backToList')}
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {!isCorporateCard && (
              <label className="flex items-center gap-1.5 text-xs text-finance-muted cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={includeBankBooks}
                  onChange={(e) => setIncludeBankBooks(e.target.checked)}
                  className="finance-checkbox"
                />
                {t('settlement.includeBankBooks')}
              </label>
            )}
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="finance-primary-button w-full px-4 py-2 rounded text-sm font-medium disabled:bg-gray-400 whitespace-nowrap sm:w-auto"
            >
              {exporting ? t('settlement.exporting') : t('settlement.exportPdf')}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold">
            {isCorporateCard
              ? corporateCardTitle
              : isBatch
                ? t('settlement.batchReport')
                : t('settlement.reportTitle')}
          </h2>
          <p className="text-sm text-gray-500">
            {isCorporateCard ? corporateCardTitle : t('settlement.reportSubtitle')}
          </p>
        </div>

        {/* Overview */}
        <InfoGrid
          className="mb-6"
          items={[
            {
              label: t('field.payee'),
              value: needsIndividualForms
                ? `${payeeDisplay} (${t('settlement.payeeCount', { count: uniquePayees.length })})`
                : payeeDisplay
            },
            ...(!isCorporateCard ? [{ label: t('field.bankAndAccount'), value: bankDisplay }] : []),
            { label: t('settlement.settlementDate'), value: dateStr },
            { label: t('committee.label'), value: committeeLabel },
            { label: t('settlement.requestCount'), value: String(totalRequests) }
          ]}
        />

        {/* Budget Code Summary */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-finance-primary mb-2">
            {t('settlement.budgetSummary')}
          </h3>
          <FinanceTable variant="embedded">
            <FinanceTable.Head tone="soft">
              <tr>
                <FinanceTable.Th size="compact">{t('field.budgetCode')}</FinanceTable.Th>
                <FinanceTable.Th size="compact">{t('field.comments')}</FinanceTable.Th>
                <FinanceTable.Th size="compact" align="right">
                  {t('field.totalAmount')}
                </FinanceTable.Th>
              </tr>
            </FinanceTable.Head>
            <FinanceTable.Body>
              {budgetSummary.map(([code, { total }]) => (
                <FinanceTable.Row key={code} hover={false}>
                  <FinanceTable.Td size="compact">{code}</FinanceTable.Td>
                  <FinanceTable.Td size="compact" className="text-finance-muted">
                    {t(`budgetCode.${code}`)}
                  </FinanceTable.Td>
                  <FinanceTable.Td size="compact" align="right" className="font-medium">
                    ₩{total.toLocaleString()}
                  </FinanceTable.Td>
                </FinanceTable.Row>
              ))}
            </FinanceTable.Body>
            <FinanceTable.Footer tone="soft">
              <tr>
                <FinanceTable.Td size="compact" colSpan={2} align="right" className="font-semibold">
                  {t('field.totalAmount')}
                </FinanceTable.Td>
                <FinanceTable.Td size="compact" align="right" className="font-bold">
                  ₩{totalAmount.toLocaleString()}
                </FinanceTable.Td>
              </tr>
            </FinanceTable.Footer>
          </FinanceTable>
        </div>

        {/* Payee summary (only when multiple payees) */}
        {uniquePayees.length > 1 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-finance-primary mb-2">
              {t('settlement.payeeSummary')}
            </h3>
            <FinanceTable variant="embedded">
              <FinanceTable.Head tone="soft">
                <tr>
                  <FinanceTable.Th size="compact">#</FinanceTable.Th>
                  <FinanceTable.Th size="compact">{t('field.payee')}</FinanceTable.Th>
                  {!isCorporateCard && (
                    <FinanceTable.Th size="compact">{t('field.bank')}</FinanceTable.Th>
                  )}
                  {!isCorporateCard && (
                    <FinanceTable.Th size="compact">{t('field.bankAccount')}</FinanceTable.Th>
                  )}
                  <FinanceTable.Th size="compact" align="right">
                    {t('field.totalAmount')}
                  </FinanceTable.Th>
                </tr>
              </FinanceTable.Head>
              <FinanceTable.Body>
                {settlements.map((s, i) => (
                  <FinanceTable.Row key={s.id} hover={false}>
                    <FinanceTable.Td size="compact" className="text-gray-500">
                      {i + 1}
                    </FinanceTable.Td>
                    <FinanceTable.Td size="compact">{s.payee}</FinanceTable.Td>
                    {!isCorporateCard && (
                      <FinanceTable.Td size="compact" className="text-gray-500">
                        {s.bankName}
                      </FinanceTable.Td>
                    )}
                    {!isCorporateCard && (
                      <FinanceTable.Td size="compact" className="text-gray-500">
                        {s.bankAccount}
                      </FinanceTable.Td>
                    )}
                    <FinanceTable.Td size="compact" align="right" className="font-medium">
                      ₩{s.totalAmount.toLocaleString()}
                    </FinanceTable.Td>
                  </FinanceTable.Row>
                ))}
              </FinanceTable.Body>
              <FinanceTable.Footer tone="soft">
                <tr>
                  <FinanceTable.Td
                    size="compact"
                    colSpan={isCorporateCard ? 2 : 4}
                    align="right"
                    className="font-semibold"
                  >
                    {t('field.totalAmount')}
                  </FinanceTable.Td>
                  <FinanceTable.Td size="compact" align="right" className="font-bold">
                    ₩{totalAmount.toLocaleString()}
                  </FinanceTable.Td>
                </tr>
              </FinanceTable.Footer>
            </FinanceTable>
          </div>
        )}

        {needsIndividualForms ? (
          /* Per-request individual forms (only when info differs) */
          (originalRequests || []).map((req, idx) => (
            <div key={req.id} className="mb-6 border border-finance-border rounded-lg p-4">
              <div className="flex flex-col gap-1 mb-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-bold">
                  <span className="text-finance-primary mr-1">#{idx + 1}</span>
                  {t('settlement.individualForm')} — {req.payee}
                </h3>
                <span className="text-xs text-gray-500">₩{req.totalAmount.toLocaleString()}</span>
              </div>

              <InfoGrid
                className="mb-3"
                items={[
                  { label: t('field.phone'), value: req.phone },
                  { label: t('field.session'), value: req.session },
                  ...(!isCorporateCard
                    ? [
                        {
                          label: t('field.bankAndAccount'),
                          value: `${req.bankName} ${req.bankAccount}`
                        }
                      ]
                    : []),
                  { label: t('committee.label'), value: t(`committee.${req.committee}`) },
                  { label: t('field.approvedBy'), value: req.approvedBy?.name || '-' }
                ]}
              />

              <ItemsTable items={req.items} totalAmount={req.totalAmount} />

              <div className="flex justify-between gap-4 items-end mt-4 pt-4 border-t border-finance-border">
                <div>
                  <p className="text-[10px] text-gray-400 mb-1">Requested by</p>
                  {settlements.find((s) => s.requestIds.includes(req.id))?.requestedBySignature && (
                    <img
                      src={
                        settlements.find((s) => s.requestIds.includes(req.id))!
                          .requestedBySignature!
                      }
                      alt="signature"
                      className="h-10 mb-1"
                    />
                  )}
                  <div className="border-t border-finance-border w-40 pt-0.5 text-[10px] text-finance-muted">
                    {req.payee}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 mb-1">Approved by</p>
                  {req.approvalSignature && (
                    <img
                      src={req.approvalSignature}
                      alt="signature"
                      className="h-10 mb-1 mx-auto"
                    />
                  )}
                  <div className="border-t border-finance-border w-40 pt-0.5 text-[10px] text-finance-muted mx-auto">
                    {req.approvedBy?.name || '\u00A0'}
                  </div>
                </div>
              </div>

              <ReceiptGallery receipts={req.receipts} />
            </div>
          ))
        ) : (
          /* Unified — signatures + receipts only (budget summary above is sufficient) */
          <>
            <div className="flex justify-between gap-4 items-end mb-6 pt-4 border-t border-finance-border">
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Requested by</p>
                {creatorSignature && (
                  <img src={creatorSignature} alt="creator signature" className="h-10 mb-1" />
                )}
                <div className="border-t border-finance-border w-40 pt-0.5 text-[10px] text-finance-muted">
                  {creatorName || '\u00A0'}
                </div>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 mb-1">Approved by</p>
                {settlements[0]?.approvalSignature && (
                  <img
                    src={settlements[0].approvalSignature}
                    alt="signature"
                    className="h-10 mb-1 mx-auto"
                  />
                )}
                <div className="border-t border-finance-border w-40 pt-0.5 text-[10px] text-finance-muted mx-auto">
                  {settlements[0]?.approvedBy?.name || '\u00A0'}
                </div>
              </div>
            </div>

            {/* Route map images for transport items */}
            {settlements
              .flatMap((s) => s.items)
              .some((item) => item.transportDetail?.routeMapImage?.url) && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-finance-primary mb-2">
                  {t('field.routeMap')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {settlements
                    .flatMap((s) => s.items)
                    .filter((item) => item.transportDetail?.routeMapImage?.url)
                    .map((item, idx) => (
                      <div
                        key={idx}
                        className="border border-finance-border rounded-lg overflow-hidden"
                      >
                        <a
                          href={item.transportDetail!.routeMapImage!.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="print:pointer-events-none"
                        >
                          <img
                            src={
                              routeMapDataUrls.get(item.transportDetail!.routeMapImage!.url) ||
                              item.transportDetail!.routeMapImage!.url
                            }
                            alt={`${item.transportDetail!.departure} → ${item.transportDetail!.destination}`}
                            className="w-full max-h-[160px] object-contain bg-finance-surface"
                          />
                        </a>
                        <div className="px-3 py-1.5 bg-finance-surface border-t border-finance-border text-xs text-finance-muted">
                          {item.transportDetail!.departure} → {item.transportDetail!.destination}
                          {item.transportDetail!.distanceKm &&
                            ` · ${item.transportDetail!.distanceKm}km`}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <ReceiptGallery receipts={settlements.flatMap((s) => s.receipts)} />
          </>
        )}

        {/* Bank Book Copies */}
        {includeBankBooks &&
          !isCorporateCard &&
          (() => {
            const bankBooks: { payee: string; url: string }[] = []
            const seenUids = new Set<string>()
            for (const s of settlements) {
              // Find the requester UID for this settlement via original requests or requestIds
              const req = (originalRequests || []).find((r) => s.requestIds.includes(r.id))
              const uid = req?.requestedBy.uid
              if (uid && seenUids.has(uid)) continue
              if (uid) seenUids.add(uid)
              // 정산 시점 스냅샷 우선, 없으면 사용자 프로필 fallback
              const userBankBook = uid
                ? payeeUsers?.get(uid)?.bankBookUrl || payeeUsers?.get(uid)?.bankBookDriveUrl
                : undefined
              const url = s.bankBookUrl || userBankBook
              if (url) bankBooks.push({ payee: s.payee, url })
            }
            if (bankBooks.length === 0) return null
            return (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-finance-primary mb-2">
                  {t('field.bankBook')}
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {bankBooks.map((bb) => (
                    <div
                      key={bb.payee}
                      className="border border-finance-border rounded overflow-hidden"
                    >
                      <BankBookPreview
                        url={bb.url}
                        alt={bb.payee}
                        maxHeight="max-h-60"
                        className="w-full object-contain bg-finance-surface"
                      />
                      <p className="text-xs text-finance-muted px-2 py-1 bg-finance-surface border-t border-finance-border">
                        {bb.payee}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
      </div>
    </Layout>
  )
}
