import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/lib/api/endpoints'
import type { CreateUserInput } from '@/types/api'

const USERS_QUERY_KEY = 'users'

export function useUsers() {
  return useQuery({
    queryKey: [USERS_QUERY_KEY],
    queryFn: async () => {
      const { data } = await usersApi.getAll()
      return data.users || []
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUserInput) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => usersApi.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] })
    },
  })
}
