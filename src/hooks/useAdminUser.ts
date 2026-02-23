import { useCallback, useEffect, useRef, useState } from 'react'

import type { AdminProviderCapabilities } from '@/services/admin.provider.types'
import { adminService, type AdminDirectoryUser } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'

interface UseAdminUserResult {
  user: AdminDirectoryUser | null
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  source: 'remote' | 'session-fallback'
  sourceDetail: string
  capability: AdminProviderCapabilities
  refresh: () => Promise<void>
}

export const useAdminUser = (userId: string | null): UseAdminUserResult => {
  const activeUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.token)
  const [user, setUser] = useState<AdminDirectoryUser | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(userId))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'remote' | 'session-fallback'>('session-fallback')
  const [sourceDetail, setSourceDetail] = useState('Not loaded yet')
  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)
  const capability = adminService.getCapabilities()

  useEffect(() => {
    mountedRef.current = true

    if (!userId) {
      requestIdRef.current += 1
      setUser(null)
      setError('Missing user id.')
      setSource('session-fallback')
      setSourceDetail('Invalid route parameter')
      setIsLoading(false)
      setIsRefreshing(false)
      return () => {
        mountedRef.current = false
      }
    }

    setError(null)
    setIsLoading(true)
    const requestId = ++requestIdRef.current

    void adminService
      .getUser({ activeUser, accessToken, userId })
      .then((result) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return
        }

        setUser(result.user)
        setSource(result.source)
        setSourceDetail(result.sourceDetail)
        setIsLoading(false)
      })
      .catch(() => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return
        }

        setUser(null)
        setError('Failed to load admin user.')
        setSource('session-fallback')
        setSourceDetail('Provider request failed')
        setIsLoading(false)
      })

    return () => {
      mountedRef.current = false
    }
  }, [accessToken, activeUser, userId])

  const refresh = useCallback(async (): Promise<void> => {
    if (!userId || isRefreshing) {
      return
    }

    setError(null)
    setIsRefreshing(true)
    const requestId = ++requestIdRef.current

    try {
      const result = await adminService.getUser({ activeUser, accessToken, userId })
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setUser(result.user)
      setSource(result.source)
      setSourceDetail(result.sourceDetail)
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setError('Failed to refresh admin user.')
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsRefreshing(false)
      }
    }
  }, [accessToken, activeUser, isRefreshing, userId])

  return {
    user,
    isLoading,
    isRefreshing,
    error,
    source,
    sourceDetail,
    capability,
    refresh
  }
}
