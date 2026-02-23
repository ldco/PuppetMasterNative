import { useCallback, useEffect, useRef, useState } from 'react'

import type { AdminProviderCapabilities } from '@/services/admin.provider.types'
import { adminService, type AdminDirectoryUser } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/types/config'

interface UseAdminUserResult {
  user: AdminDirectoryUser | null
  isLoading: boolean
  isRefreshing: boolean
  isUpdatingRole: boolean
  error: string | null
  roleUpdateError: string | null
  source: 'remote' | 'session-fallback'
  sourceDetail: string
  capability: AdminProviderCapabilities
  refresh: () => Promise<void>
  updateRole: (role: Role) => Promise<void>
}

export const useAdminUser = (userId: string | null): UseAdminUserResult => {
  const activeUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.token)
  const [user, setUser] = useState<AdminDirectoryUser | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(userId))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isUpdatingRole, setIsUpdatingRole] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roleUpdateError, setRoleUpdateError] = useState<string | null>(null)
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
      setRoleUpdateError(null)
      setSource('session-fallback')
      setSourceDetail('Invalid route parameter')
      setIsLoading(false)
      setIsRefreshing(false)
      return () => {
        mountedRef.current = false
      }
    }

    setError(null)
    setRoleUpdateError(null)
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
    if (!userId || isRefreshing || isUpdatingRole) {
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

  const updateRole = useCallback(async (role: Role): Promise<void> => {
    if (!userId || isUpdatingRole || isRefreshing) {
      return
    }

    setRoleUpdateError(null)
    setIsUpdatingRole(true)
    const requestId = ++requestIdRef.current

    try {
      const result = await adminService.updateUserRole({
        activeUser,
        accessToken,
        userId,
        role
      })

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

      setRoleUpdateError('Failed to update user role.')
      throw new Error('Failed to update user role')
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsUpdatingRole(false)
      }
    }
  }, [accessToken, activeUser, isRefreshing, isUpdatingRole, userId])

  return {
    user,
    isLoading,
    isRefreshing,
    isUpdatingRole,
    error,
    roleUpdateError,
    source,
    sourceDetail,
    capability,
    refresh,
    updateRole
  }
}
