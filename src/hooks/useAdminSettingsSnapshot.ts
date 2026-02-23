import { useCallback, useEffect, useRef, useState } from 'react'

import type { AdminProviderCapabilities } from '@/services/admin.provider.types'
import { adminService, type AdminSettingsSnapshot } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'

interface UseAdminSettingsSnapshotResult {
  settings: AdminSettingsSnapshot | null
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  source: 'remote' | 'config-fallback'
  sourceDetail: string
  capability: AdminProviderCapabilities
  refresh: () => Promise<void>
}

export const useAdminSettingsSnapshot = (): UseAdminSettingsSnapshotResult => {
  const activeUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.token)
  const [settings, setSettings] = useState<AdminSettingsSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(activeUser))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'remote' | 'config-fallback'>('config-fallback')
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
      .getSettings({ activeUser, accessToken })
      .then((result) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return
        }

        setSettings(result.settings)
        setSource(result.source)
        setSourceDetail(result.sourceDetail)
        setIsLoading(false)
      })
      .catch(() => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return
        }

        setSettings(null)
        setError('Failed to load admin settings snapshot.')
        setSource('config-fallback')
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
      const result = await adminService.refreshSettings({ activeUser, accessToken })
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setSettings(result.settings)
      setSource(result.source)
      setSourceDetail(result.sourceDetail)
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setError('Failed to refresh admin settings snapshot.')
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsRefreshing(false)
      }
    }
  }, [accessToken, activeUser, isRefreshing])

  return {
    settings,
    isLoading,
    isRefreshing,
    error,
    source,
    sourceDetail,
    capability,
    refresh
  }
}
