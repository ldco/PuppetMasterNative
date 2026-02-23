import { useCallback, useEffect, useRef, useState } from 'react'

import type { AdminProviderCapabilities } from '@/services/admin.provider.types'
import { adminService, type AdminLogEntry } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'

interface UseAdminLogsResult {
  logs: AdminLogEntry[]
  isLoading: boolean
  isRefreshing: boolean
  isClearing: boolean
  error: string | null
  clearError: string | null
  source: 'remote' | 'local-fallback'
  sourceDetail: string
  capability: AdminProviderCapabilities
  refresh: () => Promise<void>
  clear: () => Promise<number | null>
}

export const useAdminLogs = (limit = 50): UseAdminLogsResult => {
  const activeUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.token)
  const [logs, setLogs] = useState<AdminLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(activeUser))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clearError, setClearError] = useState<string | null>(null)
  const [source, setSource] = useState<'remote' | 'local-fallback'>('local-fallback')
  const [sourceDetail, setSourceDetail] = useState('Not loaded yet')
  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)
  const capability = adminService.getCapabilities()

  useEffect(() => {
    mountedRef.current = true

    setError(null)
    setClearError(null)
    setIsLoading(true)
    const requestId = ++requestIdRef.current

    void adminService
      .getLogs({ activeUser, accessToken, limit })
      .then((result) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return
        }

        setLogs(result.logs)
        setSource(result.source)
        setSourceDetail(result.sourceDetail)
        setIsLoading(false)
      })
      .catch(() => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return
        }

        setLogs([])
        setError('Failed to load admin logs.')
        setClearError(null)
        setSource('local-fallback')
        setSourceDetail('Provider request failed')
        setIsLoading(false)
      })

    return () => {
      mountedRef.current = false
    }
  }, [accessToken, activeUser, limit])

  const refresh = useCallback(async (): Promise<void> => {
    if (isRefreshing || isClearing) {
      return
    }

    setError(null)
    setClearError(null)
    setIsRefreshing(true)
    const requestId = ++requestIdRef.current

    try {
      const result = await adminService.refreshLogs({ activeUser, accessToken, limit })
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setLogs(result.logs)
      setSource(result.source)
      setSourceDetail(result.sourceDetail)
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setError('Failed to refresh admin logs.')
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsRefreshing(false)
      }
    }
  }, [accessToken, activeUser, isClearing, isRefreshing, limit])

  const clear = useCallback(async (): Promise<number | null> => {
    if (isClearing || isRefreshing) {
      return null
    }

    setError(null)
    setClearError(null)
    setIsClearing(true)
    const requestId = ++requestIdRef.current

    try {
      const result = await adminService.clearLogs({ activeUser, accessToken })
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return result.clearedCount
      }

      setLogs([])
      setSource(result.source)
      setSourceDetail(result.sourceDetail)
      return result.clearedCount
    } catch (error) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return null
      }

      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Failed to clear admin logs.'
      setClearError(message)
      throw new Error(message)
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsClearing(false)
      }
    }
  }, [accessToken, activeUser, isClearing, isRefreshing])

  return {
    logs,
    isLoading,
    isRefreshing,
    isClearing,
    error,
    clearError,
    source,
    sourceDetail,
    capability,
    refresh,
    clear
  }
}
