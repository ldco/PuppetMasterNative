import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useConfig } from '@/hooks/useConfig'
import { adminService, type AdminDirectoryUser } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminSection } from '@/types/config'

export type AdminUserRow = AdminDirectoryUser

interface UseAdminResult {
  activeUser: ReturnType<typeof useAuthStore.getState>['user']
  sections: AdminSection[]
  users: AdminUserRow[]
  isLoadingUsers: boolean
  isRefreshingUsers: boolean
  usersError: string | null
  usersSource: 'remote' | 'session-fallback'
  usersSourceDetail: string
  refreshUsers: () => Promise<void>
}

export const useAdmin = (): UseAdminResult => {
  const config = useConfig()
  const activeUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.token)
  const [isLoadingUsers, setIsLoadingUsers] = useState(Boolean(activeUser))
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [usersSource, setUsersSource] = useState<'remote' | 'session-fallback'>('session-fallback')
  const [usersSourceDetail, setUsersSourceDetail] = useState('Not loaded yet')
  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)

  const sections = useMemo(() => {
    if (!activeUser) {
      return []
    }

    return config.getAdminSectionsForRole(activeUser.role)
  }, [activeUser, config])

  useEffect(() => {
    mountedRef.current = true

    if (!activeUser) {
      requestIdRef.current += 1
      setUsers([])
      setUsersError(null)
      setUsersSource('session-fallback')
      setUsersSourceDetail('No active user')
      setIsLoadingUsers(false)
      setIsRefreshingUsers(false)
      return () => {
        mountedRef.current = false
      }
    }

    setUsers([])
    setUsersError(null)
    setIsLoadingUsers(true)
    const requestId = ++requestIdRef.current

    void adminService
      .listUsers({ activeUser, accessToken })
      .then((result) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return
        }

        setUsers(result.users)
        setUsersSource(result.source)
        setUsersSourceDetail(result.sourceDetail)
        setIsLoadingUsers(false)
      })
      .catch(() => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return
        }

        setUsers([])
        setUsersError('Failed to load admin users.')
        setUsersSource('session-fallback')
        setUsersSourceDetail('Provider request failed')
        setIsLoadingUsers(false)
      })

    return () => {
      mountedRef.current = false
    }
  }, [accessToken, activeUser])

  const refreshUsers = useCallback(async (): Promise<void> => {
    if (!activeUser || isRefreshingUsers) {
      return
    }

    setUsersError(null)
    setIsRefreshingUsers(true)

    const requestId = ++requestIdRef.current

    try {
      const refreshedUsers = await adminService.refreshUsers({ activeUser, accessToken })

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setUsers(refreshedUsers.users)
      setUsersSource(refreshedUsers.source)
      setUsersSourceDetail(refreshedUsers.sourceDetail)
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setUsersError('Failed to refresh admin users.')
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsRefreshingUsers(false)
      }
    }
  }, [accessToken, activeUser, isRefreshingUsers])

  return {
    activeUser,
    sections,
    users,
    isLoadingUsers,
    isRefreshingUsers,
    usersError,
    usersSource,
    usersSourceDetail,
    refreshUsers
  }
}
