import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { metricsApi } from '@/lib/api/endpoints'
import { toast } from '@/hooks/use-toast'
import type { CollectionStatus } from '@/types/api'

export const COLLECTION_STATUS_QUERY_KEY = 'collection-status'

export function pendingJobs(status: CollectionStatus | undefined): number {
  if (!status?.queue) return 0
  return status.queue.waiting + status.queue.active + status.queue.delayed
}

/**
 * Polls fast while there are jobs in the queue and slowly otherwise.
 * When the queue drains, reloads every metrics query so new numbers appear on their own.
 */
export function useCollectionStatus() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: [COLLECTION_STATUS_QUERY_KEY],
    queryFn: async () => {
      const { data } = await metricsApi.getCollectionStatus()
      return data
    },
    staleTime: 0,
    refetchInterval: (q) => (pendingJobs(q.state.data) > 0 ? 5000 : 60000),
    refetchOnWindowFocus: true,
  })

  const pending = pendingJobs(query.data)
  const previousPending = useRef(pending)

  useEffect(() => {
    if (previousPending.current > 0 && pending === 0) {
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      toast({
        title: 'Coleta concluída',
        description: 'Os números da tela foram atualizados.',
      })
    }
    previousPending.current = pending
  }, [pending, queryClient])

  return { ...query, pending }
}
