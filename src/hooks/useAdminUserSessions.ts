import { useCallback, useEffect, useRef, useState } from 'react'

import type { AdminProviderCapabilities } from '@/services/admin.provider.types'
import {
  adminService,
  type AdminSessionRevokeAuditContext,
  type AdminUserSession
} from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'

interface UseAdminUserSessionsResult {
  sessions: AdminUserSession[]
  isLoading: boolean
  isRefreshing: boolean
  isRevoking: boolean
  revokingSessionId: string | null
  error: string | null
  revokeError: string | null
  sessionMutationErrors: Record<string, string | undefined>
  source: 'remote' | 'local-fallback'
  sourceDetail: string
  capability: AdminProviderCapabilities
  refresh: () => Promise<void>
  revokeAll: (reason?: string, auditContext?: AdminSessionRevokeAuditContext) => Promise<number | null>
  revokeOne: (
    sessionId: string,
    reason?: string,
    auditContext?: AdminSessionRevokeAuditContext
  ) => Promise<number | null>
  clearSessionMutationError: (sessionId: string) => void
}

export const useAdminUserSessions = (userId: string | null): UseAdminUserSessionsResult => {
  const activeUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.token)
  const [sessions, setSessions] = useState<AdminUserSession[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(userId))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [sessionMutationErrors, setSessionMutationErrors] = useState<Record<string, string | undefined>>({})
  const [source, setSource] = useState<'remote' | 'local-fallback'>('local-fallback')
  const [sourceDetail, setSourceDetail] = useState('Not loaded yet')
  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)
  const capability = adminService.getCapabilities()
  const hasSessionMutationInFlight = isRevoking || revokingSessionId !== null

  const applySessionsResult = useCallback(
    (result: { sessions: AdminUserSession[]; source: 'remote' | 'local-fallback'; sourceDetail: string }) => {
      setSessions(result.sessions)
      setSource(result.source)
      setSourceDetail(result.sourceDetail)
    },
    []
  )

  const applyRevokeAllOptimisticPatch = useCallback((revokedCount: number | null) => {
    if (revokedCount === 0 || revokedCount === null) {
      return
    }

    setSessions((prev) => prev.map((session) => ({ ...session, revoked: true })))
  }, [])

  const applyRevokeOneOptimisticPatch = useCallback(
    (
      sessionId: string,
      result: { session: AdminUserSession | null; revokedCount: number | null }
    ) => {
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== sessionId) {
            return session
          }

          if (result.session) {
            return {
              ...session,
              ...result.session
            }
          }

          if (result.revokedCount && result.revokedCount > 0) {
            return {
              ...session,
              revoked: true
            }
          }

          return session
        })
      )
    },
    []
  )

  useEffect(() => {
    mountedRef.current = true

    if (!userId) {
      requestIdRef.current += 1
      setSessions([])
      setError('Missing user id.')
      setRevokeError(null)
      setSessionMutationErrors({})
      setRevokingSessionId(null)
      setSource('local-fallback')
      setSourceDetail('Invalid route parameter')
      setIsLoading(false)
      setIsRefreshing(false)
      setIsRevoking(false)
      return () => {
        mountedRef.current = false
      }
    }

    setError(null)
    setRevokeError(null)
    setSessionMutationErrors({})
    setRevokingSessionId(null)
    setIsLoading(true)
    const requestId = ++requestIdRef.current

    void adminService
      .getUserSessions({ activeUser, accessToken, userId })
      .then((result) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return
        }

        applySessionsResult(result)
        setIsLoading(false)
      })
      .catch(() => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return
        }

        setSessions([])
        setError('Failed to load user sessions.')
        setSource('local-fallback')
        setSourceDetail('Provider request failed')
        setIsLoading(false)
      })

    return () => {
      mountedRef.current = false
    }
  }, [accessToken, activeUser, applySessionsResult, userId])

  const refresh = useCallback(async (): Promise<void> => {
    if (!userId || isRefreshing || hasSessionMutationInFlight) {
      return
    }

    setError(null)
    setRevokeError(null)
    setSessionMutationErrors({})
    setIsRefreshing(true)
    const requestId = ++requestIdRef.current

    try {
      const result = await adminService.refreshUserSessions({ activeUser, accessToken, userId })
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      applySessionsResult(result)
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setError('Failed to refresh user sessions.')
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsRefreshing(false)
      }
    }
  }, [accessToken, activeUser, applySessionsResult, hasSessionMutationInFlight, isRefreshing, userId])

  const clearSessionMutationError = useCallback((sessionId: string) => {
    setSessionMutationErrors((prev) => ({
      ...prev,
      [sessionId]: undefined
    }))
  }, [])

  const revokeAll = useCallback(
    async (reason?: string, auditContext?: AdminSessionRevokeAuditContext): Promise<number | null> => {
    if (!userId || isRefreshing || hasSessionMutationInFlight) {
      return null
    }

    setError(null)
    setRevokeError(null)
    setSessionMutationErrors({})
    setIsRevoking(true)
    const requestId = ++requestIdRef.current

    try {
      const result = await adminService.revokeUserSessions({
        activeUser,
        accessToken,
        userId,
        reason,
        auditContext
      })
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return result.revokedCount
      }

      applyRevokeAllOptimisticPatch(result.revokedCount)
      setSource(result.source)
      setSourceDetail(result.sourceDetail)
      return result.revokedCount
    } catch (error) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return null
      }

      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Failed to revoke user sessions.'
      setRevokeError(message)
      throw new Error(message)
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsRevoking(false)
      }
    }
  }, [
    accessToken,
    activeUser,
    applyRevokeAllOptimisticPatch,
    hasSessionMutationInFlight,
    isRefreshing,
    userId
  ])

  const revokeOne = useCallback(async (
    sessionId: string,
    reason?: string,
    auditContext?: AdminSessionRevokeAuditContext
  ): Promise<number | null> => {
    if (!userId || isRefreshing || hasSessionMutationInFlight) {
      return null
    }

    setError(null)
    setRevokeError(null)
    clearSessionMutationError(sessionId)
    setRevokingSessionId(sessionId)
    const requestId = ++requestIdRef.current

    try {
      const result = await adminService.revokeUserSession({
        activeUser,
        accessToken,
        userId,
        sessionId,
        reason,
        auditContext
      })
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return result.revokedCount
      }

      applyRevokeOneOptimisticPatch(sessionId, result)
      setSource(result.source)
      setSourceDetail(result.sourceDetail)
      return result.revokedCount
    } catch (error) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return null
      }

      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Failed to revoke session.'
      setSessionMutationErrors((prev) => ({
        ...prev,
        [sessionId]: message
      }))
      throw new Error(message)
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setRevokingSessionId(null)
      }
    }
  }, [
    accessToken,
    activeUser,
    clearSessionMutationError,
    hasSessionMutationInFlight,
    isRefreshing,
    applyRevokeOneOptimisticPatch,
    userId
  ])

  return {
    sessions,
    isLoading,
    isRefreshing,
    isRevoking,
    revokingSessionId,
    error,
    revokeError,
    sessionMutationErrors,
    source,
    sourceDetail,
    capability,
    refresh,
    revokeAll,
    revokeOne,
    clearSessionMutationError
  }
}
