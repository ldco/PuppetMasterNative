import type { User } from '@supabase/supabase-js'
import { z } from 'zod'

import { pmNativeConfig } from '@/pm-native.config'
import { apiRequest } from '@/services/api'
import { genericRestUserSchema } from '@/services/genericRest.schemas'
import { getSupabaseClient } from '@/services/supabase.client'
import {
  ProfileProviderError,
  type ProfileProvider,
  type ProfileProviderGetInput,
  type ProfileProviderUpdateInput
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

const normalizeGenericRestProfilePayload = (
  payload: z.infer<typeof genericRestProfilePayloadSchema>
) => {
  if ('data' in payload) {
    return payload.data.user
  }

  if ('user' in payload) {
    return payload.user
  }

  return payload
}

const genericRestProfileGetEndpoint = pmNativeConfig.backend.genericRest?.profile?.endpoints.get
const genericRestProfileUpdateEndpoint = pmNativeConfig.backend.genericRest?.profile?.endpoints.update

const roleValues: Role[] = ['master', 'admin', 'editor', 'user']

const resolveSupabaseRole = (user: User): Role => {
  const appRole = user.app_metadata?.role
  const userRole = user.user_metadata?.role

  if (typeof appRole === 'string' && roleValues.includes(appRole as Role)) {
    return appRole as Role
  }

  if (typeof userRole === 'string' && roleValues.includes(userRole as Role)) {
    return userRole as Role
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

const mapSupabaseUser = (user: User): AuthUser => {
  if (!user.email) {
    throw new ProfileProviderError('Supabase user is missing email', 'PROVIDER')
  }

  return {
    id: user.id,
    email: user.email,
    name: resolveSupabaseName(user),
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

const genericRestProfileProvider: ProfileProvider = {
  getCapabilities() {
    const supportsFetch = Boolean(genericRestProfileGetEndpoint)
    const supportsUpdate = Boolean(genericRestProfileUpdateEndpoint)

    if (!supportsFetch && !supportsUpdate) {
      return {
        canFetchRemote: false,
        canUpdateRemote: false,
        detail: 'generic-rest profile endpoints are not configured (backend.genericRest.profile.endpoints.get/update)'
      }
    }

    return {
      canFetchRemote: supportsFetch,
      canUpdateRemote: supportsUpdate,
      detail: [
        supportsFetch ? `GET ${genericRestProfileGetEndpoint}` : 'GET not configured',
        supportsUpdate ? `PATCH ${genericRestProfileUpdateEndpoint}` : 'PATCH not configured'
      ].join(' | ')
    }
  },

  async getProfile(input: ProfileProviderGetInput) {
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
    }).catch((error: unknown) => {
      throw new ProfileProviderError(
        error instanceof Error ? error.message : 'Profile request failed',
        'PROVIDER'
      )
    })

    return normalizeGenericRestProfilePayload(payload)
  },

  async updateProfile(input: ProfileProviderUpdateInput) {
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
        name: input.profile.name
      },
      schema: genericRestProfilePayloadSchema,
      useAuthToken: false
    }).catch((error: unknown) => {
      throw new ProfileProviderError(
        error instanceof Error ? error.message : 'Profile update request failed',
        'PROVIDER'
      )
    })

    return normalizeGenericRestProfilePayload(payload)
  }
}

const supabaseProfileProvider: ProfileProvider = {
  getCapabilities() {
    return {
      canFetchRemote: true,
      canUpdateRemote: true,
      detail: 'GET supabase.auth.getUser(token) | UPDATE supabase.auth.updateUser(user_metadata.name)'
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

    const { error: setSessionError } = await supabase.auth.setSession({
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
        name: _input.profile.name
      }
    })

    if (error) {
      throw new ProfileProviderError(error.message, toSupabaseProfileErrorCode(error.status))
    }

    if (!data.user) {
      throw new ProfileProviderError('Supabase profile update did not return a user', 'PROVIDER')
    }

    return mapSupabaseUser(data.user)
  }
}

const notSupportedProvider = (provider: string): ProfileProvider => ({
  getCapabilities() {
    return {
      canFetchRemote: false,
      canUpdateRemote: false,
      detail: `${provider} profile provider is not implemented yet`
    }
  },

  async getProfile() {
    throw new ProfileProviderError(`${provider} profile provider is not implemented yet`, 'NOT_SUPPORTED')
  },

  async updateProfile() {
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
