import { useCallback, useEffect, useRef, useState } from 'react'

import { profileService } from '@/services/profile.service'
import { useAuthStore } from '@/stores/auth.store'
import type { AuthUser } from '@/types/auth'

interface UseProfileResult {
  profile: AuthUser | null
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  refreshProfile: () => Promise<void>
}

export const useProfile = (): UseProfileResult => {
  const sessionUser = useAuthStore((state) => state.user)
  const [profile, setProfile] = useState<AuthUser | null>(sessionUser)
  const [isLoading, setIsLoading] = useState(Boolean(sessionUser))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const requestIdRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true

    if (!sessionUser) {
      requestIdRef.current += 1
      setProfile(null)
      setError(null)
      setIsLoading(false)
      setIsRefreshing(false)
      return () => {
        mountedRef.current = false
      }
    }

    setError(null)
    setIsLoading(true)
    const requestId = ++requestIdRef.current

    void profileService
      .getProfile({ sessionUser })
      .then((loadedProfile) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return
        }

        setProfile(loadedProfile)
        setIsLoading(false)
      })
      .catch(() => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return
        }

        setProfile(null)
        setError('Failed to load profile data.')
        setIsLoading(false)
      })

    return () => {
      mountedRef.current = false
    }
  }, [sessionUser])

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (isRefreshing || !sessionUser) {
      return
    }

    setIsRefreshing(true)
    setError(null)
    const requestId = ++requestIdRef.current

    try {
      const refreshedProfile = await profileService.refreshProfile({ sessionUser })

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setProfile(refreshedProfile)
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setError('Failed to refresh profile data.')
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsRefreshing(false)
      }
    }
  }, [isRefreshing, sessionUser])

  return {
    profile,
    isLoading,
    isRefreshing,
    error,
    refreshProfile
  }
}
