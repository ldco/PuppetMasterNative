import { z } from 'zod'

import { pmNativeConfig } from '@/pm-native.config'
import { apiRequest } from '@/services/api'
import { genericRestUserSchema } from '@/services/genericRest.schemas'
import {
  ProfileProviderError,
  type ProfileProvider,
  type ProfileProviderGetInput,
  type ProfileProviderUpdateInput
} from '@/services/profile.provider.types'

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
      return notSupportedProvider('supabase')
    default:
      return notSupportedProvider('unknown')
  }
})()
