import type { AuthUser } from '@/types/auth'

export interface AdminProviderCapabilities {
  canListUsersRemote: boolean
  canGetUserRemote: boolean
  canListRolesRemote: boolean
  canListLogsRemote: boolean
  canClearLogsRemote: boolean
  canExportLogsRemote: boolean
  canGetLogExportJobRemote?: boolean
  canAcknowledgeLogRemote: boolean
  canResolveLogRemote: boolean
  canRetryLogRemote: boolean
  canGetSettingsRemote: boolean
  canUpdateUserRoleRemote: boolean
  canUpdateUserStatusRemote: boolean
  canUpdateUserLockRemote: boolean
  canListUserSessionsRemote: boolean
  canRevokeUserSessionsRemote: boolean
  canRevokeUserSessionRemote: boolean
  canGetHealthRemote: boolean
  listUsersDetail: string
  getUserDetail: string
  listRolesDetail: string
  listLogsDetail: string
  clearLogsDetail: string
  exportLogsDetail: string
  getLogExportJobDetail?: string
  acknowledgeLogDetail: string
  resolveLogDetail: string
  retryLogDetail: string
  getSettingsDetail: string
  updateUserRoleDetail: string
  updateUserStatusDetail: string
  updateUserLockDetail: string
  listUserSessionsDetail: string
  revokeUserSessionsDetail: string
  revokeUserSessionDetail: string
  getHealthDetail: string
}

export type AdminProviderErrorCode =
  | 'NOT_SUPPORTED'
  | 'CONFIG'
  | 'UNAUTHORIZED'
  | 'PROVIDER'
  | 'UNKNOWN'

export class AdminProviderError extends Error {
  readonly code: AdminProviderErrorCode

  constructor(message: string, code: AdminProviderErrorCode = 'UNKNOWN') {
    super(message)
    this.name = 'AdminProviderError'
    this.code = code
  }
}

export interface AdminProviderListUsersInput {
  accessToken?: string | null
}

export interface AdminProviderListLogsInput extends AdminProviderListUsersInput {
  limit?: number
}

export interface AdminProviderClearLogsInput extends AdminProviderListUsersInput {}

export type AdminProviderLogExportFormat = 'json' | 'csv'

export interface AdminProviderExportLogsInput extends AdminProviderListLogsInput {
  format?: AdminProviderLogExportFormat
  query?: string
  levels?: AdminProviderLogLevel[]
  from?: string
  to?: string
}

export interface AdminProviderGetLogExportJobInput extends AdminProviderListUsersInput {
  jobId: string
}

export interface AdminProviderAcknowledgeLogInput extends AdminProviderListUsersInput {
  logId: string
}

export interface AdminProviderResolveLogInput extends AdminProviderListUsersInput {
  logId: string
}

export interface AdminProviderRetryLogInput extends AdminProviderListUsersInput {
  logId: string
}

export interface AdminProviderGetUserInput {
  accessToken?: string | null
  userId: string
}

export interface AdminProviderUpdateUserRoleInput extends AdminProviderGetUserInput {
  role: AuthUser['role']
}

export interface AdminProviderUpdateUserStatusInput extends AdminProviderGetUserInput {
  disabled: boolean
}

export interface AdminProviderUpdateUserLockInput extends AdminProviderGetUserInput {
  locked: boolean
}

export interface AdminProviderListUserSessionsInput extends AdminProviderGetUserInput {}

export interface AdminProviderRevokeUserSessionsInput extends AdminProviderGetUserInput {
  reason?: string
}

export interface AdminProviderRevokeUserSessionInput extends AdminProviderGetUserInput {
  sessionId: string
  reason?: string
}

export interface AdminProviderDirectoryUser {
  id: string
  email: string
  name: string | null
  role: AuthUser['role']
  disabled?: boolean
  locked?: boolean
  lockedUntil?: string | null
}

export interface AdminProviderRoleSummary {
  key: AuthUser['role']
  label: string
  description: string | null
  assignable: boolean
}

export interface AdminProviderUserSession {
  id: string
  createdAt: string | null
  lastSeenAt: string | null
  ipAddress: string | null
  userAgent: string | null
  current?: boolean
  revoked?: boolean
}

