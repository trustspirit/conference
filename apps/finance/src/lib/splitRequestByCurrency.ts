import type { PaymentRequest, RequestItem, Receipt, Currency } from '../types'
import { getItemCurrency, sumByCurrency, CURRENCY_OPTIONS } from './currency'

export type NewRequest = Omit<PaymentRequest, 'id' | 'createdAt'>

/** True when the item list contains at least one KRW item and one USD item. */
export function hasMixedCurrency(items: RequestItem[]): boolean {
  let krw = false
  let usd = false
  for (const i of items) {
    if (getItemCurrency(i) === 'USD') usd = true
    else krw = true
  }
  return krw && usd
}

/** A side needs a receipt unless every one of its items is car transport. */
export function isCarOnly(items: RequestItem[]): boolean {
  return items.length > 0 && items.every((i) => i.transportDetail?.transportType === 'car')
}

function receiptsForCurrency(
  currency: Currency,
  receipts: Receipt[],
  usdReceiptPaths: Set<string>
): Receipt[] {
  return currency === 'USD'
    ? receipts.filter((r) => usdReceiptPaths.has(r.storagePath))
    : receipts.filter((r) => !usdReceiptPaths.has(r.storagePath))
}

/**
 * Currencies that have items, are not car-only, yet have zero receipts assigned.
 * Used to block submission until the user assigns at least one receipt per side.
 */
export function missingReceiptCurrencies(
  items: RequestItem[],
  receipts: Receipt[],
  usdReceiptPaths: Set<string>
): Currency[] {
  const missing: Currency[] = []
  for (const currency of CURRENCY_OPTIONS) {
    const cItems = items.filter((i) => getItemCurrency(i) === currency)
    if (cItems.length === 0 || isCarOnly(cItems)) continue
    if (receiptsForCurrency(currency, receipts, usdReceiptPaths).length === 0)
      missing.push(currency)
  }
  return missing
}

/**
 * Split a request payload into one payload per present currency. Single-currency
 * input is returned unchanged. For a mixed request, items are partitioned by
 * `getItemCurrency` and receipts by `usdReceiptPaths`; each payload's totals are
 * recomputed (totalAmountUsd omitted when 0). All other fields are duplicated.
 */
export function splitRequestByCurrency(
  req: NewRequest,
  usdReceiptPaths: Set<string>
): NewRequest[] {
  const present = CURRENCY_OPTIONS.filter((c) => req.items.some((i) => getItemCurrency(i) === c))
  if (present.length <= 1) return [req]

  return present.map((currency) => {
    const items = req.items.filter((i) => getItemCurrency(i) === currency)
    const receipts = receiptsForCurrency(currency, req.receipts, usdReceiptPaths)
    const sums = sumByCurrency(items)
    // receiptDisplaySizes is intentionally not split — it is not set at submission time.
    return {
      ...req,
      items,
      receipts,
      totalAmount: sums.krw,
      totalAmountUsd: sums.usd > 0 ? sums.usd : undefined
    }
  })
}
