import { useCallback, useEffect, useRef, useState } from 'react'

import {
  AdminProviderError,
  type AdminProviderCapabilities
} from '@/services/admin.provider.types'
import { adminService, type AdminDirectoryUser } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/types/config'

interface UseAdminUserResult {
  user: AdminDirectoryUser | null
  isLoading: boolean
  isRefreshing: boolean
  isUpdatingRole: boolean
  isUpdatingStatus: boolean
  isUpdatingLock: boolean
  error: string | null
  roleUpdateError: string | null
  statusUpdateError: string | null
  lockUpdateError: string | null
  source: 'remote' | 'session-fallback'
  sourceDetail: string
  capability: AdminProviderCapabilities
  refresh: () => Promise<void>
  updateRole: (role: Role) => Promise<void>
  updateStatus: (disabled: boolean) => Promise<void>
  updateLock: (locked: boolean) => Promise<void>
}

export const useAdminUser = (userId: string | null): UseAdminUserResult => {
  const activeUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.token)
  const [user, setUser] = useState<AdminDirectoryUser | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(userId))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isUpdatingRole, setIsUpdatingRole] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isUpdatingLock, setIsUpdatingLock] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roleUpdateError, setRoleUpdateError] = useState<string | null>(null)
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null)
  const [lockUpdateError, setLockUpdateError] = useState<string | null>(null)
  const [source, setSource] = useState<'remote' | 'session-fallback'>('session-fallback')
  const [sourceDetail, setSourceDetail] = useState('Not loaded yet')
  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)
  const capability = adminService.getCapabilities()

  const getMutationErrorMessage = (error: unknown, fallbackMessage: string): string => {
    if (error instanceof AdminProviderError) {
      return error.message
    }

    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message
    }

    return fallbackMessage
  }

  useEffect(() => {
    mountedRef.current = true

    if (!userId) {
      requestIdRef.current += 1
      setUser(null)
      setError('Missing user id.')
      setRoleUpdateError(null)
      setStatusUpdateError(null)
      setLockUpdateError(null)
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
    setStatusUpdateError(null)
    setLockUpdateError(null)
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
    if (!userId || isRefreshing || isUpdatingRole || isUpdatingStatus || isUpdatingLock) {
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
  }, [accessToken, activeUser, isRefreshing, isUpdatingLock, isUpdatingRole, isUpdatingStatus, userId])

  const updateRole = useCallback(async (role: Role): Promise<void> => {
    if (!userId || isUpdatingRole || isUpdatingStatus || isUpdatingLock || isRefreshing) {
      return
    }

    setRoleUpdateError(null)
    setStatusUpdateError(null)
    setLockUpdateError(null)
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
    } catch (error) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      const message = getMutationErrorMessage(error, 'Failed to update user role.')
      setRoleUpdateError(message)
      throw new Error(message)
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsUpdatingRole(false)
      }
    }
  }, [accessToken, activeUser, isRefreshing, isUpdatingLock, isUpdatingRole, isUpdatingStatus, userId])

  const updateStatus = useCallback(async (disabled: boolean): Promise<void> => {
    if (!userId || isUpdatingStatus || isUpdatingRole || isUpdatingLock || isRefreshing) {
      return
    }

    setStatusUpdateError(null)
    setRoleUpdateError(null)
    setLockUpdateError(null)
    setIsUpdatingStatus(true)
    const requestId = ++requestIdRef.current

    try {
      const result = await adminService.updateUserStatus({
        activeUser,
        accessToken,
        userId,
        disabled
      })

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setUser({
        ...result.user,
        disabled: typeof result.user.disabled === 'boolean' ? result.user.disabled : disabled
      })
      setSource(result.source)
      setSourceDetail(result.sourceDetail)
    } catch (error) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      const message = getMutationErrorMessage(error, 'Failed to update user status.')
      setStatusUpdateError(message)
      throw new Error(message)
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsUpdatingStatus(false)
      }
    }
  }, [accessToken, activeUser, isRefreshing, isUpdatingLock, isUpdatingRole, isUpdatingStatus, userId])

  const updateLock = useCallback(async (locked: boolean): Promise<void> => {
    if (!userId || isUpdatingLock || isUpdatingStatus || isUpdatingRole || isRefreshing) {
      return
    }

    setLockUpdateError(null)
    setRoleUpdateError(null)
    setStatusUpdateError(null)
    setIsUpdatingLock(true)
    const requestId = ++requestIdRef.current

    try {
      const result = await adminService.updateUserLock({
        activeUser,
        accessToken,
        userId,
        locked
      })

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setUser({
        ...result.user,
        locked: typeof result.user.locked === 'boolean' ? result.user.locked : locked
      })
      setSource(result.source)
      setSourceDetail(result.sourceDetail)
    } catch (error) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      const message = getMutationErrorMessage(error, 'Failed to update user lock state.')
      setLockUpdateError(message)
      throw new Error(message)
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsUpdatingLock(false)
      }
    }
  }, [accessToken, activeUser, isRefreshing, isUpdatingLock, isUpdatingRole, isUpdatingStatus, userId])

  return {
    user,
    isLoading,
    isRefreshing,
    isUpdatingRole,
    isUpdatingStatus,
    isUpdatingLock,
    error,
    roleUpdateError,
    statusUpdateError,
    lockUpdateError,
    source,
    sourceDetail,
    capability,
    refresh,
    updateRole,
    updateStatus,
    updateLock
  }
}
