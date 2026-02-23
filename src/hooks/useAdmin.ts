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

interface AdminUserMutationState {
  isUpdatingStatus: boolean
  isUpdatingLock: boolean
  error: string | null
}

interface UseAdminSectionsResult {
  activeUser: ReturnType<typeof useAuthStore.getState>['user']
  capability: AdminProviderCapabilities
  sections: AdminSection[]
}

interface UseAdminUsersResult {
  activeUser: ReturnType<typeof useAuthStore.getState>['user']
  capability: AdminProviderCapabilities
  users: AdminUserRow[]
  isLoadingUsers: boolean
  isRefreshingUsers: boolean
  usersError: string | null
  usersSource: 'remote' | 'session-fallback'
  usersSourceDetail: string
  userMutations: Record<string, AdminUserMutationState | undefined>
  refreshUsers: () => Promise<void>
  updateUserStatus: (userId: string, disabled: boolean) => Promise<void>
  updateUserLock: (userId: string, locked: boolean) => Promise<void>
  clearUserMutationError: (userId: string) => void
}

interface UseAdminRolesResult {
  activeUser: ReturnType<typeof useAuthStore.getState>['user']
  capability: AdminProviderCapabilities
  roles: AdminRoleRow[]
  isLoadingRoles: boolean
  isRefreshingRoles: boolean
  rolesError: string | null
  rolesSource: 'remote' | 'config-fallback'
  rolesSourceDetail: string
  refreshRoles: () => Promise<void>
}

const useAdminRuntime = () => {
  const config = useConfig()
  const activeUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.token)
  const capability = useMemo(() => adminService.getCapabilities(), [])

  return {
    config,
    activeUser,
    accessToken,
    capability
  }
}

const getMutationErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return fallbackMessage
}

export const useAdminSections = (): UseAdminSectionsResult => {
  const { activeUser, capability, config } = useAdminRuntime()

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

  return {
    activeUser,
    capability,
    sections
  }
}

