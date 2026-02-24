import { pmNativeConfig } from '@/pm-native.config'
import { adminProvider } from '@/services/admin.provider'
import { AdminProviderError } from '@/services/admin.provider.types'
import type { AdminProviderLogExportJobStatus } from '@/services/admin.provider.types'
import type { AuthUser } from '@/types/auth'
import type { Role } from '@/types/config'

export interface AdminDirectoryUser {
  id: string
  name: string
  email: string
  role: Role
  disabled?: boolean
  locked?: boolean
  lockedUntil?: string | null
}

export interface AdminUserSession {
  id: string
  createdAt: string | null
  lastSeenAt: string | null
  ipAddress: string | null
  userAgent: string | null
  current?: boolean
  revoked?: boolean
}

export interface AdminRoleSummary {
  key: Role
  label: string
  description: string | null
  assignable: boolean
}

export type AdminLogLevel = 'debug' | 'info' | 'warning' | 'error' | 'audit' | 'unknown'
export type AdminLogExportFormat = 'json' | 'csv'

export interface AdminLogEntry {
  id: string
  timestamp: string | null
  level: AdminLogLevel
  message: string
  source: string | null
  acknowledged?: boolean
  acknowledgedAt?: string | null
  resolved?: boolean
  resolvedAt?: string | null
}

export type AdminSettingValue = string | number | boolean | null

export interface AdminSettingItem {
  key: string
  label: string
  value: AdminSettingValue
  group: string | null
}

export interface AdminSettingsSnapshot {
  updatedAt: string | null
  items: AdminSettingItem[]
}

export type AdminHealthStatus = 'ok' | 'warning' | 'error' | 'unknown'

export interface AdminHealthCheck {
  key: string
  label: string
  status: AdminHealthStatus
  message: string | null
}

export interface AdminHealthSnapshot {
  status: AdminHealthStatus
  checkedAt: string | null
  message: string | null
  checks: AdminHealthCheck[]
}

export interface AdminDirectoryQueryInput {
  activeUser: AuthUser | null
  accessToken?: string | null
}

export interface AdminLogsQueryInput extends AdminDirectoryQueryInput {
  limit?: number
}

export interface AdminUserDetailQueryInput extends AdminDirectoryQueryInput {
  userId: string
}

export interface AdminUpdateUserRoleInput extends AdminUserDetailQueryInput {
  role: Role
}

export interface AdminUpdateUserStatusInput extends AdminUserDetailQueryInput {
  disabled: boolean
}

export interface AdminUpdateUserLockInput extends AdminUserDetailQueryInput {
  locked: boolean
}

export interface AdminDirectoryResult {
  users: AdminDirectoryUser[]
  source: 'remote' | 'session-fallback'
  sourceDetail: string
}

export interface AdminUserDetailResult {
  user: AdminDirectoryUser | null
  source: 'remote' | 'session-fallback'
  sourceDetail: string
}

export interface AdminUpdateUserRoleResult {
  user: AdminDirectoryUser
  source: 'remote'
  sourceDetail: string
}

export interface AdminUpdateUserStatusResult {
  user: AdminDirectoryUser
  source: 'remote'
  sourceDetail: string
}

export interface AdminUpdateUserLockResult {
  user: AdminDirectoryUser
  source: 'remote'
  sourceDetail: string
}

export interface AdminUserSessionsResult {
  sessions: AdminUserSession[]
  source: 'remote' | 'local-fallback'
  sourceDetail: string
}

export interface AdminRevokeUserSessionsResult {
  revokedCount: number | null
  source: 'remote'
  sourceDetail: string
}

export interface AdminRevokeUserSessionResult {
  session: AdminUserSession | null
  revokedCount: number | null
  source: 'remote'
  sourceDetail: string
}

export interface AdminRolesResult {
  roles: AdminRoleSummary[]
  source: 'remote' | 'config-fallback'
  sourceDetail: string
}

export interface AdminLogsResult {
  logs: AdminLogEntry[]
  source: 'remote' | 'local-fallback'
  sourceDetail: string
}

