import { z } from 'zod'

import { pmNativeConfig } from '@/pm-native.config'
import { apiRequest } from '@/services/api'
import {
  AdminProviderError,
  type AdminProvider,
  type AdminProviderDirectoryUser,
  type AdminProviderClearLogsResult,
  type AdminProviderGetUserInput,
  type AdminProviderListLogsInput,
  type AdminProviderListUsersInput,
  type AdminProviderHealthSnapshot,
  type AdminProviderLogEntry,
  type AdminProviderRoleSummary,
  type AdminProviderSettingsSnapshot,
  type AdminProviderUpdateUserLockInput,
  type AdminProviderUpdateUserRoleInput,
  type AdminProviderUpdateUserStatusInput
} from '@/services/admin.provider.types'

const genericRestAdminUserSchema = z
  .object({
    id: z.union([z.string().min(1), z.number().int().nonnegative()]),
    email: z.string().email(),
    name: z.string().min(1).nullable(),
    role: z.enum(['master', 'admin', 'editor', 'user']),
    disabled: z.boolean().optional(),
    locked: z.boolean().optional(),
    isLocked: z.boolean().optional(),
    lockedUntil: z.string().min(1).nullable().optional(),
    locked_until: z.string().min(1).nullable().optional()
  })
  .transform(({ id, isLocked, locked_until, ...value }) => ({
    ...value,
    id: String(id),
    locked: value.locked ?? isLocked,
    lockedUntil: value.lockedUntil ?? locked_until ?? null
  }))

const genericRestAdminUsersPayloadSchema = z.union([
  z.array(genericRestAdminUserSchema),
  z.object({
    users: z.array(genericRestAdminUserSchema)
  }),
  z.object({
    success: z.literal(true),
    data: z.object({
      users: z.array(genericRestAdminUserSchema)
    })
  })
])

const genericRestAdminUserPayloadSchema = z.union([
  genericRestAdminUserSchema,
  z.object({
    user: genericRestAdminUserSchema
  }),
  z.object({
    success: z.literal(true),
    data: z.object({
      user: genericRestAdminUserSchema
    })
  })
])

const normalizeAdminUser = (
  user: AdminProviderDirectoryUser &
    Partial<{
      isLocked: boolean
      locked_until: string | null
    }>
): AdminProviderDirectoryUser => {
  const normalizedLocked =
    typeof user.locked === 'boolean' ? user.locked : user.isLocked
  const normalizedLockedUntil =
    typeof user.lockedUntil !== 'undefined'
      ? user.lockedUntil
      : typeof user.locked_until !== 'undefined'
        ? user.locked_until
        : undefined

  return {
    id: String(user.id),
    email: user.email,
    name: user.name ?? null,
    role: user.role,
    ...(typeof user.disabled === 'boolean' ? { disabled: user.disabled } : {}),
    ...(typeof normalizedLocked === 'boolean' ? { locked: normalizedLocked } : {}),
    ...(typeof normalizedLockedUntil !== 'undefined' ? { lockedUntil: normalizedLockedUntil } : {})
  }
}

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

const genericRestAdminLogLevelSchema = z
  .enum(['trace', 'debug', 'info', 'warn', 'warning', 'error', 'fatal', 'audit', 'unknown'])
  .optional()

const genericRestAdminLogEntrySchema = z.object({
  id: z.union([z.string().min(1), z.number().int().nonnegative()]).optional(),
  timestamp: z.string().min(1).nullable().optional(),
  createdAt: z.string().min(1).nullable().optional(),
  created_at: z.string().min(1).nullable().optional(),
  level: genericRestAdminLogLevelSchema,
  message: z.string().min(1),
  source: z.string().min(1).nullable().optional(),
  service: z.string().min(1).nullable().optional(),
  category: z.string().min(1).nullable().optional()
})

const genericRestAdminLogsPayloadSchema = z.union([
  z.array(genericRestAdminLogEntrySchema),
  z.object({
    logs: z.array(genericRestAdminLogEntrySchema)
  }),
  z.object({
    success: z.literal(true),
    data: z.union([
      z.array(genericRestAdminLogEntrySchema),
      z.object({
        logs: z.array(genericRestAdminLogEntrySchema)
      })
    ])
  })
])

