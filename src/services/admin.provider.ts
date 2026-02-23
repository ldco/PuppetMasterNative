import { z } from 'zod'

import { pmNativeConfig } from '@/pm-native.config'
import { apiRequest } from '@/services/api'
import { genericRestUserSchema } from '@/services/genericRest.schemas'
import {
  AdminProviderError,
  type AdminProvider,
  type AdminProviderDirectoryUser,
  type AdminProviderGetUserInput,
  type AdminProviderListUsersInput,
  type AdminProviderRoleSummary,
  type AdminProviderUpdateUserRoleInput
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

const genericRestAdminRoleSchema = z.object({
  key: z.enum(['master', 'admin', 'editor', 'user']),
  label: z.string().min(1),
  description: z.string().min(1).nullable().optional(),
  assignable: z.boolean().optional()
})

const genericRestAdminRolesPayloadSchema = z.union([
  z.array(genericRestAdminRoleSchema),
  z.object({
    roles: z.array(genericRestAdminRoleSchema)
  }),
  z.object({
    success: z.literal(true),
    data: z.object({
      roles: z.array(genericRestAdminRoleSchema)
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

const normalizeGenericRestRolesPayload = (
  payload: z.infer<typeof genericRestAdminRolesPayloadSchema>
): AdminProviderRoleSummary[] => {
  const roles = Array.isArray(payload) ? payload : 'data' in payload ? payload.data.roles : payload.roles

  return roles.map((role) => ({
    key: role.key,
    label: role.label,
    description: role.description ?? null,
    assignable: role.assignable ?? true
  }))
}

const genericRestAdminEndpoints = pmNativeConfig.backend.genericRest?.admin?.endpoints
const genericRestListUsersEndpoint = genericRestAdminEndpoints?.listUsers
const genericRestGetUserEndpointTemplate = genericRestAdminEndpoints?.getUser
const genericRestListRolesEndpoint = genericRestAdminEndpoints?.listRoles
const genericRestUpdateUserRoleEndpointTemplate = genericRestAdminEndpoints?.updateUserRole

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

const resolveUpdateUserRoleEndpoint = (userId: string): string => {
  if (!genericRestUpdateUserRoleEndpointTemplate) {
    throw new AdminProviderError('generic-rest admin role update endpoint is not configured', 'CONFIG')
  }

  if (!genericRestUpdateUserRoleEndpointTemplate.includes(':id')) {
    throw new AdminProviderError(
      'generic-rest admin role update endpoint must include :id placeholder',
      'CONFIG'
    )
  }

  return genericRestUpdateUserRoleEndpointTemplate.replace(':id', encodeURIComponent(userId))
}

const requireAccessToken = (accessToken?: string | null): string => {
  if (!accessToken) {
    throw new AdminProviderError('No access token available for admin request', 'UNAUTHORIZED')
  }

  return accessToken
}

const toAdminProviderRequestError = (
  error: unknown,
  fallbackMessage: string
): AdminProviderError => {
  if (error instanceof AdminProviderError) {
    return error
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return new AdminProviderError(
      error.message,
      error.status === 401 || error.status === 403 ? 'UNAUTHORIZED' : 'PROVIDER'
    )
  }

  return new AdminProviderError(error instanceof Error ? error.message : fallbackMessage, 'PROVIDER')
}

const genericRestAdminProvider: AdminProvider = {
  getCapabilities() {
    const canListUsersRemote = Boolean(genericRestListUsersEndpoint)
    const canGetUserRemote = Boolean(genericRestGetUserEndpointTemplate)
    const canListRolesRemote = Boolean(genericRestListRolesEndpoint)
    const canUpdateUserRoleRemote = Boolean(genericRestUpdateUserRoleEndpointTemplate)

    return {
      canListUsersRemote,
      canGetUserRemote,
      canListRolesRemote,
      canUpdateUserRoleRemote,
      listUsersDetail: canListUsersRemote
        ? `GET ${genericRestListUsersEndpoint}`
        : 'generic-rest admin users endpoint is not configured (backend.genericRest.admin.endpoints.listUsers)',
      getUserDetail: canGetUserRemote
        ? `GET ${genericRestGetUserEndpointTemplate}`
        : 'generic-rest admin user detail endpoint is not configured (backend.genericRest.admin.endpoints.getUser)',
      listRolesDetail: canListRolesRemote
        ? `GET ${genericRestListRolesEndpoint}`
        : 'generic-rest admin roles endpoint is not configured (backend.genericRest.admin.endpoints.listRoles)',
      updateUserRoleDetail: canUpdateUserRoleRemote
        ? `PATCH ${genericRestUpdateUserRoleEndpointTemplate}`
        : 'generic-rest admin role update endpoint is not configured (backend.genericRest.admin.endpoints.updateUserRole)'
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
      throw toAdminProviderRequestError(error, 'Admin users request failed')
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
      throw toAdminProviderRequestError(error, 'Admin user detail request failed')
    })

    return normalizeGenericRestUserPayload(payload)
  },

  async listRoles(input: AdminProviderListUsersInput): Promise<AdminProviderRoleSummary[]> {
    if (!genericRestListRolesEndpoint) {
      throw new AdminProviderError('generic-rest admin roles endpoint is not configured', 'CONFIG')
    }

    const accessToken = requireAccessToken(input.accessToken)

    const payload = await apiRequest(genericRestListRolesEndpoint, {
      token: accessToken,
      schema: genericRestAdminRolesPayloadSchema,
      useAuthToken: false
    }).catch((error: unknown) => {
      throw toAdminProviderRequestError(error, 'Admin roles request failed')
    })

    return normalizeGenericRestRolesPayload(payload)
  },

  async updateUserRole(input: AdminProviderUpdateUserRoleInput): Promise<AdminProviderDirectoryUser> {
    const endpoint = resolveUpdateUserRoleEndpoint(input.userId)
    const accessToken = requireAccessToken(input.accessToken)

    const payload = await apiRequest(endpoint, {
      method: 'PATCH',
      token: accessToken,
      body: {
        role: input.role
      },
      schema: genericRestAdminUserPayloadSchema,
      useAuthToken: false
    }).catch((error: unknown) => {
      throw toAdminProviderRequestError(error, 'Admin role update request failed')
    })

    return normalizeGenericRestUserPayload(payload)
  }
}

const supabaseAdminProvider: AdminProvider = {
  getCapabilities() {
    return {
      canListUsersRemote: false,
      canGetUserRemote: false,
      canListRolesRemote: false,
      canUpdateUserRoleRemote: false,
      listUsersDetail: 'supabase admin directory endpoints are not implemented yet (provider stub active)',
      getUserDetail: 'supabase admin user detail endpoint is not implemented yet (provider stub active)',
      listRolesDetail: 'supabase admin roles endpoint is not implemented yet (provider stub active)',
      updateUserRoleDetail: 'supabase admin role update endpoint is not implemented yet (provider stub active)'
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
  },

  async listRoles(): Promise<AdminProviderRoleSummary[]> {
    return []
  },

  async updateUserRole() {
    throw new AdminProviderError('supabase admin role update endpoint is not implemented yet', 'NOT_SUPPORTED')
  }
}

const notSupportedProvider = (provider: string): AdminProvider => ({
  getCapabilities() {
    return {
      canListUsersRemote: false,
      canGetUserRemote: false,
      canListRolesRemote: false,
      canUpdateUserRoleRemote: false,
      listUsersDetail: `${provider} admin provider is not implemented yet`,
      getUserDetail: `${provider} admin provider is not implemented yet`,
      listRolesDetail: `${provider} admin provider is not implemented yet`,
      updateUserRoleDetail: `${provider} admin provider is not implemented yet`
    }
  },

  async listUsers() {
    throw new AdminProviderError(`${provider} admin provider is not implemented yet`, 'NOT_SUPPORTED')
  },

  async getUser() {
    throw new AdminProviderError(`${provider} admin provider is not implemented yet`, 'NOT_SUPPORTED')
  },

  async listRoles() {
    throw new AdminProviderError(`${provider} admin provider is not implemented yet`, 'NOT_SUPPORTED')
  },

  async updateUserRole() {
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
