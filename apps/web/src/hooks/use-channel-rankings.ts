import { useMemo } from 'react'
import type { ChannelMetricGrouped } from '@/types/api'
import { readMetric } from '@/lib/metrics'

export interface ChannelPerformance {
  channelId: string
  channelName: string
  avgScore: number
  diffFromAverage: number
}

export interface ChannelRankings {
  topPerformers: ChannelPerformance[]
  bottomPerformers: ChannelPerformance[]
  overallAverage: number
}

/**
 * Ranks channels by their average score over the selected period
 * (the same definition the KPI cards use, instead of only the last bucket).
 */
export function useChannelRankings(rows: ChannelMetricGrouped[], channelIds?: Set<string>): ChannelRankings {
  return useMemo(() => {
    const totals = new Map<string, { name: string; sum: number; count: number }>()

    for (const row of rows) {
      if (channelIds && !channelIds.has(row.channel_id)) continue
      const score = readMetric(row, 'score')
      if (score === null) continue
      const entry = totals.get(row.channel_id) ?? { name: row.channel_name, sum: 0, count: 0 }
      entry.sum += score
      entry.count += 1
      totals.set(row.channel_id, entry)
    }

    const performances = [...totals.entries()].map(([channelId, t]) => ({
      channelId,
      channelName: t.name,
      avgScore: t.sum / t.count,
    }))

    if (performances.length < 2) {
      return { topPerformers: [], bottomPerformers: [], overallAverage: 0 }
    }

    const overallAverage = performances.reduce((sum, p) => sum + p.avgScore, 0) / performances.length
    const sorted = [...performances].sort((a, b) => b.avgScore - a.avgScore)
    const withDiff = (p: (typeof performances)[number]) => ({ ...p, diffFromAverage: p.avgScore - overallAverage })

    const topPerformers = sorted.slice(0, 3).map(withDiff)
    // Never repeat a channel already listed in the top 3
    const bottomPerformers = sorted.slice(Math.max(3, sorted.length - 3)).reverse().map(withDiff)

    return { topPerformers, bottomPerformers, overallAverage }
  }, [rows, channelIds])
}
