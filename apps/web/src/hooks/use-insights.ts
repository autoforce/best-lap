import { useQuery } from '@tanstack/react-query'
import { insightsApi } from '@/lib/api/endpoints'

// Under the "metrics" key, so they reload with the metrics when a collection finishes
const INSIGHTS_KEY = ['metrics', 'insights']

export function useAttentionItems(providerId?: string) {
  return useQuery({
    queryKey: [...INSIGHTS_KEY, 'attention', providerId ?? 'all'],
    queryFn: async () => (await insightsApi.getAttention(providerId)).data,
  })
}

export function useCommonOpportunities(filter: { theme?: string; providerId?: string } = {}) {
  return useQuery({
    queryKey: [...INSIGHTS_KEY, 'opportunities', filter.theme ?? 'all', filter.providerId ?? 'all'],
    queryFn: async () => (await insightsApi.getCommonOpportunities(filter)).data,
  })
}

export function useChannelInsights(channelId: string | undefined) {
  return useQuery({
    queryKey: [...INSIGHTS_KEY, 'channel', channelId],
    queryFn: async () => (await insightsApi.getChannelInsights(channelId!)).data.pages,
    enabled: !!channelId,
  })
}

export function usePageDiagnosis(pageId: string | undefined) {
  return useQuery({
    queryKey: [...INSIGHTS_KEY, 'diagnosis', 'page', pageId],
    queryFn: async () => (await insightsApi.getPageDiagnosis(pageId!)).data,
    enabled: !!pageId,
  })
}

export function useGroupDiagnosis(filter: { theme?: string; providerId?: string }) {
  return useQuery({
    queryKey: [...INSIGHTS_KEY, 'diagnosis', 'group', filter.theme ?? 'all', filter.providerId ?? 'all'],
    queryFn: async () => (await insightsApi.getGroupDiagnosis(filter)).data,
  })
}
