import { useEffect, useRef, useState } from 'react'

import { useAuthStore } from '@/stores/auth.store'
import type { AuthUser } from '@/types/auth'

interface UseProfileResult {
  profile: AuthUser | null
  isLoading: boolean
  isRefreshing: boolean
  refreshProfile: () => Promise<void>
}

const INITIAL_LOAD_DELAY_MS = 350
const REFRESH_DELAY_MS = 550

export const useProfile = (): UseProfileResult => {
  const profile = useAuthStore((state) => state.user)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) {
        return
      }

      setIsLoading(false)
      timerRef.current = null
    }, INITIAL_LOAD_DELAY_MS)

    return () => {
      mountedRef.current = false
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const refreshProfile = async (): Promise<void> => {
    if (isRefreshing) {
      return
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    setIsRefreshing(true)
    setIsLoading(true)

    await new Promise<void>((resolve) => {
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setIsLoading(false)
          setIsRefreshing(false)
        }

        timerRef.current = null
        resolve()
      }, REFRESH_DELAY_MS)
    })
  }

  return {
    profile,
    isLoading,
    isRefreshing,
    refreshProfile
  }
}
