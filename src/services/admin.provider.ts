import { z } from 'zod'

import { pmNativeConfig } from '@/pm-native.config'
import { apiRequest } from '@/services/api'
import { genericRestUserSchema } from '@/services/genericRest.schemas'
import {
  AdminProviderError,
  type AdminProvider,
  type AdminProviderDirectoryUser,
  type AdminProviderListUsersInput
} from '@/services/admin.provider.types'

const genericRestAdminUsersPayloadSchema = z.union([
  z.array(genericRestUserSchema),
  z.object({
    users: z.array(genericRestUserSchema)
  }),
  z.object({
    success: z.literal(true),
    data: z.object({
      users: z.array(genericRestUserSchema)
    })
  })
])

const normalizeGenericRestUsersPayload = (
  payload: z.infer<typeof genericRestAdminUsersPayloadSchema>
): AdminProviderDirectoryUser[] => {
  if (Array.isArray(payload)) {
    return payload
  }

  if ('data' in payload) {
    return payload.data.users
  }

  return payload.users
}

const genericRestListUsersEndpoint = pmNativeConfig.backend.genericRest?.admin?.endpoints.listUsers

const genericRestAdminProvider: AdminProvider = {
  getCapabilities() {
    if (!genericRestListUsersEndpoint) {
      return {
        canListUsersRemote: false,
        detail: 'generic-rest admin users endpoint is not configured (backend.genericRest.admin.endpoints.listUsers)'
      }
    }

    return {
      canListUsersRemote: true,
      detail: `GET ${genericRestListUsersEndpoint}`
    }
  },

  async listUsers(input: AdminProviderListUsersInput): Promise<AdminProviderDirectoryUser[]> {
    if (!genericRestListUsersEndpoint) {
      throw new AdminProviderError('generic-rest admin users endpoint is not configured', 'CONFIG')
    }

    if (!input.accessToken) {
      throw new AdminProviderError('No access token available for admin users request', 'UNAUTHORIZED')
    }

    const payload = await apiRequest(genericRestListUsersEndpoint, {
      token: input.accessToken,
      schema: genericRestAdminUsersPayloadSchema,
      useAuthToken: false
    }).catch((error: unknown) => {
      throw new AdminProviderError(
        error instanceof Error ? error.message : 'Admin users request failed',
        'PROVIDER'
      )
    })

    return normalizeGenericRestUsersPayload(payload)
  }
}

const notSupportedProvider = (provider: string): AdminProvider => ({
  getCapabilities() {
    return {
      canListUsersRemote: false,
      detail: `${provider} admin provider is not implemented yet`
    }
  },

  async listUsers() {
    throw new AdminProviderError(`${provider} admin provider is not implemented yet`, 'NOT_SUPPORTED')
  }
})

export const adminProvider: AdminProvider = (() => {
  switch (pmNativeConfig.backend.provider) {
    case 'generic-rest':
      return genericRestAdminProvider
    case 'supabase':
      return notSupportedProvider('supabase')
    default:
      return notSupportedProvider('unknown')
  }
})()
