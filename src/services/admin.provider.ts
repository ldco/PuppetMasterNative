import { z } from 'zod'

import { pmNativeConfig } from '@/pm-native.config'
import { apiRequest } from '@/services/api'
import { genericRestUserSchema } from '@/services/genericRest.schemas'
import {
  AdminProviderError,
  type AdminProvider,
  type AdminProviderDirectoryUser,
  type AdminProviderGetUserInput,
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

const genericRestAdminUserPayloadSchema = z.union([
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

const normalizeGenericRestUserPayload = (
  payload: z.infer<typeof genericRestAdminUserPayloadSchema>
): AdminProviderDirectoryUser => {
  if ('data' in payload) {
    return payload.data.user
  }

  if ('user' in payload) {
    return payload.user
  }

  return payload
}

const genericRestAdminEndpoints = pmNativeConfig.backend.genericRest?.admin?.endpoints
const genericRestListUsersEndpoint = genericRestAdminEndpoints?.listUsers
const genericRestGetUserEndpointTemplate = genericRestAdminEndpoints?.getUser

const resolveGetUserEndpoint = (userId: string): string => {
  if (!genericRestGetUserEndpointTemplate) {
    throw new AdminProviderError('generic-rest admin user detail endpoint is not configured', 'CONFIG')
  }

  if (!genericRestGetUserEndpointTemplate.includes(':id')) {
    throw new AdminProviderError(
      'generic-rest admin user detail endpoint must include :id placeholder',
      'CONFIG'
    )
  }

  return genericRestGetUserEndpointTemplate.replace(':id', encodeURIComponent(userId))
}

const requireAccessToken = (accessToken?: string | null): string => {
  if (!accessToken) {
    throw new AdminProviderError('No access token available for admin request', 'UNAUTHORIZED')
  }

  return accessToken
}

const genericRestAdminProvider: AdminProvider = {
  getCapabilities() {
    const canListUsersRemote = Boolean(genericRestListUsersEndpoint)
    const canGetUserRemote = Boolean(genericRestGetUserEndpointTemplate)

    return {
      canListUsersRemote,
      canGetUserRemote,
      listUsersDetail: canListUsersRemote
        ? `GET ${genericRestListUsersEndpoint}`
        : 'generic-rest admin users endpoint is not configured (backend.genericRest.admin.endpoints.listUsers)',
      getUserDetail: canGetUserRemote
        ? `GET ${genericRestGetUserEndpointTemplate}`
        : 'generic-rest admin user detail endpoint is not configured (backend.genericRest.admin.endpoints.getUser)'
    }
  },

  async listUsers(input: AdminProviderListUsersInput): Promise<AdminProviderDirectoryUser[]> {
    if (!genericRestListUsersEndpoint) {
      throw new AdminProviderError('generic-rest admin users endpoint is not configured', 'CONFIG')
    }

    const accessToken = requireAccessToken(input.accessToken)

    const payload = await apiRequest(genericRestListUsersEndpoint, {
      token: accessToken,
      schema: genericRestAdminUsersPayloadSchema,
      useAuthToken: false
    }).catch((error: unknown) => {
      throw new AdminProviderError(
        error instanceof Error ? error.message : 'Admin users request failed',
        'PROVIDER'
      )
    })

    return normalizeGenericRestUsersPayload(payload)
  },

  async getUser(input: AdminProviderGetUserInput): Promise<AdminProviderDirectoryUser> {
    const endpoint = resolveGetUserEndpoint(input.userId)
    const accessToken = requireAccessToken(input.accessToken)

    const payload = await apiRequest(endpoint, {
      token: accessToken,
      schema: genericRestAdminUserPayloadSchema,
      useAuthToken: false
    }).catch((error: unknown) => {
      throw new AdminProviderError(
        error instanceof Error ? error.message : 'Admin user detail request failed',
        'PROVIDER'
      )
    })

    return normalizeGenericRestUserPayload(payload)
  }
}

const supabaseAdminProvider: AdminProvider = {
  getCapabilities() {
    return {
      canListUsersRemote: false,
      canGetUserRemote: false,
      listUsersDetail: 'supabase admin directory endpoints are not implemented yet (provider stub active)',
      getUserDetail: 'supabase admin user detail endpoint is not implemented yet (provider stub active)'
    }
  },

  async listUsers(): Promise<AdminProviderDirectoryUser[]> {
    return []
  },

  async getUser(input: AdminProviderGetUserInput): Promise<AdminProviderDirectoryUser> {
    // Defensive placeholder. UI/services should gate on capabilities and avoid calling this path.
    return {
      id: input.userId,
      email: 'unavailable@pmnative.local',
      name: null,
      role: 'user'
    }
  }
}

const notSupportedProvider = (provider: string): AdminProvider => ({
  getCapabilities() {
    return {
      canListUsersRemote: false,
      canGetUserRemote: false,
      listUsersDetail: `${provider} admin provider is not implemented yet`,
      getUserDetail: `${provider} admin provider is not implemented yet`
    }
  },

  async listUsers() {
    throw new AdminProviderError(`${provider} admin provider is not implemented yet`, 'NOT_SUPPORTED')
  },

  async getUser() {
    throw new AdminProviderError(`${provider} admin provider is not implemented yet`, 'NOT_SUPPORTED')
  }
})

export const adminProvider: AdminProvider = (() => {
  switch (pmNativeConfig.backend.provider) {
    case 'generic-rest':
      return genericRestAdminProvider
    case 'supabase':
      return supabaseAdminProvider
    default:
      return notSupportedProvider('unknown')
  }
})()
