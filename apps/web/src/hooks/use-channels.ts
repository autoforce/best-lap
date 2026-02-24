import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { channelsApi } from '@/lib/api/endpoints'
import type { CreateChannelInput, UpdateChannelInput } from '@/types/api'

const CHANNELS_QUERY_KEY = 'channels'

export function useChannels() {
  return useQuery({
    queryKey: [CHANNELS_QUERY_KEY],
    queryFn: async () => {
      const { data } = await channelsApi.getAll()
      return data.channels || []
    },
  })
}

export function useChannel(channelId: string | undefined) {
  return useQuery({
    queryKey: [CHANNELS_QUERY_KEY, channelId],
    queryFn: async () => {
      if (!channelId) throw new Error('Channel ID is required')
      const { data } = await channelsApi.getById(channelId)
      return data.channel
    },
    enabled: !!channelId,
  })
}

export function useChannelsByTheme(theme: string | undefined) {
  return useQuery({
    queryKey: [CHANNELS_QUERY_KEY, 'theme', theme],
    queryFn: async () => {
      if (!theme) throw new Error('Theme is required')
      const { data } = await channelsApi.getByTheme(theme)
      return data.channels || []
    },
    enabled: !!theme,
    staleTime: 0, // Always refetch when theme changes
  })
}

export function useCreateChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateChannelInput) => channelsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CHANNELS_QUERY_KEY] })
    },
  })
}

export function useUpdateChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      channelId,
      data,
    }: {
      channelId: string
      data: UpdateChannelInput
    }) => channelsApi.update(channelId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CHANNELS_QUERY_KEY] })
      queryClient.invalidateQueries({
        queryKey: [CHANNELS_QUERY_KEY, variables.channelId],
      })
    },
  })
}

export function useDeleteChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (channelId: string) => channelsApi.delete(channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CHANNELS_QUERY_KEY] })
    },
  })
}

export function useEnableChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (channelId: string) => channelsApi.enable(channelId),
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({ queryKey: [CHANNELS_QUERY_KEY] })
      queryClient.invalidateQueries({
        queryKey: [CHANNELS_QUERY_KEY, channelId],
      })
    },
  })
}

export function useDisableChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (channelId: string) => channelsApi.disable(channelId),
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({ queryKey: [CHANNELS_QUERY_KEY] })
      queryClient.invalidateQueries({
        queryKey: [CHANNELS_QUERY_KEY, channelId],
      })
    },
  })
}
