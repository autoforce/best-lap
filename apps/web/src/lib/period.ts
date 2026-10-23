import { format, subDays } from 'date-fns'
import type { Period } from '@/types/api'

export type RangeKey = '7d' | '30d' | '90d' | '12m'
export type Granularity = Period

export interface PeriodSelection {
  range: RangeKey
  granularity: Granularity
}

export const RANGE_OPTIONS: { value: RangeKey; label: string; days: number }[] = [
  { value: '7d', label: '7 dias', days: 7 },
  { value: '30d', label: '30 dias', days: 30 },
  { value: '90d', label: '90 dias', days: 90 },
  { value: '12m', label: '12 meses', days: 364 },
]

export const GRANULARITY_LABELS: Record<Granularity, string> = {
  hourly: 'Cada coleta',
  daily: 'Dia',
  weekly: 'Semana',
}

/**
 * What each range can be grouped by, given what the database keeps today:
 * raw collections for 14 days, daily averages for 90 days, weekly averages with no limit.
 */
export const ALLOWED_GRANULARITIES: Record<RangeKey, Granularity[]> = {
  '7d': ['hourly', 'daily'],
  '30d': ['daily', 'weekly'],
  '90d': ['daily', 'weekly'],
  '12m': ['weekly'],
}

const DEFAULT_GRANULARITY: Record<RangeKey, Granularity> = {
  '7d': 'daily',
  '30d': 'daily',
  '90d': 'daily',
  '12m': 'weekly',
}

export const DEFAULT_PERIOD: PeriodSelection = { range: '30d', granularity: 'daily' }

const isRange = (value: unknown): value is RangeKey =>
  RANGE_OPTIONS.some((option) => option.value === value)

/** Turns untrusted values (URL search params) into a valid selection */
export function normalizePeriod(range: unknown, granularity: unknown): PeriodSelection {
  const safeRange = isRange(range) ? range : DEFAULT_PERIOD.range
  const allowed = ALLOWED_GRANULARITIES[safeRange]
  const safeGranularity = allowed.includes(granularity as Granularity)
    ? (granularity as Granularity)
    : DEFAULT_GRANULARITY[safeRange]
  return { range: safeRange, granularity: safeGranularity }
}

const rangeDays = (range: RangeKey) => RANGE_OPTIONS.find((o) => o.value === range)!.days

const toDay = (date: Date) => format(date, 'yyyy-MM-dd')

export interface PeriodWindow {
  startDate: string
  endDate: string
  previousStartDate: string
}

export function periodWindow(selection: PeriodSelection, now = new Date()): PeriodWindow {
  const days = rangeDays(selection.range)
  const start = subDays(now, days - 1)
  return {
    startDate: toDay(start),
    endDate: toDay(now),
    previousStartDate: toDay(subDays(start, days)),
  }
}

/** Query params for the API. With `withPrevious`, the window also covers the previous range for deltas */
export function periodQuery(selection: PeriodSelection, withPrevious = false) {
  const window = periodWindow(selection)
  return {
    startDate: withPrevious ? window.previousStartDate : window.startDate,
    endDate: window.endDate,
  }
}

/** Splits points fetched with `withPrevious` into the current and the previous range */
export function splitByPeriod<T extends { period_start: string }>(
  points: T[],
  selection: PeriodSelection
): { current: T[]; previous: T[] } {
  const { startDate } = periodWindow(selection)
  const current: T[] = []
  const previous: T[] = []
  for (const point of points) {
    if (point.period_start.slice(0, 10) >= startDate) current.push(point)
    else previous.push(point)
  }
  return { current, previous }
}

export function describePeriod(selection: PeriodSelection): string {
  const range = RANGE_OPTIONS.find((o) => o.value === selection.range)!
  const unit = {
    hourly: 'cada coleta',
    daily: 'dia',
    weekly: 'semana',
  }[selection.granularity]
  return `Últimos ${range.label}, um ponto por ${unit}`
}

export function rangeLabel(selection: PeriodSelection): string {
  return `últimos ${RANGE_OPTIONS.find((o) => o.value === selection.range)!.label}`
}

export function previousPeriodLabel(selection: PeriodSelection): string {
  const range = RANGE_OPTIONS.find((o) => o.value === selection.range)!
  return `vs. ${range.label} anteriores`
}

/**
 * Date to display for an aggregated point. Daily and weekly buckets start at midnight UTC,
 * so they are shown as that calendar day instead of being shifted by the local timezone.
 */
export function bucketDate(periodStart: string, granularity: Granularity): Date {
  if (granularity === 'hourly') return new Date(periodStart)
  const [year, month, day] = periodStart.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}
