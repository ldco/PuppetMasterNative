import type { Session, User } from '@supabase/supabase-js'
import { z } from 'zod'

import { pmNativeConfig } from '@/pm-native.config'
import { ApiError, apiRequest } from '@/services/api'
import { genericRestUserSchema } from '@/services/genericRest.schemas'
import { getSupabaseClient } from '@/services/supabase.client'
import {
  ProfileProviderError,
  type ProfileProvider,
  type ProfileProviderUploadAvatarInput,
  type ProfileProviderUploadAvatarResult,
  type ProfileProviderGetInput,
  type ProfileProviderUpdateInput,
  type ProfileProviderUpdateResult
} from '@/services/profile.provider.types'
import type { AuthUser } from '@/types/auth'
import type { Role } from '@/types/config'

const genericRestProfilePayloadSchema = z.union([
  genericRestUserSchema,
  z.object({
    user: genericRestUserSchema
  }),
  z.object({
    success: z.literal(true),
    data: z.object({
      user: genericRestUserSchema
    })
  })
])

const genericRestAvatarUploadPayloadSchema = z.union([
  z.object({
    avatarUrl: z.string().min(1)
  }),
  z.object({
    url: z.string().min(1)
  }),
  z.object({
    data: z.object({
      avatarUrl: z.string().min(1).optional(),
      url: z.string().min(1).optional()
    }).refine((value) => Boolean(value.avatarUrl || value.url), {
      message: 'Avatar upload response requires avatarUrl or url'
    })
  }),
  z.object({
    success: z.literal(true),
    data: z.object({
      avatarUrl: z.string().min(1).optional(),
      url: z.string().min(1).optional()
    }).refine((value) => Boolean(value.avatarUrl || value.url), {
      message: 'Avatar upload response requires avatarUrl or url'
    })
  })
])

const normalizeGenericRestProfilePayload = (
  payload: z.infer<typeof genericRestProfilePayloadSchema>
) => {
  const normalizeUser = (user: AuthUser | (AuthUser & { avatar_url?: string | null })) => {
    const { avatar_url, ...rawUser } = user as AuthUser & { avatar_url?: string | null }
    const avatarUrl = (rawUser.avatarUrl ?? avatar_url)?.trim() || null

    return {
      ...rawUser,
      avatarUrl
    }
  }

  if ('data' in payload) {
    return normalizeUser(payload.data.user)
  }

  if ('user' in payload) {
    return normalizeUser(payload.user)
  }

  return normalizeUser(payload)
}

const genericRestProfileGetEndpoint = pmNativeConfig.backend.genericRest?.profile?.endpoints.get
const genericRestProfileUpdateEndpoint = pmNativeConfig.backend.genericRest?.profile?.endpoints.update
const genericRestProfileUploadAvatarEndpoint =
  pmNativeConfig.backend.genericRest?.profile?.endpoints.uploadAvatar
const supabaseProfileAvatarsBucket = pmNativeConfig.backend.supabase?.profileAvatarsBucket

const roleValues: Role[] = ['master', 'admin', 'editor', 'user']

const resolveSupabaseRole = (user: User): Role => {
  const appRole = user.app_metadata?.role

  if (typeof appRole === 'string' && roleValues.includes(appRole as Role)) {
    return appRole as Role
  }

  return 'user'
}

const resolveSupabaseName = (user: User): string | null => {
  const candidates = [user.user_metadata?.name, user.user_metadata?.full_name, user.user_metadata?.display_name]
  const value = candidates.find((candidate) => {
    return typeof candidate === 'string' && candidate.trim().length > 0
  })

  return typeof value === 'string' ? value.trim() : null
}

const resolveSupabaseAvatarUrl = (user: User): string | null => {
  const candidates = [
    user.user_metadata?.avatar_url,
    user.user_metadata?.avatarUrl,
    user.user_metadata?.picture
  ]
  const value = candidates.find((candidate) => {
    return typeof candidate === 'string' && candidate.trim().length > 0
  })

  return typeof value === 'string' ? value.trim() : null
}

const mapSupabaseUser = (user: User): AuthUser => {
  if (!user.email) {
    throw new ProfileProviderError('Supabase user is missing email', 'PROVIDER')
  }

  return {
    id: user.id,
    email: user.email,
    name: resolveSupabaseName(user),
    avatarUrl: resolveSupabaseAvatarUrl(user),
    role: resolveSupabaseRole(user)
  }
}

const requireAccessToken = (accessToken?: string | null): string => {
  if (!accessToken) {
    throw new ProfileProviderError('No access token available for profile request', 'UNAUTHORIZED')
  }

  return accessToken
}

const requireRefreshToken = (refreshToken?: string | null): string => {
  if (!refreshToken) {
    throw new ProfileProviderError('No refresh token available for profile update request', 'UNAUTHORIZED')
  }

  return refreshToken
}

