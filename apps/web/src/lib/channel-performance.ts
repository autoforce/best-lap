import { format, subDays } from 'date-fns'
import type { ChannelMetricGrouped } from '@/types/api'
import { computeDelta, readMetric, summarize, type MetricDelta } from '@/lib/metrics'

export interface ChannelPerformanceSnapshot {
  score: number | null
  scoreDelta: MetricDelta | null
  lcp: number | null
  cls: number | null
  trend: number[]
}

/**
 * Per-channel snapshot for lists: score of the last 7 days, change against the 7 days before,
 * and a 30-day daily trend. Expects daily rows covering at least the last 30 days.
 */
export function buildChannelSnapshots(
  rows: ChannelMetricGrouped[],
  now = new Date()
): Map<string, ChannelPerformanceSnapshot> {
  const last7Start = format(subDays(now, 6), 'yyyy-MM-dd')
  const prev7Start = format(subDays(now, 13), 'yyyy-MM-dd')
  const trendStart = format(subDays(now, 29), 'yyyy-MM-dd')

  const byChannel = new Map<string, ChannelMetricGrouped[]>()
  for (const row of rows) {
    const list = byChannel.get(row.channel_id) ?? []
    list.push(row)
    byChannel.set(row.channel_id, list)
  }

  const snapshots = new Map<string, ChannelPerformanceSnapshot>()
  for (const [channelId, list] of byChannel) {
    list.sort((a, b) => a.period_start.localeCompare(b.period_start))
    const day = (r: ChannelMetricGrouped) => r.period_start.slice(0, 10)

    const last7 = summarize(list.filter((r) => day(r) >= last7Start))
    const prev7 = summarize(list.filter((r) => day(r) >= prev7Start && day(r) < last7Start))

    snapshots.set(channelId, {
      score: last7.score,
      scoreDelta: computeDelta('score', last7.score, prev7.score),
      lcp: last7.lcp,
      cls: last7.cls,
      trend: list
        .filter((r) => day(r) >= trendStart)
        .map((r) => readMetric(r, 'score'))
        .filter((v): v is number => v !== null),
    })
  }

  return snapshots
}
