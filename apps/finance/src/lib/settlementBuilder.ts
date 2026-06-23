import type { PaymentRequest, AppUser, Currency, Settlement } from '../types'
import { getItemCurrency, sumByCurrency, CURRENCY_OPTIONS } from './currency'

export type NewSettlement = Omit<Settlement, 'id' | 'createdAt'>

export interface BuildSettlementDocsInput {
  groupedByPayee: Record<string, PaymentRequest[]>
  projectId: string
  creator: { uid: string; name: string; email: string }
  creatorSignature: string | null
  userDataByUid: Map<string, AppUser | null>
  /** Returns a stable batchId for a (cardType, currency) combination. */
  resolveBatchId: (isCorporateCard: boolean, currency: Currency) => string
}

/**
 * Build the settlement docs to create for an already payee-grouped selection.
 * Items are split by currency, and each (cardType, currency) combination gets
 * its own batchId via `resolveBatchId` so KRW and USD become separate reports.
 * A mixed-currency request appears in both currency docs and its receipts are
 * attached to each doc (since they are separate reports).
 */
export function buildSettlementDocs(input: BuildSettlementDocsInput): NewSettlement[] {
  const { groupedByPayee, projectId, creator, creatorSignature, userDataByUid, resolveBatchId } =
    input

  return Object.values(groupedByPayee).flatMap((reqs) => {
    if (reqs.length === 0) return []
    const first = reqs[0]
    const userData = userDataByUid.get(first.requestedBy.uid)
    const approvers = Object.values(
      reqs.reduce<Record<string, { uid: string; name: string; email: string }>>((acc, r) => {
        if (r.approvedBy && !acc[r.approvedBy.uid]) acc[r.approvedBy.uid] = r.approvedBy
        return acc
      }, {})
    )

    const base = {
      projectId,
      createdBy: creator,
      createdBySignature: creatorSignature,
      payee: first.payee,
      phone: first.phone,
      ...(first.isCorporateCard
        ? {}
        : {
            bankName: first.bankName,
            bankAccount: first.bankAccount,
            bankBookUrl: first.isVendorRequest
              ? first.vendorBankBookUrl || ''
              : userData?.bankBookUrl || userData?.bankBookDriveUrl || ''
          }),
      session: first.session,
      committee: first.committee,
      requestedBySignature: userData?.signature || null,
      approvedBy: first.approvedBy,
      approvers,
      approvalSignature: first.approvalSignature || null,
      ...(first.isCorporateCard ? { isCorporateCard: true } : {})
    }

    const buildForCurrency = (currency: Currency): NewSettlement | null => {
      const reqsForCurrency = reqs.filter((r) =>
        r.items.some((i) => getItemCurrency(i) === currency)
      )
      if (reqsForCurrency.length === 0) return null
      const items = reqsForCurrency.flatMap((r) =>
        r.items.filter((i) => getItemCurrency(i) === currency)
      )
      const receipts = reqsForCurrency.flatMap((r) => r.receipts)
      const sum = currency === 'USD' ? sumByCurrency(items).usd : sumByCurrency(items).krw
      const out: NewSettlement = {
        ...base,
        batchId: resolveBatchId(!!first.isCorporateCard, currency),
        currency,
        items,
        totalAmount: currency === 'KRW' ? sum : 0,
        ...(currency === 'USD' ? { totalAmountUsd: sum } : {}),
        receipts,
        requestIds: reqsForCurrency.map((r) => r.id)
      }
      return out
    }

    return CURRENCY_OPTIONS.map(buildForCurrency).filter((d): d is NewSettlement => d !== null)
  })
}
