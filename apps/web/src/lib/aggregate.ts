import type { AverageMetric, ChannelMetricGrouped } from '@/types/api'
import { METRICS, readMetric, type MetricKey } from '@/lib/metrics'

/**
 * Averages channel rows into one series per group (theme, provider...),
 * giving each channel the same weight in every period.
 */
export function aggregateByGroup(
  rows: ChannelMetricGrouped[],
  groupOf: (channelId: string) => string | undefined
): Map<string, AverageMetric[]> {
  const buckets = new Map<string, Map<string, ChannelMetricGrouped[]>>()

  for (const row of rows) {
    const group = groupOf(row.channel_id)
    if (!group) continue
    const byPeriod = buckets.get(group) ?? new Map<string, ChannelMetricGrouped[]>()
    const list = byPeriod.get(row.period_start) ?? []
    list.push(row)
    byPeriod.set(row.period_start, list)
    buckets.set(group, byPeriod)
  }

  const result = new Map<string, AverageMetric[]>()
  for (const [group, byPeriod] of buckets) {
    const series = [...byPeriod.entries()]
      .map(([period_start, list]) => {
        const point = { period_start } as AverageMetric
        for (const key of Object.keys(METRICS) as MetricKey[]) {
          const values = list.map((r) => readMetric(r, key)).filter((v): v is number => v !== null)
          ;(point as unknown as Record<string, number>)[`avg_${key}`] = values.length
            ? values.reduce((a, b) => a + b, 0) / values.length
            : NaN
        }
        return point
      })
      .sort((a, b) => a.period_start.localeCompare(b.period_start))
    result.set(group, series)
  }

  return result
}