export interface AdminClearLogsResult {
  clearedCount: number | null
  source: 'remote'
  sourceDetail: string
}

export interface AdminExportLogsResult {
  url: string | null
  jobId: string | null
  format: AdminLogExportFormat | null
  source: 'remote'
  sourceDetail: string
}

export type AdminLogExportJobStatus = AdminProviderLogExportJobStatus

export interface AdminLogExportJobResult {
  jobId: string
  status: AdminLogExportJobStatus
  url: string | null
  format: AdminLogExportFormat | null
  message: string | null
  source: 'remote'
  sourceDetail: string
}

export interface AdminAcknowledgeLogResult {
  log: AdminLogEntry
  source: 'remote'
  sourceDetail: string
}

export interface AdminExportLogsInput extends AdminLogsQueryInput {
  format?: AdminLogExportFormat
}

export interface AdminGetLogExportJobInput extends AdminDirectoryQueryInput {
  jobId: string
}

export interface AdminResolveLogResult {
  log: AdminLogEntry
  source: 'remote'
  sourceDetail: string
}

export interface AdminRetryLogResult {
  log: AdminLogEntry
  source: 'remote'
  sourceDetail: string
}

export interface AdminSettingsResult {
  settings: AdminSettingsSnapshot
  source: 'remote' | 'config-fallback'
  sourceDetail: string
}

export interface AdminHealthResult {
  health: AdminHealthSnapshot
  source: 'remote' | 'local-fallback'
  sourceDetail: string
}

const toDirectoryUsers = (activeUser: AuthUser | null): AdminDirectoryUser[] => {
  if (!activeUser) {
    return []
  }

  return [
    {
      id: activeUser.id,
      name: activeUser.name ?? 'Unknown user',
      email: activeUser.email,
      role: activeUser.role
    }
  ]
}

const toAdminDirectoryUsers = (
  users: Awaited<ReturnType<typeof adminProvider.listUsers>>
): AdminDirectoryUser[] => {
  return users.map((user) => ({
    ...user,
    name: user.name ?? 'Unknown user'
  }))
}

const roleFallbackOrder: Role[] = ['master', 'admin', 'editor', 'user']
const roleFallbackLabels: Record<Role, string> = {
  master: 'Master',
  admin: 'Admin',
  editor: 'Editor',
  user: 'User'
}

const toFallbackRoles = (): AdminRoleSummary[] => {
  return roleFallbackOrder.map((role) => ({
    key: role,
    label: roleFallbackLabels[role],
    description: null,
    assignable: role !== 'master',
  }))
}

const toFallbackHealth = (message: string): AdminHealthSnapshot => {
  return {
    status: 'unknown',
    checkedAt: null,
    message,
    checks: []
  }
}

const toFallbackLogs = (): AdminLogEntry[] => {
  return []
}

const toFallbackUserSessions = (): AdminUserSession[] => {
  return []
}

const toFallbackSettings = (): AdminSettingsSnapshot => {
  const featureItems: AdminSettingItem[] = [
    {
      key: 'features.auth',
      label: 'Auth',
      value: pmNativeConfig.features.auth,
      group: 'features'
    },
    {
      key: 'features.registration',
      label: 'Registration',
      value: pmNativeConfig.features.registration,
      group: 'features'
    },
    {
      key: 'features.forgotPassword',
      label: 'Forgot Password',
      value: pmNativeConfig.features.forgotPassword,
      group: 'features'
    },
    {
      key: 'features.admin',
      label: 'Admin',
      value: pmNativeConfig.features.admin,
      group: 'features'
    }
  ]

  const runtimeItems: AdminSettingItem[] = [
    {
      key: 'backend.provider',
      label: 'Backend Provider',
      value: pmNativeConfig.backend.provider,
      group: 'runtime'
    },
    {
      key: 'api.baseUrl',
      label: 'API Base URL',
      value: pmNativeConfig.api.baseUrl,
      group: 'runtime'
    }
  ]

  return {
    updatedAt: null,
    items: [...featureItems, ...runtimeItems]
  }
}

