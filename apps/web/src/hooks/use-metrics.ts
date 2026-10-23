import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insightsApi, metricsApi } from '@/lib/api/endpoints'
import type { AverageMetric, ChannelMetricGrouped, PageMetricGrouped } from '@/types/api'
import { toast } from '@/hooks/use-toast'
import {
  periodQuery,
  splitByPeriod,
  type PeriodSelection,
} from '@/lib/period'
import { COLLECTION_STATUS_QUERY_KEY } from '@/hooks/use-collection-status'

export const METRICS_QUERY_KEY = 'metrics'

/**
 * Every metrics hook fetches the selected range plus the previous one,
 * so screens can show the change against the previous period.
 */
function usePeriodMetrics<T extends { period_start: string }>(
  key: unknown[],
  selection: PeriodSelection,
  fetcher: (params: { startDate: string; endDate: string }) => Promise<T[]>,
  enabled = true
) {
  const params = periodQuery(selection, true)

  return useQuery({
    queryKey: [METRICS_QUERY_KEY, ...key, selection.granularity, params.startDate, params.endDate],
    queryFn: () => fetcher(params),
    enabled,
    select: (points) => ({ all: points, ...splitByPeriod(points, selection) }),
  })
}

export function useRawMetrics(channelId: string | undefined) {
  return useQuery({
    queryKey: [METRICS_QUERY_KEY, 'raw', channelId],
    queryFn: async () => {
      if (!channelId) throw new Error('Channel ID is required')
      const { data } = await metricsApi.getRawMetrics(channelId)
      return data.metrics || []
    },
    enabled: !!channelId,
  })
}

/** Averages of one page of a channel; without `pageId`, the home page */
export function useChannelMetrics(channelId: string | undefined, selection: PeriodSelection, pageId?: string) {
  return usePeriodMetrics<AverageMetric>(
    ['channel', channelId, pageId ?? 'home'],
    selection,
    async (params) => {
      const { data } = await metricsApi.getChannelAverage(channelId!, selection.granularity, {
        ...params,
        ...(pageId && { page_id: pageId }),
      })
      return data.metrics || []
    },
    !!channelId
  )
}

/** Every page of a channel, grouped by page and period */
export function useChannelPagesMetrics(channelId: string | undefined, selection: PeriodSelection) {
  return usePeriodMetrics<PageMetricGrouped>(
    ['channel-pages', channelId],
    selection,
    async (params) => {
      const { data } = await insightsApi.getChannelPagesMetrics(channelId!, selection.granularity, params)
      return data.metrics || []
    },
    !!channelId
  )
}

export function useAllMetrics(selection: PeriodSelection, enabled = true) {
  return usePeriodMetrics<AverageMetric>(
    ['all'],
    selection,
    async (params) => {
      const { data } = await metricsApi.getAllAverage(selection.granularity, params)
      return data.metrics || []
    },
    enabled
  )
}

export function useThemeMetrics(theme: string | undefined, selection: PeriodSelection) {
  return usePeriodMetrics<AverageMetric>(
    ['theme', theme],
    selection,
    async (params) => {
      const { data } = await metricsApi.getThemeAverage(theme!, selection.granularity, params)
      return data.metrics || []
    },
    !!theme
  )
}

export function useProviderMetrics(providerId: string | undefined, selection: PeriodSelection) {
  return usePeriodMetrics<AverageMetric>(
    ['provider', providerId],
    selection,
    async (params) => {
      const { data } = await metricsApi.getProviderAverage(providerId!, selection.granularity, params)
      return data.metrics || []
    },
    !!providerId
  )
}

/** Fetches the average of several providers in a single query key per provider */
export function providerMetricsQuery(providerId: string, selection: PeriodSelection, enabled: boolean) {
  const params = periodQuery(selection, true)
  return {
    queryKey: [METRICS_QUERY_KEY, 'provider', providerId, selection.granularity, params.startDate, params.endDate],
    queryFn: async () => {
      const { data } = await metricsApi.getProviderAverage(providerId, selection.granularity, params)
      return data.metrics || []
    },
    enabled,
    select: (points: AverageMetric[]) => ({ providerId, ...splitByPeriod(points, selection) }),
  }
}

// One request returns every active channel's home page metrics, grouped by channel and period
export function useAllChannelsMetricsGrouped(selection: PeriodSelection, enabled = true) {
  return usePeriodMetrics<ChannelMetricGrouped>(
    ['all-channels-grouped'],
    selection,
    async (params) => {
      const { data } = await metricsApi.getAllGroupedByChannel(selection.granularity, params)
      return data.metrics || []
    },
    enabled
  )
}

/** Groups the flat grouped-endpoint rows by channel, keeping period order */
export function groupByChannel(rows: ChannelMetricGrouped[]): Map<string, ChannelMetricGrouped[]> {
  const map = new Map<string, ChannelMetricGrouped[]>()
  for (const row of rows) {
    const list = map.get(row.channel_id)
    if (list) list.push(row)
    else map.set(row.channel_id, [row])
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.period_start.localeCompare(b.period_start))
  }
  return map
}

// Collection triggers: instead of guessing when jobs finish, refresh the queue status;
// the freshness indicator reloads metrics once the queue drains.
function useTriggerCollection<TVars>(
  mutationFn: (vars: TVars) => Promise<{ jobs_count: number }>,
  title: string
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      toast({
        title,
        description: `${data.jobs_count} ${data.jobs_count === 1 ? 'página na fila' : 'páginas na fila'}. Cada uma leva de 20 a 60 segundos; os dados aparecem sozinhos quando a fila terminar.`,
      })
      queryClient.invalidateQueries({ queryKey: [COLLECTION_STATUS_QUERY_KEY] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Não foi possível iniciar a coleta',
        description: error.message || 'Tente novamente em alguns minutos.',
        variant: 'destructive',
      })
    },
  })
}

export function useTriggerCollectionAll() {
  return useTriggerCollection<void>(async () => {
    const { data } = await metricsApi.triggerCollectionAll()
    return data
  }, 'Coleta iniciada')
}

export function useTriggerCollectionChannel() {
  return useTriggerCollection(async (channelId: string) => {
    const { data } = await metricsApi.triggerCollectionChannel(channelId)
    return data
  }, 'Coleta do canal iniciada')
}

export function useTriggerCollectionPage() {
  return useTriggerCollection(async ({ channelId, pageId }: { channelId: string; pageId: string }) => {
    const { data } = await metricsApi.triggerCollectionPage(channelId, pageId)
    return data
  }, 'Coleta da página iniciada')
}
