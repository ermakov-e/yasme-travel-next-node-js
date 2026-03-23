'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useAuthStore, type AuthUser } from '@/store/auth.store'

export function useAuth() {
  const { user, isLoading, setUser, setLoading } = useAuthStore()

  const { data, error, isLoading: queryLoading } = useQuery<AuthUser>({
    queryKey: ['user', 'me'],
    queryFn: () => api.get<AuthUser>('/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  useEffect(() => {
    if (queryLoading) {
      setLoading(true)
      return
    }

    if (error instanceof ApiError && error.statusCode === 401) {
      setUser(null)
      return
    }

    if (data) {
      setUser(data)
    }
  }, [data, error, queryLoading, setUser, setLoading])

  return { user, isLoading: isLoading || queryLoading }
}
