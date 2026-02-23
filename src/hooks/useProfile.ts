import { useCallback, useEffect, useRef, useState } from 'react'

import { SESSION_REFRESH_TOKEN_KEY } from '@/services/auth.constants'
import { profileService } from '@/services/profile.service'
import { storageService } from '@/services/storage.service'
import { useAuthStore } from '@/stores/auth.store'
import type { AuthUser } from '@/types/auth'

interface UseProfileResult {
  profile: AuthUser | null
  isLoading: boolean
  isRefreshing: boolean
  isSaving: boolean
  error: string | null
  saveError: string | null
  canSaveRemote: boolean
  profileProviderDetail: string
  nameDraft: string
  setNameDraft: (value: string) => void
  refreshProfile: () => Promise<void>
  saveProfile: () => Promise<void>
}

export const useProfile = (): UseProfileResult => {
  const sessionUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.token)
  const setUser = useAuthStore((state) => state.setUser)

  const [profile, setProfile] = useState<AuthUser | null>(sessionUser)
  const [nameDraft, setNameDraft] = useState(sessionUser?.name ?? '')
  const [isLoading, setIsLoading] = useState(Boolean(sessionUser))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const saveRequestIdRef = useRef(0)

  const profileCapabilities = profileService.getCapabilities()

  useEffect(() => {
    setNameDraft(profile?.name ?? '')
  }, [profile?.id, profile?.name])

  useEffect(() => {
    mountedRef.current = true

    if (!sessionUser) {
      requestIdRef.current += 1
      saveRequestIdRef.current += 1
      setProfile(null)
      setNameDraft('')
      setError(null)
      setSaveError(null)
      setIsLoading(false)
      setIsRefreshing(false)
      setIsSaving(false)
      return () => {
        mountedRef.current = false
      }
    }

    setError(null)
    setIsLoading(true)
    const requestId = ++requestIdRef.current

    void profileService
      .getProfile({ sessionUser, accessToken })
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

        setProfile(sessionUser)
        setError('Failed to load profile data.')
        setIsLoading(false)
      })

    return () => {
      mountedRef.current = false
    }
  }, [accessToken, sessionUser])

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (isRefreshing || !sessionUser) {
      return
    }

    setIsRefreshing(true)
    setError(null)
    const requestId = ++requestIdRef.current

    try {
      const refreshedProfile = await profileService.refreshProfile({ sessionUser, accessToken })

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setProfile(refreshedProfile)
      if (refreshedProfile) {
        setUser(refreshedProfile)
      }
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
  }, [accessToken, isRefreshing, sessionUser, setUser])

  const saveProfile = useCallback(async (): Promise<void> => {
    if (isSaving || !sessionUser) {
      return
    }

    const normalizedName = nameDraft.trim()
    if (!normalizedName) {
      setSaveError('Display name is required.')
      throw new Error('Display name is required')
    }

    setSaveError(null)
    setIsSaving(true)
    const saveRequestId = ++saveRequestIdRef.current

    try {
      const refreshToken = await storageService.getSecureItem(SESSION_REFRESH_TOKEN_KEY)
      const updatedProfile = await profileService.updateProfile({
        sessionUser,
        accessToken,
        refreshToken,
        profile: {
          name: normalizedName
        }
      })

      if (!mountedRef.current || saveRequestId !== saveRequestIdRef.current) {
        return
      }

      setProfile(updatedProfile)
      setUser(updatedProfile)
      setNameDraft(updatedProfile.name ?? '')
    } catch {
      if (!mountedRef.current || saveRequestId !== saveRequestIdRef.current) {
        throw new Error('Save request was interrupted')
      }

      setSaveError('Failed to save profile changes.')
      throw new Error('Failed to save profile changes')
    } finally {
      if (mountedRef.current && saveRequestId === saveRequestIdRef.current) {
        setIsSaving(false)
      }
    }
  }, [accessToken, isSaving, nameDraft, sessionUser, setUser])

  return {
    profile,
    isLoading,
    isRefreshing,
    isSaving,
    error,
    saveError,
    canSaveRemote: profileCapabilities.canUpdateRemote,
    profileProviderDetail: profileCapabilities.detail,
    nameDraft,
    setNameDraft,
    refreshProfile,
    saveProfile
  }
}
