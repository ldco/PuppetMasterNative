import { useCallback, useEffect, useRef, useState } from 'react'

import type { AdminProviderCapabilities } from '@/services/admin.provider.types'
import { adminService, type AdminHealthSnapshot } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'

interface UseAdminHealthResult {
  health: AdminHealthSnapshot | null
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  source: 'remote' | 'local-fallback'
  sourceDetail: string
  capability: AdminProviderCapabilities
  refresh: () => Promise<void>
}

export const useAdminHealth = (): UseAdminHealthResult => {
  const activeUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.token)
  const [health, setHealth] = useState<AdminHealthSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(activeUser))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'remote' | 'local-fallback'>('local-fallback')
  const [sourceDetail, setSourceDetail] = useState('Not loaded yet')
  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)
  const capability = adminService.getCapabilities()

  useEffect(() => {
    mountedRef.current = true

    setError(null)
    setIsLoading(true)
    const requestId = ++requestIdRef.current

    void adminService
      .getHealth({ activeUser, accessToken })
      .then((result) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return
        }

        setHealth(result.health)
        setSource(result.source)
        setSourceDetail(result.sourceDetail)
        setIsLoading(false)
      })
      .catch(() => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return
        }

        setHealth(null)
        setError('Failed to load admin health status.')
        setSource('local-fallback')
        setSourceDetail('Provider request failed')
        setIsLoading(false)
      })

    return () => {
      mountedRef.current = false
    }
  }, [accessToken, activeUser])

  const refresh = useCallback(async (): Promise<void> => {
    if (isRefreshing) {
      return
    }

    setError(null)
    setIsRefreshing(true)
    const requestId = ++requestIdRef.current

    try {
      const result = await adminService.refreshHealth({ activeUser, accessToken })
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setHealth(result.health)
      setSource(result.source)
      setSourceDetail(result.sourceDetail)
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setError('Failed to refresh admin health status.')
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsRefreshing(false)
      }
    }
  }, [accessToken, activeUser, isRefreshing])

  return {
    health,
    isLoading,
    isRefreshing,
    error,
    source,
    sourceDetail,
    capability,
    refresh
  }
}
