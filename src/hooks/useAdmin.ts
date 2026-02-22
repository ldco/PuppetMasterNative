import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useConfig } from '@/hooks/useConfig'
import { adminService, type AdminDirectoryUser } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'
import type { Role, AdminSection } from '@/types/config'

export type AdminUserRow = AdminDirectoryUser

interface UseAdminResult {
  activeUser: ReturnType<typeof useAuthStore.getState>['user']
  sections: AdminSection[]
  users: AdminUserRow[]
  isLoadingUsers: boolean
  refreshUsers: () => void
}

export const useAdmin = (): UseAdminResult => {
  const config = useConfig()
  const activeUser = useAuthStore((state) => state.user)
  const [isLoadingUsers, setIsLoadingUsers] = useState(Boolean(activeUser))
  const [users, setUsers] = useState<AdminUserRow[]>([])
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
      setUsers([])
      setIsLoadingUsers(false)
      return
    }

    setIsLoadingUsers(true)
    const requestId = ++requestIdRef.current

    void adminService.listUsers().then((loadedUsers) => {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setUsers(loadedUsers)
      setIsLoadingUsers(false)
    })

    return () => {
      mountedRef.current = false
    }
  }, [activeUser])

  const refreshUsers = useCallback(() => {
    if (!activeUser) {
      return
    }

    setIsLoadingUsers(true)

    const requestId = ++requestIdRef.current
    void adminService.refreshUsers().then((refreshedUsers) => {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setUsers(refreshedUsers)
      setIsLoadingUsers(false)
    })
  }, [activeUser])

  return {
    activeUser,
    sections,
    users,
    isLoadingUsers,
    refreshUsers
  }
}
