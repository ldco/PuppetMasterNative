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
import type { ProfileAvatarUploadFile, ProfileProviderRotatedSession } from '@/services/profile.provider.types'

interface UseProfileResult {
  profile: AuthUser | null
  isLoading: boolean
  isRefreshing: boolean
  isSaving: boolean
  isUploadingAvatar: boolean
  error: string | null
  saveError: string | null
  avatarUploadError: string | null
  canSaveRemote: boolean
  canUploadAvatar: boolean
  profileProviderDetail: string
  nameDraft: string
  avatarUrlDraft: string
  setNameDraft: (value: string) => void
  setAvatarUrlDraft: (value: string) => void
  refreshProfile: () => Promise<void>
  saveProfile: () => Promise<void>
  uploadAvatar: (file: ProfileAvatarUploadFile) => Promise<void>
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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null)
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
      setAvatarUploadError(null)
      setIsLoading(false)
      setIsRefreshing(false)
      setIsSaving(false)
      setIsUploadingAvatar(false)
      return () => {
        mountedRef.current = false
      }
    }

    setError(null)
    setAvatarUploadError(null)
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

  const persistRotatedSession = useCallback(
    async (rotatedSession: ProfileProviderRotatedSession | undefined, activeUser: AuthUser): Promise<void> => {
      if (!rotatedSession) {
        return
      }

      await storageService.setSecureItem(SESSION_TOKEN_KEY, rotatedSession.token)

      if (rotatedSession.refreshToken) {
        await storageService.setSecureItem(SESSION_REFRESH_TOKEN_KEY, rotatedSession.refreshToken)
      } else {
        await storageService.removeSecureItem(SESSION_REFRESH_TOKEN_KEY)
      }

      setSession(activeUser, rotatedSession.token)
    },
    [setSession]
  )

  const uploadAvatar = useCallback(async (file: ProfileAvatarUploadFile): Promise<void> => {
    if (isUploadingAvatar || isSaving || !sessionUser) {
      return
    }

    setAvatarUploadError(null)
    setSaveError(null)
    setIsUploadingAvatar(true)
    const uploadRequestId = ++saveRequestIdRef.current

    try {
      const refreshToken = await storageService.getSecureItem(SESSION_REFRESH_TOKEN_KEY)
      const uploadResult = await profileService.uploadAvatar({
        sessionUser,
        accessToken,
        refreshToken,
        file
      })

      if (!mountedRef.current || uploadRequestId !== saveRequestIdRef.current) {
        return
      }

      await persistRotatedSession(uploadResult.rotatedSession, profile ?? sessionUser)
      setAvatarUrlDraft(uploadResult.avatarUrl)
    } catch {
      if (!mountedRef.current || uploadRequestId !== saveRequestIdRef.current) {
        throw new Error('Avatar upload request was interrupted')
      }

      setAvatarUploadError('Failed to upload avatar image.')
      throw new Error('Failed to upload avatar image')
    } finally {
      if (mountedRef.current && uploadRequestId === saveRequestIdRef.current) {
        setIsUploadingAvatar(false)
      }
    }
  }, [accessToken, isSaving, isUploadingAvatar, persistRotatedSession, profile, sessionUser])

  const saveProfile = useCallback(async (): Promise<void> => {
    if (isSaving || isUploadingAvatar || !sessionUser) {
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
        await persistRotatedSession(rotatedSession, updatedProfile)
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
  }, [
    accessToken,
    avatarUrlDraft,
    isSaving,
    isUploadingAvatar,
    nameDraft,
    persistRotatedSession,
    sessionUser,
    setUser
  ])

  return {
    profile,
    isLoading,
    isRefreshing,
    isSaving,
    isUploadingAvatar,
    error,
    saveError,
    avatarUploadError,
    canSaveRemote: profileCapabilities.canUpdateRemote,
    canUploadAvatar: profileCapabilities.canUploadAvatar,
    profileProviderDetail: profileCapabilities.detail,
    nameDraft,
    avatarUrlDraft,
    setNameDraft,
    setAvatarUrlDraft,
    refreshProfile,
    saveProfile,
    uploadAvatar
  }
}