export const useAdminUsers = (): UseAdminUsersResult => {
  const { activeUser, accessToken, capability } = useAdminRuntime()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(Boolean(activeUser))
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [usersSource, setUsersSource] = useState<'remote' | 'session-fallback'>('session-fallback')
  const [usersSourceDetail, setUsersSourceDetail] = useState('Not loaded yet')
  const [userMutations, setUserMutations] = useState<Record<string, AdminUserMutationState | undefined>>({})
  const usersRequestIdRef = useRef(0)
  const mountedRef = useRef(true)
  const userMutationsRef = useRef<Record<string, AdminUserMutationState | undefined>>({})

  const setUserMutationState = useCallback((userId: string, next: Partial<AdminUserMutationState>) => {
    setUserMutations((prev) => {
      const nextMap = {
        ...prev,
        [userId]: {
          isUpdatingStatus: prev[userId]?.isUpdatingStatus ?? false,
          isUpdatingLock: prev[userId]?.isUpdatingLock ?? false,
          error: prev[userId]?.error ?? null,
          ...next
        }
      }
      userMutationsRef.current = nextMap
      return nextMap
    })
  }, [])

  const clearUserMutationError = useCallback(
    (userId: string) => {
      setUserMutationState(userId, { error: null })
    },
    [setUserMutationState]
  )

  useEffect(() => {
    mountedRef.current = true

    if (!activeUser) {
      usersRequestIdRef.current += 1
      setUsers([])
      setUserMutations({})
      userMutationsRef.current = {}
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
    setUserMutations({})
    userMutationsRef.current = {}
    setUsersError(null)
    setIsLoadingUsers(true)

    const requestId = ++usersRequestIdRef.current

    void adminService
      .listUsers({ activeUser, accessToken })
      .then((result) => {
        if (!mountedRef.current || requestId !== usersRequestIdRef.current) {
          return
        }

        setUsers(result.users)
        setUsersSource(result.source)
        setUsersSourceDetail(result.sourceDetail)
        setIsLoadingUsers(false)
      })
      .catch(() => {
        if (!mountedRef.current || requestId !== usersRequestIdRef.current) {
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

  const patchUserRow = useCallback((userId: string, nextUser: Partial<AdminUserRow>) => {
    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, ...nextUser } : user)))
  }, [])

  const updateUserStatus = useCallback(
    async (userId: string, disabled: boolean): Promise<void> => {
      if (!activeUser || isRefreshingUsers) {
        return
      }

      const mutationState = userMutationsRef.current[userId]
      if (mutationState?.isUpdatingStatus || mutationState?.isUpdatingLock) {
        return
      }

      setUserMutationState(userId, {
        isUpdatingStatus: true,
        error: null
      })

      try {
        const result = await adminService.updateUserStatus({
          activeUser,
          accessToken,
          userId,
          disabled
        })

        if (!mountedRef.current) {
          return
        }

        patchUserRow(userId, {
          ...result.user,
          disabled: typeof result.user.disabled === 'boolean' ? result.user.disabled : disabled
        })
        setUsersSource(result.source)
        setUsersSourceDetail(result.sourceDetail)
      } catch (error) {
        if (!mountedRef.current) {
          return
        }

        const message = getMutationErrorMessage(error, 'Failed to update user status.')
        setUserMutationState(userId, { error: message })
        throw new Error(message)
      } finally {
        if (mountedRef.current) {
          setUserMutationState(userId, { isUpdatingStatus: false })
        }
      }
    },
    [accessToken, activeUser, isRefreshingUsers, patchUserRow, setUserMutationState]
  )

  const updateUserLock = useCallback(
    async (userId: string, locked: boolean): Promise<void> => {
      if (!activeUser || isRefreshingUsers) {
        return
      }

      const mutationState = userMutationsRef.current[userId]
      if (mutationState?.isUpdatingStatus || mutationState?.isUpdatingLock) {
        return
      }

      setUserMutationState(userId, {
        isUpdatingLock: true,
        error: null
      })

      try {
        const result = await adminService.updateUserLock({
          activeUser,
          accessToken,
          userId,
          locked
        })

        if (!mountedRef.current) {
          return
        }

        patchUserRow(userId, {
          ...result.user,
          locked: typeof result.user.locked === 'boolean' ? result.user.locked : locked
        })
        setUsersSource(result.source)
        setUsersSourceDetail(result.sourceDetail)
      } catch (error) {
        if (!mountedRef.current) {
          return
        }

        const message = getMutationErrorMessage(error, 'Failed to update user lock state.')
        setUserMutationState(userId, { error: message })
        throw new Error(message)
      } finally {
        if (mountedRef.current) {
          setUserMutationState(userId, { isUpdatingLock: false })
        }
      }
    },
    [accessToken, activeUser, isRefreshingUsers, patchUserRow, setUserMutationState]
  )

  return {
    activeUser,
    capability,
    users,
    isLoadingUsers,
    isRefreshingUsers,
    usersError,
    usersSource,
    usersSourceDetail,
    userMutations,
    refreshUsers,
    updateUserStatus,
    updateUserLock,
    clearUserMutationError
  }
}

export const useAdminRoles = (): UseAdminRolesResult => {
  const { activeUser, accessToken, capability } = useAdminRuntime()
  const [roles, setRoles] = useState<AdminRoleRow[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(Boolean(activeUser))
  const [isRefreshingRoles, setIsRefreshingRoles] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [rolesSource, setRolesSource] = useState<'remote' | 'config-fallback'>('config-fallback')
  const [rolesSourceDetail, setRolesSourceDetail] = useState('Not loaded yet')
  const rolesRequestIdRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    if (!activeUser) {
      rolesRequestIdRef.current += 1
      setRoles([])
      setRolesError(null)
      setRolesSource('config-fallback')
      setRolesSourceDetail('No active user')
      setIsLoadingRoles(false)
      setIsRefreshingRoles(false)
      return () => {
        mountedRef.current = false
      }
    }

    setRoles([])
    setRolesError(null)
    setIsLoadingRoles(true)
    const requestId = ++rolesRequestIdRef.current

    void adminService
      .listRoles({ activeUser, accessToken })
      .then((result) => {
        if (!mountedRef.current || requestId !== rolesRequestIdRef.current) {
          return
        }

        setRoles(result.roles)
        setRolesSource(result.source)
        setRolesSourceDetail(result.sourceDetail)
        setIsLoadingRoles(false)
      })
      .catch(() => {
        if (!mountedRef.current || requestId !== rolesRequestIdRef.current) {
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
    capability,
    roles,
    isLoadingRoles,
    isRefreshingRoles,
    rolesError,
    rolesSource,
    rolesSourceDetail,
    refreshRoles
  }
}