const genericRestAdminClearLogsPayloadSchema = z.union([
  z.object({
    clearedCount: z.number().int().nonnegative().optional(),
    count: z.number().int().nonnegative().optional()
  }),
  z.object({
    success: z.literal(true),
    clearedCount: z.number().int().nonnegative().optional(),
    count: z.number().int().nonnegative().optional()
  }),
  z.object({
    success: z.literal(true),
    data: z.object({
      clearedCount: z.number().int().nonnegative().optional(),
      count: z.number().int().nonnegative().optional()
    })
  })
])

const genericRestAdminSettingValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

const genericRestAdminSettingItemSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1).optional(),
  value: genericRestAdminSettingValueSchema,
  group: z.string().min(1).nullable().optional(),
  section: z.string().min(1).nullable().optional()
})

const genericRestAdminSettingsSchema = z.object({
  updatedAt: z.string().min(1).nullable().optional(),
  updated_at: z.string().min(1).nullable().optional(),
  items: z.array(genericRestAdminSettingItemSchema).optional(),
  settings: z.array(genericRestAdminSettingItemSchema).optional()
})

const genericRestAdminSettingsPayloadSchema = z.union([
  z.array(genericRestAdminSettingItemSchema),
  genericRestAdminSettingsSchema,
  z.object({
    settings: z.array(genericRestAdminSettingItemSchema)
  }),
  z.object({
    success: z.literal(true),
    data: z.union([
      z.array(genericRestAdminSettingItemSchema),
      genericRestAdminSettingsSchema,
      z.object({
        settings: z.array(genericRestAdminSettingItemSchema)
      })
    ])
  })
])

const genericRestAdminHealthStatusSchema = z.enum([
  'ok',
  'warning',
  'degraded',
  'error',
  'down',
  'unknown'
])

const genericRestAdminHealthCheckSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1).optional(),
  status: genericRestAdminHealthStatusSchema,
  message: z.string().min(1).nullable().optional()
})

const genericRestAdminHealthSchema = z.object({
  status: genericRestAdminHealthStatusSchema,
  checkedAt: z.string().min(1).nullable().optional(),
  checked_at: z.string().min(1).nullable().optional(),
  message: z.string().min(1).nullable().optional(),
  checks: z.array(genericRestAdminHealthCheckSchema).optional()
})

const genericRestAdminHealthPayloadSchema = z.union([
  genericRestAdminHealthSchema,
  z.object({
    health: genericRestAdminHealthSchema
  }),
  z.object({
    success: z.literal(true),
    data: z.union([
      genericRestAdminHealthSchema,
      z.object({
        health: genericRestAdminHealthSchema
      })
    ])
  })
])

const normalizeGenericRestUsersPayload = (
  payload: z.infer<typeof genericRestAdminUsersPayloadSchema>
): AdminProviderDirectoryUser[] => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeAdminUser)
  }

  if ('data' in payload) {
    return payload.data.users.map(normalizeAdminUser)
  }

  return payload.users.map(normalizeAdminUser)
}

