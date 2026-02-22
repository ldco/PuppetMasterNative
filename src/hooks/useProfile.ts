import { useCallback, useEffect, useRef, useState } from 'react'

import { profileService } from '@/services/profile.service'
import { useAuthStore } from '@/stores/auth.store'
import type { AuthUser } from '@/types/auth'

interface UseProfileResult {
  profile: AuthUser | null
  isLoading: boolean
  isRefreshing: boolean
  refreshProfile: () => Promise<void>
}

export const useProfile = (): UseProfileResult => {
  const sessionUser = useAuthStore((state) => state.user)
  const [profile, setProfile] = useState<AuthUser | null>(sessionUser)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const mountedRef = useRef(true)
  const requestIdRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true

    const requestId = ++requestIdRef.current

    void profileService.getProfile().then((loadedProfile) => {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setProfile(loadedProfile)
      setIsLoading(false)
    })

    return () => {
      mountedRef.current = false
    }
  }, [sessionUser?.id])

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (isRefreshing) {
      return
    }

    setIsRefreshing(true)
    setIsLoading(true)
    const requestId = ++requestIdRef.current

    try {
      const refreshedProfile = await profileService.refreshProfile()

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setProfile(refreshedProfile)
      setIsLoading(false)
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsRefreshing(false)
      }
    }
  }, [isRefreshing])

  return {
    profile,
    isLoading,
    isRefreshing,
    refreshProfile
  }
}
