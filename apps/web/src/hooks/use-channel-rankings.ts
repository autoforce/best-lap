import { useQueries } from '@tanstack/react-query'
import { metricsApi } from '@/lib/api/endpoints'
import type { Period, AverageMetric, Channel } from '@/types/api'
import { useMemo } from 'react'

const METRICS_QUERY_KEY = 'metrics'

export interface ChannelPerformance {
  channelId: string
  channelName: string
  avgScore: number
  diffFromAverage: number
  latestMetric: AverageMetric | null
}

export interface ChannelRankings {
  topPerformers: ChannelPerformance[]
  bottomPerformers: ChannelPerformance[]
  overallAverage: number
  isLoading: boolean
  isError: boolean
}

export function useChannelRankings(
  channels: Channel[],
  period: Period
): ChannelRankings {
  // Fetch metrics for all channels
  const queries = useQueries({
    queries: channels.map((channel) => ({
      queryKey: [METRICS_QUERY_KEY, 'channel', channel.id, period],
      queryFn: async () => {
        const { data } = await metricsApi.getChannelAverage(channel.id, period)
        return {
          channelId: channel.id,
          channelName: channel.name,
          metrics: data.metrics || [],
        }
      },
      enabled: channels.length > 0,
    })),
  })

  const rankings = useMemo(() => {
    // Check if all queries are loaded
    const allLoaded = queries.every((q) => !q.isLoading)
    const anyError = queries.some((q) => q.isError)
    const isLoading = queries.some((q) => q.isLoading)

    if (!allLoaded || queries.length === 0) {
      return {
        topPerformers: [],
        bottomPerformers: [],
        overallAverage: 0,
        isLoading,
        isError: anyError,
      }
    }

    // Extract latest metric for each channel
    const channelPerformances: Array<{
      channelId: string
      channelName: string
      avgScore: number
      latestMetric: AverageMetric | null
    }> = []

    queries.forEach((query) => {
      if (!query.data) return

      const { channelId, channelName, metrics } = query.data

      // Get latest metric (most recent period_start)
      if (metrics.length === 0) return

      const sortedMetrics = [...metrics].sort((a, b) =>
        b.period_start.localeCompare(a.period_start)
      )
      const latestMetric = sortedMetrics[0]

      channelPerformances.push({
        channelId,
        channelName,
        avgScore: latestMetric.avg_score,
        latestMetric,
      })
    })

    // If less than 2 channels with metrics, return empty
    if (channelPerformances.length < 2) {
      return {
        topPerformers: [],
        bottomPerformers: [],
        overallAverage: 0,
        isLoading: false,
        isError: anyError,
      }
    }

    // Calculate overall average
    const overallAverage =
      channelPerformances.reduce((sum, cp) => sum + cp.avgScore, 0) /
      channelPerformances.length

    // Sort by avgScore descending
    const sorted = [...channelPerformances].sort(
      (a, b) => b.avgScore - a.avgScore
    )

    // Get top performers (max 3)
    const topPerformers = sorted.slice(0, 3).map((cp) => ({
      ...cp,
      diffFromAverage: cp.avgScore - overallAverage,
    }))

    // Get bottom performers (max 3, avoid duplicates if less than 6 channels)
    let bottomPerformers: ChannelPerformance[] = []
    if (sorted.length >= 6) {
      bottomPerformers = sorted.slice(-3).reverse().map((cp) => ({
        ...cp,
        diffFromAverage: cp.avgScore - overallAverage,
      }))
    } else if (sorted.length > 3) {
      // If 4-5 channels, show bottom ones that are not in top 3
      bottomPerformers = sorted.slice(3).reverse().map((cp) => ({
        ...cp,
        diffFromAverage: cp.avgScore - overallAverage,
      }))
    } else {
      // If exactly 3 channels, don't show bottom (would duplicate with top)
      bottomPerformers = []
    }

    return {
      topPerformers,
      bottomPerformers,
      overallAverage,
      isLoading: false,
      isError: anyError,
    }
  }, [queries])

  return rankings
}
