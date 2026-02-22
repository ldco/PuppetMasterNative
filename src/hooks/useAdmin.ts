import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useConfig } from '@/hooks/useConfig'
import { useAuthStore } from '@/stores/auth.store'
import type { Role, AdminSection } from '@/types/config'

export interface AdminUserRow {
  id: string
  name: string
  email: string
  role: Role
}

interface UseAdminResult {
  activeUser: ReturnType<typeof useAuthStore.getState>['user']
  sections: AdminSection[]
  users: AdminUserRow[]
  isLoadingUsers: boolean
  refreshUsers: () => void
}

const INITIAL_USERS_LOAD_DELAY_MS = 450
const USERS_REFRESH_DELAY_MS = 700

export const useAdmin = (): UseAdminResult => {
  const config = useConfig()
  const activeUser = useAuthStore((state) => state.user)
  const [isLoadingUsers, setIsLoadingUsers] = useState(Boolean(activeUser))
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sections = useMemo(() => {
    if (!activeUser) {
      return []
    }

    return config.getAdminSectionsForRole(activeUser.role)
  }, [activeUser, config])

  const users = useMemo<AdminUserRow[]>(() => {
    if (!activeUser) {
      return []
    }

    return [
      {
        id: activeUser.id,
        name: activeUser.name ?? 'Unknown user',
        email: activeUser.email,
        role: activeUser.role
      }
    ]
  }, [activeUser])

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (!activeUser) {
      setIsLoadingUsers(false)
      return
    }

    setIsLoadingUsers(true)
    timerRef.current = setTimeout(() => {
      setIsLoadingUsers(false)
      timerRef.current = null
    }, INITIAL_USERS_LOAD_DELAY_MS)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [activeUser])

  const refreshUsers = useCallback(() => {
    if (!activeUser) {
      return
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    setIsLoadingUsers(true)
    timerRef.current = setTimeout(() => {
      setIsLoadingUsers(false)
      timerRef.current = null
    }, USERS_REFRESH_DELAY_MS)
  }, [activeUser])

  return {
    activeUser,
    sections,
    users,
    isLoadingUsers,
    refreshUsers
  }
}