const normalizeGenericRestUserPayload = (
  payload: z.infer<typeof genericRestAdminUserPayloadSchema>
): AdminProviderDirectoryUser => {
  if ('data' in payload) {
    return normalizeAdminUser(payload.data.user)
  }

  if ('user' in payload) {
    return normalizeAdminUser(payload.user)
  }

  return normalizeAdminUser(payload)
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

const normalizeLogLevel = (
  level: z.infer<typeof genericRestAdminLogLevelSchema>
): AdminProviderLogEntry['level'] => {
  if (level === 'trace') {
    return 'debug'
  }

  if (level === 'warn') {
    return 'warning'
  }

  if (level === 'fatal') {
    return 'error'
  }

  return level ?? 'unknown'
}

const normalizeGenericRestLogsPayload = (
  payload: z.infer<typeof genericRestAdminLogsPayloadSchema>
): AdminProviderLogEntry[] => {
  const logs = Array.isArray(payload)
    ? payload
    : 'data' in payload
      ? Array.isArray(payload.data)
        ? payload.data
        : payload.data.logs
      : payload.logs

  return logs.map((log, index) => {
    const timestamp = log.timestamp ?? log.createdAt ?? log.created_at ?? null
    const source = log.source ?? log.service ?? log.category ?? null
    const id =
      log.id !== undefined
        ? String(log.id)
        : `${timestamp ?? 'no-ts'}:${index}:${log.message.slice(0, 24)}`

    return {
      id,
      timestamp,
      level: normalizeLogLevel(log.level),
      message: log.message,
      source
    }
  })
}

const normalizeGenericRestClearLogsPayload = (
  payload: z.infer<typeof genericRestAdminClearLogsPayloadSchema>
): AdminProviderClearLogsResult => {
  const raw = 'data' in payload ? payload.data : payload

  return {
    clearedCount: raw.clearedCount ?? raw.count ?? null
  }
}

const normalizeGenericRestSettingsPayload = (
  payload: z.infer<typeof genericRestAdminSettingsPayloadSchema>
): AdminProviderSettingsSnapshot => {
  const raw = 'data' in payload ? payload.data : payload
  const rawItems = Array.isArray(raw)
    ? raw
    : 'settings' in raw && Array.isArray(raw.settings)
      ? raw.settings
      : 'items' in raw && Array.isArray(raw.items)
        ? raw.items
        : []

  const updatedAt =
    Array.isArray(raw)
      ? null
      : ('updatedAt' in raw && typeof raw.updatedAt !== 'undefined'
          ? raw.updatedAt
          : 'updated_at' in raw
            ? raw.updated_at
            : null) ?? null

  return {
    updatedAt,
    items: rawItems.map((item) => ({
      key: item.key,
      label: item.label ?? item.key,
      value: item.value,
      group: item.group ?? item.section ?? null
    }))
  }
}

const normalizeHealthStatus = (
  status: z.infer<typeof genericRestAdminHealthStatusSchema>
): AdminProviderHealthSnapshot['status'] => {
  if (status === 'degraded') {
    return 'warning'
  }

  if (status === 'down') {
    return 'error'
  }

  return status
}

const normalizeGenericRestHealthPayload = (
  payload: z.infer<typeof genericRestAdminHealthPayloadSchema>
): AdminProviderHealthSnapshot => {
  const raw =
    'data' in payload
      ? ('health' in payload.data ? payload.data.health : payload.data)
      : 'health' in payload
        ? payload.health
        : payload

  return {
    status: normalizeHealthStatus(raw.status),
    checkedAt: raw.checkedAt ?? raw.checked_at ?? null,
    message: raw.message ?? null,
    checks: (raw.checks ?? []).map((check) => ({
      key: check.key,
      label: check.label ?? check.key,
      status: normalizeHealthStatus(check.status),
      message: check.message ?? null
    }))
  }
}

const genericRestAdminEndpoints = pmNativeConfig.backend.genericRest?.admin?.endpoints
const genericRestListUsersEndpoint = genericRestAdminEndpoints?.listUsers
const genericRestGetUserEndpointTemplate = genericRestAdminEndpoints?.getUser
const genericRestListRolesEndpoint = genericRestAdminEndpoints?.listRoles
const genericRestListLogsEndpoint = genericRestAdminEndpoints?.listLogs
const genericRestClearLogsEndpoint = genericRestAdminEndpoints?.clearLogs
const genericRestSettingsEndpoint = genericRestAdminEndpoints?.settings
const genericRestUpdateUserRoleEndpointTemplate = genericRestAdminEndpoints?.updateUserRole
const genericRestUpdateUserStatusEndpointTemplate = genericRestAdminEndpoints?.updateUserStatus
const genericRestUpdateUserLockEndpointTemplate = genericRestAdminEndpoints?.updateUserLock
const genericRestHealthEndpoint = genericRestAdminEndpoints?.health

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

const resolveUpdateUserStatusEndpoint = (userId: string): string => {
  if (!genericRestUpdateUserStatusEndpointTemplate) {
    throw new AdminProviderError('generic-rest admin status update endpoint is not configured', 'CONFIG')
  }

  if (!genericRestUpdateUserStatusEndpointTemplate.includes(':id')) {
    throw new AdminProviderError(
      'generic-rest admin status update endpoint must include :id placeholder',
      'CONFIG'
    )
  }

  return genericRestUpdateUserStatusEndpointTemplate.replace(':id', encodeURIComponent(userId))
}

const resolveUpdateUserLockEndpoint = (userId: string): string => {
  if (!genericRestUpdateUserLockEndpointTemplate) {
    throw new AdminProviderError('generic-rest admin lock update endpoint is not configured', 'CONFIG')
  }

  if (!genericRestUpdateUserLockEndpointTemplate.includes(':id')) {
    throw new AdminProviderError(
      'generic-rest admin lock update endpoint must include :id placeholder',
      'CONFIG'
    )
  }

  return genericRestUpdateUserLockEndpointTemplate.replace(':id', encodeURIComponent(userId))
}

const requireAccessToken = (accessToken?: string | null): string => {
  if (!accessToken) {
    throw new AdminProviderError('No access token available for admin request', 'UNAUTHORIZED')
  }

  return accessToken
}

const appendQueryParam = (endpoint: string, key: string, value: string): string => {
  const encodedValue = encodeURIComponent(value)
  return endpoint.includes('?')
    ? `${endpoint}&${key}=${encodedValue}`
    : `${endpoint}?${key}=${encodedValue}`
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
    const canListLogsRemote = Boolean(genericRestListLogsEndpoint)
    const canClearLogsRemote = Boolean(genericRestClearLogsEndpoint)
    const canGetSettingsRemote = Boolean(genericRestSettingsEndpoint)
    const canUpdateUserRoleRemote = Boolean(genericRestUpdateUserRoleEndpointTemplate)
    const canUpdateUserStatusRemote = Boolean(genericRestUpdateUserStatusEndpointTemplate)
    const canUpdateUserLockRemote = Boolean(genericRestUpdateUserLockEndpointTemplate)
    const canGetHealthRemote = Boolean(genericRestHealthEndpoint)

    return {
      canListUsersRemote,
      canGetUserRemote,
      canListRolesRemote,
      canListLogsRemote,
      canClearLogsRemote,
      canGetSettingsRemote,
      canUpdateUserRoleRemote,
      canUpdateUserStatusRemote,
      canUpdateUserLockRemote,
      canGetHealthRemote,
      listUsersDetail: canListUsersRemote
        ? `GET ${genericRestListUsersEndpoint}`
        : 'generic-rest admin users endpoint is not configured (backend.genericRest.admin.endpoints.listUsers)',
      getUserDetail: canGetUserRemote
        ? `GET ${genericRestGetUserEndpointTemplate}`
        : 'generic-rest admin user detail endpoint is not configured (backend.genericRest.admin.endpoints.getUser)',
      listRolesDetail: canListRolesRemote
        ? `GET ${genericRestListRolesEndpoint}`
        : 'generic-rest admin roles endpoint is not configured (backend.genericRest.admin.endpoints.listRoles)',
      listLogsDetail: canListLogsRemote
        ? `GET ${genericRestListLogsEndpoint}`
        : 'generic-rest admin logs endpoint is not configured (backend.genericRest.admin.endpoints.listLogs)',
      clearLogsDetail: canClearLogsRemote
        ? `POST ${genericRestClearLogsEndpoint}`
        : 'generic-rest admin clear logs endpoint is not configured (backend.genericRest.admin.endpoints.clearLogs)',
      getSettingsDetail: canGetSettingsRemote
        ? `GET ${genericRestSettingsEndpoint}`
        : 'generic-rest admin settings endpoint is not configured (backend.genericRest.admin.endpoints.settings)',
      updateUserRoleDetail: canUpdateUserRoleRemote
        ? `PATCH ${genericRestUpdateUserRoleEndpointTemplate}`
        : 'generic-rest admin role update endpoint is not configured (backend.genericRest.admin.endpoints.updateUserRole)',
      updateUserStatusDetail: canUpdateUserStatusRemote
        ? `PATCH ${genericRestUpdateUserStatusEndpointTemplate}`
        : 'generic-rest admin status update endpoint is not configured (backend.genericRest.admin.endpoints.updateUserStatus)',
      updateUserLockDetail: canUpdateUserLockRemote
        ? `PATCH ${genericRestUpdateUserLockEndpointTemplate}`
        : 'generic-rest admin lock update endpoint is not configured (backend.genericRest.admin.endpoints.updateUserLock)',
      getHealthDetail: canGetHealthRemote
        ? `GET ${genericRestHealthEndpoint}`
        : 'generic-rest admin health endpoint is not configured (backend.genericRest.admin.endpoints.health)'
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

  async listLogs(input: AdminProviderListLogsInput): Promise<AdminProviderLogEntry[]> {
    if (!genericRestListLogsEndpoint) {
      throw new AdminProviderError('generic-rest admin logs endpoint is not configured', 'CONFIG')
    }

    const accessToken = requireAccessToken(input.accessToken)
    const endpoint =
      typeof input.limit === 'number' && Number.isFinite(input.limit) && input.limit > 0
        ? appendQueryParam(genericRestListLogsEndpoint, 'limit', String(Math.floor(input.limit)))
        : genericRestListLogsEndpoint

    const payload = await apiRequest(endpoint, {
      token: accessToken,
      schema: genericRestAdminLogsPayloadSchema,
      useAuthToken: false
    }).catch((error: unknown) => {
      throw toAdminProviderRequestError(error, 'Admin logs request failed')
    })

    return normalizeGenericRestLogsPayload(payload)
  },

  async clearLogs(input: AdminProviderListUsersInput): Promise<AdminProviderClearLogsResult> {
    if (!genericRestClearLogsEndpoint) {
      throw new AdminProviderError('generic-rest admin clear logs endpoint is not configured', 'CONFIG')
    }

    const accessToken = requireAccessToken(input.accessToken)

    const payload = await apiRequest(genericRestClearLogsEndpoint, {
      method: 'POST',
      token: accessToken,
      schema: genericRestAdminClearLogsPayloadSchema,
      useAuthToken: false
    }).catch((error: unknown) => {
      throw toAdminProviderRequestError(error, 'Admin clear logs request failed')
    })

    return normalizeGenericRestClearLogsPayload(payload)
  },

  async getSettings(input: AdminProviderListUsersInput): Promise<AdminProviderSettingsSnapshot> {
    if (!genericRestSettingsEndpoint) {
      throw new AdminProviderError('generic-rest admin settings endpoint is not configured', 'CONFIG')
    }

    const accessToken = requireAccessToken(input.accessToken)

    const payload = await apiRequest(genericRestSettingsEndpoint, {
      token: accessToken,
      schema: genericRestAdminSettingsPayloadSchema,
      useAuthToken: false
    }).catch((error: unknown) => {
      throw toAdminProviderRequestError(error, 'Admin settings request failed')
    })

    return normalizeGenericRestSettingsPayload(payload)
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
  },

  async updateUserStatus(input: AdminProviderUpdateUserStatusInput): Promise<AdminProviderDirectoryUser> {
    const endpoint = resolveUpdateUserStatusEndpoint(input.userId)
    const accessToken = requireAccessToken(input.accessToken)

    const payload = await apiRequest(endpoint, {
      method: 'PATCH',
      token: accessToken,
      body: {
        disabled: input.disabled
      },
      schema: genericRestAdminUserPayloadSchema,
      useAuthToken: false
    }).catch((error: unknown) => {
      throw toAdminProviderRequestError(error, 'Admin status update request failed')
    })

    return normalizeGenericRestUserPayload(payload)
  },

  async updateUserLock(input: AdminProviderUpdateUserLockInput): Promise<AdminProviderDirectoryUser> {
    const endpoint = resolveUpdateUserLockEndpoint(input.userId)
    const accessToken = requireAccessToken(input.accessToken)

    const payload = await apiRequest(endpoint, {
      method: 'PATCH',
      token: accessToken,
      body: {
        locked: input.locked
      },
      schema: genericRestAdminUserPayloadSchema,
      useAuthToken: false
    }).catch((error: unknown) => {
      throw toAdminProviderRequestError(error, 'Admin lock update request failed')
    })

    return normalizeGenericRestUserPayload(payload)
  },

  async getHealth(input: AdminProviderListUsersInput): Promise<AdminProviderHealthSnapshot> {
    if (!genericRestHealthEndpoint) {
      throw new AdminProviderError('generic-rest admin health endpoint is not configured', 'CONFIG')
    }

    const accessToken = requireAccessToken(input.accessToken)

    const payload = await apiRequest(genericRestHealthEndpoint, {
      token: accessToken,
      schema: genericRestAdminHealthPayloadSchema,
      useAuthToken: false
    }).catch((error: unknown) => {
      throw toAdminProviderRequestError(error, 'Admin health request failed')
    })

    return normalizeGenericRestHealthPayload(payload)
  }
}

const supabaseAdminProvider: AdminProvider = {
  getCapabilities() {
    return {
      canListUsersRemote: false,
      canGetUserRemote: false,
      canListRolesRemote: false,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'supabase admin directory endpoints are not implemented yet (provider stub active)',
      getUserDetail: 'supabase admin user detail endpoint is not implemented yet (provider stub active)',
      listRolesDetail: 'supabase admin roles endpoint is not implemented yet (provider stub active)',
      listLogsDetail: 'supabase admin logs endpoint is not implemented yet (provider stub active)',
      clearLogsDetail: 'supabase admin clear logs endpoint is not implemented yet (provider stub active)',
      getSettingsDetail: 'supabase admin settings endpoint is not implemented yet (provider stub active)',
      updateUserRoleDetail: 'supabase admin role update endpoint is not implemented yet (provider stub active)',
      updateUserStatusDetail: 'supabase admin status update endpoint is not implemented yet (provider stub active)',
      updateUserLockDetail: 'supabase admin lock update endpoint is not implemented yet (provider stub active)',
      getHealthDetail: 'supabase admin health endpoint is not implemented yet (provider stub active)'
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

  async listLogs(): Promise<AdminProviderLogEntry[]> {
    return []
  },

  async clearLogs(): Promise<AdminProviderClearLogsResult> {
    throw new AdminProviderError('supabase admin clear logs endpoint is not implemented yet', 'NOT_SUPPORTED')
  },

  async getSettings(): Promise<AdminProviderSettingsSnapshot> {
    return {
      updatedAt: null,
      items: []
    }
  },

  async updateUserRole() {
    throw new AdminProviderError('supabase admin role update endpoint is not implemented yet', 'NOT_SUPPORTED')
  },

  async updateUserStatus() {
    throw new AdminProviderError('supabase admin status update endpoint is not implemented yet', 'NOT_SUPPORTED')
  },

  async updateUserLock() {
    throw new AdminProviderError('supabase admin lock update endpoint is not implemented yet', 'NOT_SUPPORTED')
  },

  async getHealth() {
    throw new AdminProviderError('supabase admin health endpoint is not implemented yet', 'NOT_SUPPORTED')
  }
}

const notSupportedProvider = (provider: string): AdminProvider => ({
  getCapabilities() {
    return {
      canListUsersRemote: false,
      canGetUserRemote: false,
      canListRolesRemote: false,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: `${provider} admin provider is not implemented yet`,
      getUserDetail: `${provider} admin provider is not implemented yet`,
      listRolesDetail: `${provider} admin provider is not implemented yet`,
      listLogsDetail: `${provider} admin provider is not implemented yet`,
      clearLogsDetail: `${provider} admin provider is not implemented yet`,
      getSettingsDetail: `${provider} admin provider is not implemented yet`,
      updateUserRoleDetail: `${provider} admin provider is not implemented yet`,
      updateUserStatusDetail: `${provider} admin provider is not implemented yet`,
      updateUserLockDetail: `${provider} admin provider is not implemented yet`,
      getHealthDetail: `${provider} admin provider is not implemented yet`
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

  async listLogs() {
    throw new AdminProviderError(`${provider} admin provider is not implemented yet`, 'NOT_SUPPORTED')
  },

  async clearLogs() {
    throw new AdminProviderError(`${provider} admin provider is not implemented yet`, 'NOT_SUPPORTED')
  },

  async getSettings() {
    throw new AdminProviderError(`${provider} admin provider is not implemented yet`, 'NOT_SUPPORTED')
  },

  async updateUserRole() {
    throw new AdminProviderError(`${provider} admin provider is not implemented yet`, 'NOT_SUPPORTED')
  },

  async updateUserStatus() {
    throw new AdminProviderError(`${provider} admin provider is not implemented yet`, 'NOT_SUPPORTED')
  },

  async updateUserLock() {
    throw new AdminProviderError(`${provider} admin provider is not implemented yet`, 'NOT_SUPPORTED')
  },

  async getHealth() {
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