const toSupabaseProfileErrorCode = (status?: number): 'UNAUTHORIZED' | 'PROVIDER' => {
  return status === 401 || status === 403 ? 'UNAUTHORIZED' : 'PROVIDER'
}

const toGenericRestProfileProviderError = (
  error: unknown,
  fallbackMessage: string
): ProfileProviderError => {
  if (error instanceof ProfileProviderError) {
    return error
  }

  if (error instanceof ApiError) {
    const status = error.status
    const message = error.message
    return new ProfileProviderError(message, status === 401 || status === 403 ? 'UNAUTHORIZED' : 'PROVIDER')
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    const status = error.status
    const message = error.message
    return new ProfileProviderError(message, status === 401 || status === 403 ? 'UNAUTHORIZED' : 'PROVIDER')
  }

  if (error instanceof Error) {
    if (error.message.includes('generic-rest profile') && error.message.includes('not configured')) {
      return new ProfileProviderError(error.message, 'CONFIG')
    }

    return new ProfileProviderError(error.message, 'PROVIDER')
  }

  return new ProfileProviderError(fallbackMessage, 'UNKNOWN')
}

const toRotatedSession = (
  session: Session | null | undefined
): ProfileProviderUpdateResult['rotatedSession'] => {
  if (!session?.access_token) {
    return undefined
  }

  return {
    token: session.access_token,
    refreshToken: typeof session.refresh_token === 'string' ? session.refresh_token : null
  }
}

const toProfileProviderUploadRotatedSession = (
  session: Session | null | undefined
): ProfileProviderUploadAvatarResult['rotatedSession'] => {
  return toRotatedSession(session)
}

const normalizeGenericRestAvatarUploadPayload = (
  payload: z.infer<typeof genericRestAvatarUploadPayloadSchema>
): string => {
  if ('success' in payload || 'data' in payload) {
    const data = payload.data
    return data.avatarUrl ?? data.url ?? ''
  }

  if ('avatarUrl' in payload) {
    return payload.avatarUrl
  }

  return payload.url
}

const resolveFileExtension = (
  fileName?: string | null,
  mimeType?: string | null
): string => {
  const normalizedName = fileName?.trim()
  if (normalizedName && normalizedName.includes('.')) {
    const extension = normalizedName.split('.').pop()?.trim().toLowerCase()
    if (extension) {
      return extension
    }
  }

  const normalizedMimeType = mimeType?.trim().toLowerCase()
  if (normalizedMimeType === 'image/png') {
    return 'png'
  }

  if (normalizedMimeType === 'image/webp') {
    return 'webp'
  }

  return 'jpg'
}

const readLocalUploadBody = async (input: ProfileProviderUploadAvatarInput['file']): Promise<ArrayBuffer | Blob> => {
  if (typeof Blob !== 'undefined' && input.webFile instanceof Blob) {
    return input.webFile
  }

  const response = await fetch(input.uri)

  if (!response.ok) {
    throw new ProfileProviderError('Failed to read selected avatar image', 'PROVIDER')
  }

  if (typeof response.arrayBuffer === 'function') {
    return response.arrayBuffer()
  }

  if (typeof response.blob === 'function') {
    return response.blob()
  }

  throw new ProfileProviderError('Selected avatar image could not be read', 'PROVIDER')
}

const buildApiUrl = (path: string): string => {
  return new URL(path, pmNativeConfig.api.baseUrl).toString()
}

const parseAvatarUploadFetchError = async (response: Response): Promise<string> => {
  try {
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.toLowerCase().includes('json')) {
      const payload = (await response.json()) as { message?: unknown }
      if (typeof payload?.message === 'string' && payload.message.trim().length > 0) {
        return payload.message
      }
    }
  } catch {
    // Ignore body parsing failures and fall back to status text below.
  }

  return response.statusText || 'Avatar upload failed'
}

const toFetchProfileProviderErrorCode = (status: number): 'UNAUTHORIZED' | 'PROVIDER' => {
  return status === 401 || status === 403 ? 'UNAUTHORIZED' : 'PROVIDER'
}

