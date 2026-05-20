import { Currency, RequestItem } from '../types'

export const DEFAULT_CURRENCY: Currency = 'KRW'
export const CURRENCY_OPTIONS: Currency[] = ['KRW', 'USD']

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  KRW: '₩',
  USD: '$'
}

/** Returns the item's currency, defaulting to KRW for legacy items without the field. */
export function getItemCurrency(item: Pick<RequestItem, 'currency'>): Currency {
  return item.currency ?? DEFAULT_CURRENCY
}

/** Format a single amount with its currency symbol. KRW: ₩1,000  USD: $10.50 */
export function formatAmount(amount: number, currency: Currency = DEFAULT_CURRENCY): string {
  const symbol = CURRENCY_SYMBOL[currency]
  if (currency === 'USD') {
    return `${symbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }
  return `${symbol}${amount.toLocaleString()}`
}

/** Split items into per-currency sums. Items without currency are treated as KRW. */
export function sumByCurrency(items: RequestItem[]): { krw: number; usd: number } {
  let krw = 0
  let usd = 0
  for (const item of items) {
    if (getItemCurrency(item) === 'USD') usd += item.amount
    else krw += item.amount
  }
  return { krw, usd }
}

/**
 * Format a combined total. Skips currencies with zero amount.
 * When both are zero, returns the KRW zero (₩0).
 */
export function formatTotals(krw: number, usd: number, separator = ' + '): string {
  const parts: string[] = []
  if (krw > 0) parts.push(formatAmount(krw, 'KRW'))
  if (usd > 0) parts.push(formatAmount(usd, 'USD'))
  if (parts.length === 0) return formatAmount(0, 'KRW')
  return parts.join(separator)
}
