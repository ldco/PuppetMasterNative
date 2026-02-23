import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useConfig } from '@/hooks/useConfig'
import type { AdminProviderCapabilities } from '@/services/admin.provider.types'
import {
  adminService,
  type AdminDirectoryUser,
  type AdminRoleSummary
} from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminSection } from '@/types/config'

export type AdminUserRow = AdminDirectoryUser
export type AdminRoleRow = AdminRoleSummary

interface UseAdminResult {
  activeUser: ReturnType<typeof useAuthStore.getState>['user']
  sections: AdminSection[]
  capability: AdminProviderCapabilities
  users: AdminUserRow[]
  roles: AdminRoleRow[]
  isLoadingUsers: boolean
  isLoadingRoles: boolean
  isRefreshingUsers: boolean
  isRefreshingRoles: boolean
  usersError: string | null
  rolesError: string | null
  usersSource: 'remote' | 'session-fallback'
  usersSourceDetail: string
  rolesSource: 'remote' | 'config-fallback'
  rolesSourceDetail: string
  refreshUsers: () => Promise<void>
  refreshRoles: () => Promise<void>
}

export const useAdmin = (): UseAdminResult => {
  const config = useConfig()
  const activeUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.token)
  const [isLoadingUsers, setIsLoadingUsers] = useState(Boolean(activeUser))
  const [isLoadingRoles, setIsLoadingRoles] = useState(Boolean(activeUser))
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false)
  const [isRefreshingRoles, setIsRefreshingRoles] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [roles, setRoles] = useState<AdminRoleRow[]>([])
  const [usersSource, setUsersSource] = useState<'remote' | 'session-fallback'>('session-fallback')
  const [rolesSource, setRolesSource] = useState<'remote' | 'config-fallback'>('config-fallback')
  const [usersSourceDetail, setUsersSourceDetail] = useState('Not loaded yet')
  const [rolesSourceDetail, setRolesSourceDetail] = useState('Not loaded yet')
  const usersRequestIdRef = useRef(0)
  const rolesRequestIdRef = useRef(0)
  const mountedRef = useRef(true)
  const capability = useMemo(() => adminService.getCapabilities(), [])

  const sections = useMemo(() => {
    if (!activeUser) {
      return []
    }

      return config.getAdminSectionsForRole(activeUser.role).filter((section) => {
        if (section.id === 'users') {
          return capability.canListUsersRemote
        }

        if (section.id === 'roles') {
          return capability.canListRolesRemote
        }

        return true
      })
  }, [activeUser, capability.canListRolesRemote, capability.canListUsersRemote, config])

  useEffect(() => {
    mountedRef.current = true

    if (!activeUser) {
      usersRequestIdRef.current += 1
      rolesRequestIdRef.current += 1
      setUsers([])
      setRoles([])
      setUsersError(null)
      setRolesError(null)
      setUsersSource('session-fallback')
      setRolesSource('config-fallback')
      setUsersSourceDetail('No active user')
      setRolesSourceDetail('No active user')
      setIsLoadingUsers(false)
      setIsLoadingRoles(false)
      setIsRefreshingUsers(false)
      setIsRefreshingRoles(false)
      return () => {
        mountedRef.current = false
      }
    }

    setUsers([])
    setRoles([])
    setUsersError(null)
    setRolesError(null)
    setIsLoadingUsers(true)
    setIsLoadingRoles(true)
    const usersRequestId = ++usersRequestIdRef.current
    const rolesRequestId = ++rolesRequestIdRef.current

    void adminService
      .listUsers({ activeUser, accessToken })
      .then((result) => {
        if (!mountedRef.current || usersRequestId !== usersRequestIdRef.current) {
          return
        }

        setUsers(result.users)
        setUsersSource(result.source)
        setUsersSourceDetail(result.sourceDetail)
        setIsLoadingUsers(false)
      })
      .catch(() => {
        if (!mountedRef.current || usersRequestId !== usersRequestIdRef.current) {
          return
        }

        setUsers([])
        setUsersError('Failed to load admin users.')
        setUsersSource('session-fallback')
        setUsersSourceDetail('Provider request failed')
        setIsLoadingUsers(false)
      })

    void adminService
      .listRoles({ activeUser, accessToken })
      .then((result) => {
        if (!mountedRef.current || rolesRequestId !== rolesRequestIdRef.current) {
          return
        }

        setRoles(result.roles)
        setRolesSource(result.source)
        setRolesSourceDetail(result.sourceDetail)
        setIsLoadingRoles(false)
      })
      .catch(() => {
        if (!mountedRef.current || rolesRequestId !== rolesRequestIdRef.current) {
          return
        }

        setRoles([])
        setRolesError('Failed to load admin roles.')
        setRolesSource('config-fallback')
        setRolesSourceDetail('Provider request failed')
        setIsLoadingRoles(false)
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

    const requestId = ++usersRequestIdRef.current

    try {
      const refreshedUsers = await adminService.refreshUsers({ activeUser, accessToken })

      if (!mountedRef.current || requestId !== usersRequestIdRef.current) {
        return
      }

      setUsers(refreshedUsers.users)
      setUsersSource(refreshedUsers.source)
      setUsersSourceDetail(refreshedUsers.sourceDetail)
    } catch {
      if (!mountedRef.current || requestId !== usersRequestIdRef.current) {
        return
      }

      setUsersError('Failed to refresh admin users.')
    } finally {
      if (mountedRef.current && requestId === usersRequestIdRef.current) {
        setIsRefreshingUsers(false)
      }
    }
  }, [accessToken, activeUser, isRefreshingUsers])

  const refreshRoles = useCallback(async (): Promise<void> => {
    if (!activeUser || isRefreshingRoles) {
      return
    }

    setRolesError(null)
    setIsRefreshingRoles(true)

    const requestId = ++rolesRequestIdRef.current

    try {
      const refreshedRoles = await adminService.refreshRoles({ activeUser, accessToken })

      if (!mountedRef.current || requestId !== rolesRequestIdRef.current) {
        return
      }

      setRoles(refreshedRoles.roles)
      setRolesSource(refreshedRoles.source)
      setRolesSourceDetail(refreshedRoles.sourceDetail)
    } catch {
      if (!mountedRef.current || requestId !== rolesRequestIdRef.current) {
        return
      }

      setRolesError('Failed to refresh admin roles.')
    } finally {
      if (mountedRef.current && requestId === rolesRequestIdRef.current) {
        setIsRefreshingRoles(false)
      }
    }
  }, [accessToken, activeUser, isRefreshingRoles])

  return {
    activeUser,
    sections,
    capability,
    users,
    roles,
    isLoadingUsers,
    isLoadingRoles,
    isRefreshingUsers,
    isRefreshingRoles,
    usersError,
    rolesError,
    usersSource,
    usersSourceDetail,
    rolesSource,
    rolesSourceDetail,
    refreshUsers,
    refreshRoles
  }
}