const uploadAvatarToGenericRest = async (
  endpoint: string,
  token: string,
  file: ProfileProviderUploadAvatarInput['file']
): Promise<string> => {
  const formData = new FormData()
  const normalizedName = file.fileName?.trim() || `avatar.${resolveFileExtension(undefined, file.mimeType)}`
  const normalizedMimeType = file.mimeType?.trim() || 'image/jpeg'

  if (typeof Blob !== 'undefined' && file.webFile instanceof Blob) {
    formData.append('file', file.webFile, normalizedName)
  } else {
    formData.append(
      'file',
      {
        uri: file.uri,
        name: normalizedName,
        type: normalizedMimeType
      } as unknown as Blob
    )
  }

  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => {
    controller.abort()
  }, pmNativeConfig.api.timeoutMs)

  try {
    const response = await fetch(buildApiUrl(endpoint), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: formData,
      signal: controller.signal
    })

    if (!response.ok) {
      throw new ProfileProviderError(
        await parseAvatarUploadFetchError(response),
        toFetchProfileProviderErrorCode(response.status)
      )
    }

    const payload = await response.json().catch(() => null)

    if (payload === null) {
      throw new ProfileProviderError('Avatar upload response did not include avatarUrl', 'PROVIDER')
    }

    const parsed = genericRestAvatarUploadPayloadSchema.safeParse(payload)
    if (!parsed.success) {
      throw new ProfileProviderError('Avatar upload response did not include avatarUrl', 'PROVIDER')
    }

    const avatarUrl = normalizeGenericRestAvatarUploadPayload(parsed.data).trim()
    if (!avatarUrl) {
      throw new ProfileProviderError('Avatar upload response returned an empty avatar URL', 'PROVIDER')
    }

    return avatarUrl
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError'
    ) {
      throw new ProfileProviderError('Avatar upload timed out', 'PROVIDER')
    }

    if (error instanceof ProfileProviderError) {
      throw error
    }

    throw new ProfileProviderError(
      error instanceof Error ? error.message : 'Avatar upload request failed',
      'PROVIDER'
    )
  } finally {
    clearTimeout(timeoutHandle)
  }
}

const genericRestProfileProvider: ProfileProvider = {
  getCapabilities() {
    const supportsFetch = Boolean(genericRestProfileGetEndpoint)
    const supportsUpdate = Boolean(genericRestProfileUpdateEndpoint)
    const supportsAvatarUpload = Boolean(genericRestProfileUploadAvatarEndpoint)

    if (!supportsFetch && !supportsUpdate && !supportsAvatarUpload) {
      return {
        canFetchRemote: false,
        canUpdateRemote: false,
        canUploadAvatar: false,
        detail:
          'generic-rest profile endpoints are not configured (backend.genericRest.profile.endpoints.get/update/uploadAvatar)'
      }
    }

    return {
      canFetchRemote: supportsFetch,
      canUpdateRemote: supportsUpdate,
      canUploadAvatar: supportsAvatarUpload,
      detail: [
        supportsFetch ? `GET ${genericRestProfileGetEndpoint}` : 'GET not configured',
        supportsUpdate ? `PATCH ${genericRestProfileUpdateEndpoint}` : 'PATCH not configured',
        supportsAvatarUpload ? `POST ${genericRestProfileUploadAvatarEndpoint}` : 'AVATAR upload not configured'
      ].join(' | ')
    }
  },

  async getProfile(input: ProfileProviderGetInput) {
    try {
      if (!genericRestProfileGetEndpoint) {
        throw new ProfileProviderError('generic-rest profile endpoint is not configured', 'CONFIG')
      }

      if (!input.accessToken) {
        throw new ProfileProviderError('No access token available for profile request', 'UNAUTHORIZED')
      }

      const payload = await apiRequest(genericRestProfileGetEndpoint, {
        token: input.accessToken,
        schema: genericRestProfilePayloadSchema,
        useAuthToken: false
      })

      return normalizeGenericRestProfilePayload(payload)
    } catch (error) {
      throw toGenericRestProfileProviderError(error, 'Profile request failed')
    }
  },

  async updateProfile(input: ProfileProviderUpdateInput) {
    try {
      if (!genericRestProfileUpdateEndpoint) {
        throw new ProfileProviderError('generic-rest profile update endpoint is not configured', 'CONFIG')
      }

      if (!input.accessToken) {
        throw new ProfileProviderError('No access token available for profile update request', 'UNAUTHORIZED')
      }

      const payload = await apiRequest(genericRestProfileUpdateEndpoint, {
        method: 'PATCH',
        token: input.accessToken,
        body: {
          name: input.profile.name,
          avatarUrl: input.profile.avatarUrl ?? null
        },
        schema: genericRestProfilePayloadSchema,
        useAuthToken: false
      })

      return {
        user: normalizeGenericRestProfilePayload(payload)
      }
    } catch (error) {
      throw toGenericRestProfileProviderError(error, 'Profile update request failed')
    }
  },

  async uploadAvatar(input: ProfileProviderUploadAvatarInput) {
    if (!genericRestProfileUploadAvatarEndpoint) {
      throw new ProfileProviderError('generic-rest avatar upload endpoint is not configured', 'CONFIG')
    }

    const accessToken = requireAccessToken(input.accessToken)
    const avatarUrl = await uploadAvatarToGenericRest(genericRestProfileUploadAvatarEndpoint, accessToken, input.file)

    return {
      avatarUrl
    }
  }
}