export type AdminProviderLogLevel =
  | 'debug'
  | 'info'
  | 'warning'
  | 'error'
  | 'audit'
  | 'unknown'

export interface AdminProviderLogEntry {
  id: string
  timestamp: string | null
  level: AdminProviderLogLevel
  message: string
  source: string | null
  acknowledged?: boolean
  acknowledgedAt?: string | null
  resolved?: boolean
  resolvedAt?: string | null
}

export interface AdminProviderClearLogsResult {
  clearedCount: number | null
}

export interface AdminProviderExportLogsResult {
  url: string | null
  jobId: string | null
  format: AdminProviderLogExportFormat | null
}

export type AdminProviderLogExportJobStatus =
  | 'queued'
  | 'running'
  | 'ready'
  | 'error'
  | 'unknown'

export interface AdminProviderLogExportJobResult {
  jobId: string
  status: AdminProviderLogExportJobStatus
  url: string | null
  format: AdminProviderLogExportFormat | null
  message: string | null
}

export type AdminProviderSettingValue = string | number | boolean | null

export interface AdminProviderSettingItem {
  key: string
  label: string
  value: AdminProviderSettingValue
  group: string | null
}

export interface AdminProviderSettingsSnapshot {
  updatedAt: string | null
  items: AdminProviderSettingItem[]
}

export type AdminProviderHealthStatus = 'ok' | 'warning' | 'error' | 'unknown'

export interface AdminProviderHealthCheck {
  key: string
  label: string
  status: AdminProviderHealthStatus
  message: string | null
}

export interface AdminProviderHealthSnapshot {
  status: AdminProviderHealthStatus
  checkedAt: string | null
  message: string | null
  checks: AdminProviderHealthCheck[]
}

export interface AdminProviderRevokeUserSessionsResult {
  revokedCount: number | null
}

export interface AdminProviderRevokeUserSessionResult {
  session: AdminProviderUserSession | null
  revokedCount: number | null
}

export interface AdminProvider {
  getCapabilities: () => AdminProviderCapabilities
  listUsers: (input: AdminProviderListUsersInput) => Promise<AdminProviderDirectoryUser[]>
  getUser: (input: AdminProviderGetUserInput) => Promise<AdminProviderDirectoryUser>
  listRoles: (input: AdminProviderListUsersInput) => Promise<AdminProviderRoleSummary[]>
  listLogs: (input: AdminProviderListLogsInput) => Promise<AdminProviderLogEntry[]>
  clearLogs: (input: AdminProviderClearLogsInput) => Promise<AdminProviderClearLogsResult>
  exportLogs: (input: AdminProviderExportLogsInput) => Promise<AdminProviderExportLogsResult>
  getLogExportJob: (input: AdminProviderGetLogExportJobInput) => Promise<AdminProviderLogExportJobResult>
  acknowledgeLog: (input: AdminProviderAcknowledgeLogInput) => Promise<AdminProviderLogEntry>
  resolveLog: (input: AdminProviderResolveLogInput) => Promise<AdminProviderLogEntry>
  retryLog: (input: AdminProviderRetryLogInput) => Promise<AdminProviderLogEntry>
  getSettings: (input: AdminProviderListUsersInput) => Promise<AdminProviderSettingsSnapshot>
  updateUserRole: (input: AdminProviderUpdateUserRoleInput) => Promise<AdminProviderDirectoryUser>
  updateUserStatus: (input: AdminProviderUpdateUserStatusInput) => Promise<AdminProviderDirectoryUser>
  updateUserLock: (input: AdminProviderUpdateUserLockInput) => Promise<AdminProviderDirectoryUser>
  listUserSessions: (input: AdminProviderListUserSessionsInput) => Promise<AdminProviderUserSession[]>
  revokeUserSessions: (
    input: AdminProviderRevokeUserSessionsInput
  ) => Promise<AdminProviderRevokeUserSessionsResult>
  revokeUserSession: (
    input: AdminProviderRevokeUserSessionInput
  ) => Promise<AdminProviderRevokeUserSessionResult>
  getHealth: (input: AdminProviderListUsersInput) => Promise<AdminProviderHealthSnapshot>
}
