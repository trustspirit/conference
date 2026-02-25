import type { SurveyResponse, SurveyField } from '../types'

interface ChartData {
  labels: string[]
  data: number[]
}

interface ScaleChartData extends ChartData {
  average: number
}

/**
 * Count responses per day for the last N days, filling missing days with 0.
 */
export function getDailyRegistrationCounts(
  responses: SurveyResponse[],
  days: number,
): ChartData {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const countsMap = new Map<string, number>()
  const labels: string[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
    countsMap.set(key, 0)
    labels.push(key)
  }

  for (const r of responses) {
    const d = new Date(r.createdAt)
    d.setHours(0, 0, 0, 0)
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
    if (countsMap.has(key)) {
      countsMap.set(key, countsMap.get(key)! + 1)
    }
  }

  return { labels, data: labels.map((l) => countsMap.get(l)!) }
}

/**
 * Count occurrences of each option for radio/dropdown fields.
 */
export function getOptionDistribution(
  responses: SurveyResponse[],
  fieldId: string,
  options: string[],
): ChartData {
  const counts = new Map<string, number>(options.map((o) => [o, 0]))

  for (const r of responses) {
    const value = r.data[fieldId]
    if (typeof value === 'string' && counts.has(value)) {
      counts.set(value, counts.get(value)! + 1)
    }
  }

  return {
    labels: options,
    data: options.map((o) => counts.get(o)!),
  }
}

/**
 * Count frequency of each option in checkbox (array) fields.
 */
export function getCheckboxDistribution(
  responses: SurveyResponse[],
  fieldId: string,
  options: string[],
): ChartData {
  const counts = new Map<string, number>(options.map((o) => [o, 0]))

  for (const r of responses) {
    const value = r.data[fieldId]
    if (Array.isArray(value)) {
      for (const v of value) {
        if (typeof v === 'string' && counts.has(v)) {
          counts.set(v, counts.get(v)! + 1)
        }
      }
    }
  }

  return {
    labels: options,
    data: options.map((o) => counts.get(o)!),
  }
}

/**
 * Bucket responses into scale values min..max and compute average.
 */
export function getScaleDistribution(
  responses: SurveyResponse[],
  fieldId: string,
  min: number,
  max: number,
): ScaleChartData {
  const labels: string[] = []
  const counts = new Map<number, number>()

  for (let i = min; i <= max; i++) {
    labels.push(String(i))
    counts.set(i, 0)
  }

  let sum = 0
  let total = 0

  for (const r of responses) {
    const raw = r.data[fieldId]
    const value = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN
    if (!isNaN(value) && counts.has(value)) {
      counts.set(value, counts.get(value)! + 1)
      sum += value
      total++
    }
  }

  return {
    labels,
    data: labels.map((l) => counts.get(Number(l))!),
    average: total > 0 ? sum / total : 0,
  }
}

/**
 * Extract stake from { stake, ward } objects and count occurrences.
 */
export function getStakeDistribution(
  responses: SurveyResponse[],
  fieldId: string,
): ChartData {
  const counts = new Map<string, number>()

  for (const r of responses) {
    const value = r.data[fieldId]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const stake = (value as Record<string, unknown>).stake
      if (typeof stake === 'string' && stake) {
        counts.set(stake, (counts.get(stake) ?? 0) + 1)
      }
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return {
    labels: sorted.map(([label]) => label),
    data: sorted.map(([, count]) => count),
  }
}

/**
 * Collect non-empty text values, most recent first.
 */
export function getTextResponses(
  responses: SurveyResponse[],
  fieldId: string,
): string[] {
  const sorted = [...responses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const result: string[] = []
  for (const r of sorted) {
    const value = r.data[fieldId]
    if (typeof value === 'string' && value.trim()) {
      result.push(value.trim())
    }
  }
  return result
}

/**
 * Count responses where createdAt is today.
 */
export function getTodayCount(responses: SurveyResponse[]): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return responses.filter((r) => {
    const d = new Date(r.createdAt)
    return d >= today && d < tomorrow
  }).length
}

const CHARTABLE_TYPES = new Set(['radio', 'checkbox', 'dropdown', 'linear_scale', 'church_info'])

/**
 * Return fields suitable for chart visualization.
 */
export function getChartableFields(fields: SurveyField[]): SurveyField[] {
  return fields.filter(
    (f) => CHARTABLE_TYPES.has(f.type) || f.participantField === 'gender',
  )
}

/**
 * Return text-based fields.
 */
export function getTextFields(fields: SurveyField[]): SurveyField[] {
  return fields.filter((f) => f.type === 'short_text' || f.type === 'long_text')
}