export const adminService = {
  getCapabilities() {
    return adminProvider.getCapabilities()
  },

  async listUsers(input: AdminDirectoryQueryInput): Promise<AdminDirectoryResult> {
    if (!input.activeUser) {
      return {
        users: [],
        source: 'session-fallback',
        sourceDetail: 'No active user'
      }
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canListUsersRemote) {
      return {
        users: toDirectoryUsers(input.activeUser),
        source: 'session-fallback',
        sourceDetail: capability.listUsersDetail
      }
    }

    try {
      const users = await adminProvider.listUsers({ accessToken: input.accessToken })
      return {
        users: toAdminDirectoryUsers(users),
        source: 'remote',
        sourceDetail: capability.listUsersDetail
      }
    } catch (error) {
      if (
        error instanceof AdminProviderError &&
        (error.code === 'CONFIG' || error.code === 'NOT_SUPPORTED' || error.code === 'UNAUTHORIZED')
      ) {
        return {
          users: toDirectoryUsers(input.activeUser),
          source: 'session-fallback',
          sourceDetail: error.message
        }
      }

      throw error
    }
  },

  async refreshUsers(input: AdminDirectoryQueryInput): Promise<AdminDirectoryResult> {
    return adminService.listUsers(input)
  },

  async getUser(input: AdminUserDetailQueryInput): Promise<AdminUserDetailResult> {
    if (!input.activeUser) {
      return {
        user: null,
        source: 'session-fallback',
        sourceDetail: 'No active user'
      }
    }

    const fallbackUser =
      input.activeUser.id === input.userId
        ? toDirectoryUsers(input.activeUser)[0] ?? null
        : null

    const capability = adminProvider.getCapabilities()
    if (!capability.canGetUserRemote) {
      return {
        user: fallbackUser,
        source: 'session-fallback',
        sourceDetail: capability.getUserDetail
      }
    }

    try {
      const user = await adminProvider.getUser({
        accessToken: input.accessToken,
        userId: input.userId
      })

      return {
        user: {
          ...user,
          name: user.name ?? 'Unknown user'
        },
        source: 'remote',
        sourceDetail: capability.getUserDetail
      }
    } catch (error) {
      if (
        error instanceof AdminProviderError &&
        (error.code === 'CONFIG' || error.code === 'NOT_SUPPORTED' || error.code === 'UNAUTHORIZED')
      ) {
        return {
          user: fallbackUser,
          source: 'session-fallback',
          sourceDetail: error.message
        }
      }

      throw error
    }
  },

  async listRoles(input: AdminDirectoryQueryInput): Promise<AdminRolesResult> {
    if (!input.activeUser) {
      return {
        roles: [],
        source: 'config-fallback',
        sourceDetail: 'No active user'
      }
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canListRolesRemote) {
      return {
        roles: toFallbackRoles(),
        source: 'config-fallback',
        sourceDetail: capability.listRolesDetail
      }
    }

    try {
      const roles = await adminProvider.listRoles({ accessToken: input.accessToken })
      return {
        roles,
        source: 'remote',
        sourceDetail: capability.listRolesDetail
      }
    } catch (error) {
      if (
        error instanceof AdminProviderError &&
        (error.code === 'CONFIG' || error.code === 'NOT_SUPPORTED' || error.code === 'UNAUTHORIZED')
      ) {
        return {
          roles: toFallbackRoles(),
          source: 'config-fallback',
          sourceDetail: error.message
        }
      }

      throw error
    }
  },

  async refreshRoles(input: AdminDirectoryQueryInput): Promise<AdminRolesResult> {
    return adminService.listRoles(input)
  },

  async getLogs(input: AdminLogsQueryInput): Promise<AdminLogsResult> {
    if (!input.activeUser) {
      return {
        logs: toFallbackLogs(),
        source: 'local-fallback',
        sourceDetail: 'No active user'
      }
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canListLogsRemote) {
      return {
        logs: toFallbackLogs(),
        source: 'local-fallback',
        sourceDetail: capability.listLogsDetail
      }
    }

    try {
      const logs = await adminProvider.listLogs({
        accessToken: input.accessToken,
        limit: input.limit
      })
      return {
        logs,
        source: 'remote',
        sourceDetail: capability.listLogsDetail
      }
    } catch (error) {
      if (
        error instanceof AdminProviderError &&
        (error.code === 'CONFIG' || error.code === 'NOT_SUPPORTED' || error.code === 'UNAUTHORIZED')
      ) {
        return {
          logs: toFallbackLogs(),
          source: 'local-fallback',
          sourceDetail: error.message
        }
      }

      throw error
    }
  },

  async refreshLogs(input: AdminLogsQueryInput): Promise<AdminLogsResult> {
    return adminService.getLogs(input)
  },

  async clearLogs(input: AdminDirectoryQueryInput): Promise<AdminClearLogsResult> {
    if (!input.activeUser) {
      throw new AdminProviderError('No active user', 'UNAUTHORIZED')
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canClearLogsRemote) {
      throw new AdminProviderError(capability.clearLogsDetail, 'NOT_SUPPORTED')
    }

    const result = await adminProvider.clearLogs({ accessToken: input.accessToken })

    return {
      clearedCount: result.clearedCount,
      source: 'remote',
      sourceDetail: capability.clearLogsDetail
    }
  },

  async exportLogs(input: AdminExportLogsInput): Promise<AdminExportLogsResult> {
    if (!input.activeUser) {
      throw new AdminProviderError('No active user', 'UNAUTHORIZED')
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canExportLogsRemote) {
      throw new AdminProviderError(capability.exportLogsDetail, 'NOT_SUPPORTED')
    }

    const result = await adminProvider.exportLogs({
      accessToken: input.accessToken,
      limit: input.limit,
      format: input.format
    })

    return {
      url: result.url,
      jobId: result.jobId,
      format: result.format,
      source: 'remote',
      sourceDetail: capability.exportLogsDetail
    }
  },

  async getLogExportJob(input: AdminGetLogExportJobInput): Promise<AdminLogExportJobResult> {
    if (!input.activeUser) {
      throw new AdminProviderError('No active user', 'UNAUTHORIZED')
    }
    const normalizedJobId = input.jobId.trim()
    if (!normalizedJobId) {
      throw new AdminProviderError('Export job id is required', 'UNKNOWN')
    }

    const capability = adminProvider.getCapabilities()
    if (capability.canGetLogExportJobRemote !== true) {
      throw new AdminProviderError(
        capability.getLogExportJobDetail ?? 'Admin export job status endpoint is not supported',
        'NOT_SUPPORTED'
      )
    }

    const result = await adminProvider.getLogExportJob({
      accessToken: input.accessToken,
      jobId: normalizedJobId
    })

    return {
      jobId: result.jobId,
      status: result.status,
      url: result.url,
      format: result.format,
      message: result.message,
      source: 'remote',
      sourceDetail: capability.getLogExportJobDetail ?? capability.exportLogsDetail
    }
  },

  async acknowledgeLog(input: AdminDirectoryQueryInput & { logId: string }): Promise<AdminAcknowledgeLogResult> {
    if (!input.activeUser) {
      throw new AdminProviderError('No active user', 'UNAUTHORIZED')
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canAcknowledgeLogRemote) {
      throw new AdminProviderError(capability.acknowledgeLogDetail, 'NOT_SUPPORTED')
    }

    const log = await adminProvider.acknowledgeLog({
      accessToken: input.accessToken,
      logId: input.logId
    })

    return {
      log,
      source: 'remote',
      sourceDetail: capability.acknowledgeLogDetail
    }
  },

  async resolveLog(input: AdminDirectoryQueryInput & { logId: string }): Promise<AdminResolveLogResult> {
    const capability = adminProvider.getCapabilities()

    if (!input.activeUser) {
      throw new AdminProviderError('Active admin user is required', 'UNAUTHORIZED')
    }

    if (!capability.canResolveLogRemote) {
      throw new AdminProviderError(capability.resolveLogDetail, 'NOT_SUPPORTED')
    }

    const log = await adminProvider.resolveLog({
      accessToken: input.accessToken,
      logId: input.logId
    })

    return {
      log,
      source: 'remote',
      sourceDetail: capability.resolveLogDetail
    }
  },

  async retryLog(input: AdminDirectoryQueryInput & { logId: string }): Promise<AdminRetryLogResult> {
    const capability = adminProvider.getCapabilities()

    if (!input.activeUser) {
      throw new AdminProviderError('Active admin user is required', 'UNAUTHORIZED')
    }

    if (!capability.canRetryLogRemote) {
      throw new AdminProviderError(capability.retryLogDetail, 'NOT_SUPPORTED')
    }

    const log = await adminProvider.retryLog({
      accessToken: input.accessToken,
      logId: input.logId
    })

    return {
      log,
      source: 'remote',
      sourceDetail: capability.retryLogDetail
    }
  },

  async getSettings(input: AdminDirectoryQueryInput): Promise<AdminSettingsResult> {
    if (!input.activeUser) {
      return {
        settings: toFallbackSettings(),
        source: 'config-fallback',
        sourceDetail: 'No active user'
      }
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canGetSettingsRemote) {
      return {
        settings: toFallbackSettings(),
        source: 'config-fallback',
        sourceDetail: capability.getSettingsDetail
      }
    }

    try {
      const settings = await adminProvider.getSettings({ accessToken: input.accessToken })
      return {
        settings,
        source: 'remote',
        sourceDetail: capability.getSettingsDetail
      }
    } catch (error) {
      if (
        error instanceof AdminProviderError &&
        (error.code === 'CONFIG' || error.code === 'NOT_SUPPORTED' || error.code === 'UNAUTHORIZED')
      ) {
        return {
          settings: toFallbackSettings(),
          source: 'config-fallback',
          sourceDetail: error.message
        }
      }

      throw error
    }
  },

  async refreshSettings(input: AdminDirectoryQueryInput): Promise<AdminSettingsResult> {
    return adminService.getSettings(input)
  },

  async updateUserRole(input: AdminUpdateUserRoleInput): Promise<AdminUpdateUserRoleResult> {
    if (!input.activeUser) {
      throw new AdminProviderError('No active user', 'UNAUTHORIZED')
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canUpdateUserRoleRemote) {
      throw new AdminProviderError(capability.updateUserRoleDetail, 'NOT_SUPPORTED')
    }

    const user = await adminProvider.updateUserRole({
      accessToken: input.accessToken,
      userId: input.userId,
      role: input.role
    })

    return {
      user: {
        ...user,
        name: user.name ?? 'Unknown user'
      },
      source: 'remote',
      sourceDetail: capability.updateUserRoleDetail
    }
  },

  async updateUserStatus(input: AdminUpdateUserStatusInput): Promise<AdminUpdateUserStatusResult> {
    if (!input.activeUser) {
      throw new AdminProviderError('No active user', 'UNAUTHORIZED')
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canUpdateUserStatusRemote) {
      throw new AdminProviderError(capability.updateUserStatusDetail, 'NOT_SUPPORTED')
    }

    const user = await adminProvider.updateUserStatus({
      accessToken: input.accessToken,
      userId: input.userId,
      disabled: input.disabled
    })

    return {
      user: {
        ...user,
        name: user.name ?? 'Unknown user'
      },
      source: 'remote',
      sourceDetail: capability.updateUserStatusDetail
    }
  },

  async updateUserLock(input: AdminUpdateUserLockInput): Promise<AdminUpdateUserLockResult> {
    if (!input.activeUser) {
      throw new AdminProviderError('No active user', 'UNAUTHORIZED')
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canUpdateUserLockRemote) {
      throw new AdminProviderError(capability.updateUserLockDetail, 'NOT_SUPPORTED')
    }

    const user = await adminProvider.updateUserLock({
      accessToken: input.accessToken,
      userId: input.userId,
      locked: input.locked
    })

    return {
      user: {
        ...user,
        name: user.name ?? 'Unknown user'
      },
      source: 'remote',
      sourceDetail: capability.updateUserLockDetail
    }
  },

  async getUserSessions(input: AdminUserDetailQueryInput): Promise<AdminUserSessionsResult> {
    if (!input.activeUser) {
      return {
        sessions: toFallbackUserSessions(),
        source: 'local-fallback',
        sourceDetail: 'No active user'
      }
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canListUserSessionsRemote) {
      return {
        sessions: toFallbackUserSessions(),
        source: 'local-fallback',
        sourceDetail: capability.listUserSessionsDetail
      }
    }

    try {
      const sessions = await adminProvider.listUserSessions({
        accessToken: input.accessToken,
        userId: input.userId
      })
      return {
        sessions,
        source: 'remote',
        sourceDetail: capability.listUserSessionsDetail
      }
    } catch (error) {
      if (
        error instanceof AdminProviderError &&
        (error.code === 'CONFIG' || error.code === 'NOT_SUPPORTED' || error.code === 'UNAUTHORIZED')
      ) {
        return {
          sessions: toFallbackUserSessions(),
          source: 'local-fallback',
          sourceDetail: error.message
        }
      }

      throw error
    }
  },

  async refreshUserSessions(input: AdminUserDetailQueryInput): Promise<AdminUserSessionsResult> {
    return adminService.getUserSessions(input)
  },

  async revokeUserSessions(input: AdminUserDetailQueryInput): Promise<AdminRevokeUserSessionsResult> {
    if (!input.activeUser) {
      throw new AdminProviderError('No active user', 'UNAUTHORIZED')
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canRevokeUserSessionsRemote) {
      throw new AdminProviderError(capability.revokeUserSessionsDetail, 'NOT_SUPPORTED')
    }

    const result = await adminProvider.revokeUserSessions({
      accessToken: input.accessToken,
      userId: input.userId
    })

    return {
      revokedCount: result.revokedCount,
      source: 'remote',
      sourceDetail: capability.revokeUserSessionsDetail
    }
  },

  async revokeUserSession(
    input: AdminUserDetailQueryInput & { sessionId: string }
  ): Promise<AdminRevokeUserSessionResult> {
    if (!input.activeUser) {
      throw new AdminProviderError('No active user', 'UNAUTHORIZED')
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canRevokeUserSessionRemote) {
      throw new AdminProviderError(capability.revokeUserSessionDetail, 'NOT_SUPPORTED')
    }

    const result = await adminProvider.revokeUserSession({
      accessToken: input.accessToken,
      userId: input.userId,
      sessionId: input.sessionId
    })

    return {
      session: result.session,
      revokedCount: result.revokedCount,
      source: 'remote',
      sourceDetail: capability.revokeUserSessionDetail
    }
  },

  async getHealth(input: AdminDirectoryQueryInput): Promise<AdminHealthResult> {
    if (!input.activeUser) {
      return {
        health: toFallbackHealth('No active user'),
        source: 'local-fallback',
        sourceDetail: 'No active user'
      }
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canGetHealthRemote) {
      return {
        health: toFallbackHealth(capability.getHealthDetail),
        source: 'local-fallback',
        sourceDetail: capability.getHealthDetail
      }
    }

    try {
      const health = await adminProvider.getHealth({ accessToken: input.accessToken })
      return {
        health,
        source: 'remote',
        sourceDetail: capability.getHealthDetail
      }
    } catch (error) {
      if (
        error instanceof AdminProviderError &&
        (error.code === 'CONFIG' || error.code === 'NOT_SUPPORTED' || error.code === 'UNAUTHORIZED')
      ) {
        return {
          health: toFallbackHealth(error.message),
          source: 'local-fallback',
          sourceDetail: error.message
        }
      }

      throw error
    }
  },

  async refreshHealth(input: AdminDirectoryQueryInput): Promise<AdminHealthResult> {
    return adminService.getHealth(input)
  }
}
