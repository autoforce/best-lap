import { useQuery } from '@tanstack/react-query'
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
  // Fetch metrics for all channels in a single request
  const { data, isLoading, isError } = useQuery({
    queryKey: [METRICS_QUERY_KEY, 'all-channels-grouped', period],
    queryFn: async () => {
      const { data } = await metricsApi.getAllGroupedByChannel(period)
      return data.metrics
    },
    enabled: channels.length > 0,
  })

  const rankings = useMemo(() => {
    if (isLoading || !data) {
      return {
        topPerformers: [],
        bottomPerformers: [],
        overallAverage: 0,
        isLoading,
        isError,
      }
    }

    // Group metrics by channel and get latest metric for each
    const channelMetricsMap = new Map<string, {
      channelId: string
      channelName: string
      metrics: AverageMetric[]
    }>()

    data.forEach((metric) => {
      if (!channelMetricsMap.has(metric.channel_id)) {
        channelMetricsMap.set(metric.channel_id, {
          channelId: metric.channel_id,
          channelName: metric.channel_name,
          metrics: [],
        })
      }
      channelMetricsMap.get(metric.channel_id)!.metrics.push({
        period_start: metric.period_start,
        avg_score: metric.avg_score,
        avg_seo: metric.avg_seo,
        avg_response_time: metric.avg_response_time,
        avg_fcp: metric.avg_fcp,
        avg_si: metric.avg_si,
        avg_lcp: metric.avg_lcp,
        avg_tbt: metric.avg_tbt,
        avg_cls: metric.avg_cls,
      })
    })

    // Extract latest metric for each channel
    const channelPerformances: Array<{
      channelId: string
      channelName: string
      avgScore: number
      latestMetric: AverageMetric | null
    }> = []

    channelMetricsMap.forEach(({ channelId, channelName, metrics }) => {
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
        isError,
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
      isError,
    }
  }, [data, isLoading, isError])

  return rankings
}
