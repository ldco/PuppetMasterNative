import { z } from 'zod'

import { pmNativeConfig } from '@/pm-native.config'
import { apiRequest } from '@/services/api'
import { genericRestUserSchema } from '@/services/genericRest.schemas'
import {
  ProfileProviderError,
  type ProfileProvider,
  type ProfileProviderGetInput
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

const genericRestProfileEndpoint = pmNativeConfig.backend.genericRest?.profile?.endpoints.get

const genericRestProfileProvider: ProfileProvider = {
  getCapabilities() {
    if (!genericRestProfileEndpoint) {
      return {
        canFetchRemote: false,
        detail: 'generic-rest profile endpoint is not configured (backend.genericRest.profile.endpoints.get)'
      }
    }

    return {
      canFetchRemote: true,
      detail: `GET ${genericRestProfileEndpoint}`
    }
  },

  async getProfile(input: ProfileProviderGetInput) {
    if (!genericRestProfileEndpoint) {
      throw new ProfileProviderError('generic-rest profile endpoint is not configured', 'CONFIG')
    }

    if (!input.accessToken) {
      throw new ProfileProviderError('No access token available for profile request', 'UNAUTHORIZED')
    }

    const payload = await apiRequest(genericRestProfileEndpoint, {
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
  }
}

const notSupportedProvider = (provider: string): ProfileProvider => ({
  getCapabilities() {
    return {
      canFetchRemote: false,
      detail: `${provider} profile provider is not implemented yet`
    }
  },

  async getProfile() {
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