const supabaseProfileProvider: ProfileProvider = {
  getCapabilities() {
    return {
      canFetchRemote: true,
      canUpdateRemote: true,
      canUploadAvatar: Boolean(supabaseProfileAvatarsBucket),
      detail: [
        'GET supabase.auth.getUser(token)',
        'UPDATE supabase.auth.updateUser(user_metadata.name/avatar_url)',
        supabaseProfileAvatarsBucket
          ? `UPLOAD supabase.storage.from(${supabaseProfileAvatarsBucket})`
          : 'UPLOAD not configured (backend.supabase.profileAvatarsBucket)'
      ].join(' | ')
    }
  },

  async getProfile(input: ProfileProviderGetInput) {
    const token = requireAccessToken(input.accessToken)
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.getUser(token)

    if (error) {
      throw new ProfileProviderError(error.message, toSupabaseProfileErrorCode(error.status))
    }

    if (!data.user) {
      throw new ProfileProviderError('Supabase did not return a user for the provided session token', 'PROVIDER')
    }

    return mapSupabaseUser(data.user)
  },

  async updateProfile(_input: ProfileProviderUpdateInput) {
    const accessToken = requireAccessToken(_input.accessToken)
    const refreshToken = requireRefreshToken(_input.refreshToken)
    const supabase = getSupabaseClient()

    const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    if (setSessionError) {
      throw new ProfileProviderError(
        setSessionError.message,
        toSupabaseProfileErrorCode(setSessionError.status)
      )
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        name: _input.profile.name,
        avatar_url: _input.profile.avatarUrl ?? null
      }
    })

    if (error) {
      throw new ProfileProviderError(error.message, toSupabaseProfileErrorCode(error.status))
    }

    if (!data.user) {
      throw new ProfileProviderError('Supabase profile update did not return a user', 'PROVIDER')
    }

    return {
      user: mapSupabaseUser(data.user),
      rotatedSession: toRotatedSession(setSessionData.session)
    }
  },

  async uploadAvatar(input: ProfileProviderUploadAvatarInput) {
    if (!supabaseProfileAvatarsBucket) {
      throw new ProfileProviderError('Supabase avatar upload bucket is not configured', 'CONFIG')
    }

    const accessToken = requireAccessToken(input.accessToken)
    const refreshToken = requireRefreshToken(input.refreshToken)
    const supabase = getSupabaseClient()

    const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    if (setSessionError) {
      throw new ProfileProviderError(
        setSessionError.message,
        toSupabaseProfileErrorCode(setSessionError.status)
      )
    }

    const extension = resolveFileExtension(input.file.fileName, input.file.mimeType)
    const uploadPath = `profiles/${input.userId}/avatar-${Date.now()}.${extension}`
    const uploadBody = await readLocalUploadBody(input.file)
    const contentType = input.file.mimeType?.trim() || 'image/jpeg'

    const { error: uploadError } = await supabase.storage
      .from(supabaseProfileAvatarsBucket)
      .upload(uploadPath, uploadBody, {
        contentType,
        upsert: true
      })

    if (uploadError) {
      throw new ProfileProviderError(uploadError.message, 'PROVIDER')
    }

    const { data } = supabase.storage.from(supabaseProfileAvatarsBucket).getPublicUrl(uploadPath)
    const avatarUrl = data.publicUrl?.trim()

    if (!avatarUrl) {
      throw new ProfileProviderError('Supabase avatar upload did not return a public URL', 'PROVIDER')
    }

    return {
      avatarUrl,
      rotatedSession: toProfileProviderUploadRotatedSession(setSessionData.session)
    }
  }
}

const notSupportedProvider = (provider: string): ProfileProvider => ({
  getCapabilities() {
    return {
      canFetchRemote: false,
      canUpdateRemote: false,
      canUploadAvatar: false,
      detail: `${provider} profile provider is not implemented yet`
    }
  },

  async getProfile() {
    throw new ProfileProviderError(`${provider} profile provider is not implemented yet`, 'NOT_SUPPORTED')
  },

  async updateProfile() {
    throw new ProfileProviderError(`${provider} profile provider is not implemented yet`, 'NOT_SUPPORTED')
  },

  async uploadAvatar() {
    throw new ProfileProviderError(`${provider} profile provider is not implemented yet`, 'NOT_SUPPORTED')
  }
})

export const profileProvider: ProfileProvider = (() => {
  switch (pmNativeConfig.backend.provider) {
    case 'generic-rest':
      return genericRestProfileProvider
    case 'supabase':
      return supabaseProfileProvider
    default:
      return notSupportedProvider('unknown')
  }
})()
