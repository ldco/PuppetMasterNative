import { useCallback, useEffect, useRef, useState } from 'react'

import {
  SESSION_REFRESH_TOKEN_KEY,
  SESSION_TOKEN_KEY,
  SESSION_USER_KEY
} from '@/services/auth.constants'
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
  avatarUrlDraft: string
  setNameDraft: (value: string) => void
  setAvatarUrlDraft: (value: string) => void
  refreshProfile: () => Promise<void>
  saveProfile: () => Promise<void>
}

export const useProfile = (): UseProfileResult => {
  const sessionUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.token)
  const setSession = useAuthStore((state) => state.setSession)
  const setUser = useAuthStore((state) => state.setUser)

  const [profile, setProfile] = useState<AuthUser | null>(sessionUser)
  const [nameDraft, setNameDraft] = useState(sessionUser?.name ?? '')
  const [avatarUrlDraft, setAvatarUrlDraft] = useState(sessionUser?.avatarUrl ?? '')
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
    setAvatarUrlDraft(profile?.avatarUrl ?? '')
  }, [profile?.avatarUrl, profile?.id, profile?.name])

  useEffect(() => {
    mountedRef.current = true

    if (!sessionUser) {
      requestIdRef.current += 1
      saveRequestIdRef.current += 1
      setProfile(null)
      setNameDraft('')
      setAvatarUrlDraft('')
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
        storageService.setItem(SESSION_USER_KEY, JSON.stringify(refreshedProfile))
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
    const normalizedAvatarUrl = avatarUrlDraft.trim()
    if (!normalizedName) {
      setSaveError('Display name is required.')
      throw new Error('Display name is required')
    }

    setSaveError(null)
    setIsSaving(true)
    const saveRequestId = ++saveRequestIdRef.current

    try {
      const refreshToken = await storageService.getSecureItem(SESSION_REFRESH_TOKEN_KEY)
      const updateResult = await profileService.updateProfile({
        sessionUser,
        accessToken,
        refreshToken,
        profile: {
          name: normalizedName,
          avatarUrl: normalizedAvatarUrl.length > 0 ? normalizedAvatarUrl : null
        }
      })

      if (!mountedRef.current || saveRequestId !== saveRequestIdRef.current) {
        return
      }

      const updatedProfile = updateResult.user
      const rotatedSession = updateResult.rotatedSession

      storageService.setItem(SESSION_USER_KEY, JSON.stringify(updatedProfile))

      if (rotatedSession) {
        await storageService.setSecureItem(SESSION_TOKEN_KEY, rotatedSession.token)

        if (rotatedSession.refreshToken) {
          await storageService.setSecureItem(SESSION_REFRESH_TOKEN_KEY, rotatedSession.refreshToken)
        } else {
          await storageService.removeSecureItem(SESSION_REFRESH_TOKEN_KEY)
        }

        setSession(updatedProfile, rotatedSession.token)
      } else {
        setUser(updatedProfile)
      }

      setProfile(updatedProfile)
      setNameDraft(updatedProfile.name ?? '')
      setAvatarUrlDraft(updatedProfile.avatarUrl ?? '')
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
  }, [accessToken, avatarUrlDraft, isSaving, nameDraft, sessionUser, setSession, setUser])

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
    avatarUrlDraft,
    setNameDraft,
    setAvatarUrlDraft,
    refreshProfile,
    saveProfile
  }
}
