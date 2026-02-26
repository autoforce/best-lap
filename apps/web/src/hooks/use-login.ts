import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/lib/api/endpoints'
import { useAuth } from '@/contexts/auth-context'
import type { LoginCredentials } from '@/types/api'

export function useLogin() {
  const { login } = useAuth()

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (response) => {
      login(response.data.user, response.data.token)
    },
  })
}
