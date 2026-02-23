import type { AuthUser } from '@/types/auth'

export interface AdminProviderCapabilities {
  canListUsersRemote: boolean
  canGetUserRemote: boolean
  canListRolesRemote: boolean
  canListLogsRemote: boolean
  canClearLogsRemote: boolean
  canGetSettingsRemote: boolean
  canUpdateUserRoleRemote: boolean
  canUpdateUserStatusRemote: boolean
  canUpdateUserLockRemote: boolean
  canGetHealthRemote: boolean
  listUsersDetail: string
  getUserDetail: string
  listRolesDetail: string
  listLogsDetail: string
  clearLogsDetail: string
  getSettingsDetail: string
  updateUserRoleDetail: string
  updateUserStatusDetail: string
  updateUserLockDetail: string
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
}

export interface AdminProviderClearLogsResult {
  clearedCount: number | null
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

export interface AdminProvider {
  getCapabilities: () => AdminProviderCapabilities
  listUsers: (input: AdminProviderListUsersInput) => Promise<AdminProviderDirectoryUser[]>
  getUser: (input: AdminProviderGetUserInput) => Promise<AdminProviderDirectoryUser>
  listRoles: (input: AdminProviderListUsersInput) => Promise<AdminProviderRoleSummary[]>
  listLogs: (input: AdminProviderListLogsInput) => Promise<AdminProviderLogEntry[]>
  clearLogs: (input: AdminProviderClearLogsInput) => Promise<AdminProviderClearLogsResult>
  getSettings: (input: AdminProviderListUsersInput) => Promise<AdminProviderSettingsSnapshot>
  updateUserRole: (input: AdminProviderUpdateUserRoleInput) => Promise<AdminProviderDirectoryUser>
  updateUserStatus: (input: AdminProviderUpdateUserStatusInput) => Promise<AdminProviderDirectoryUser>
  updateUserLock: (input: AdminProviderUpdateUserLockInput) => Promise<AdminProviderDirectoryUser>
  getHealth: (input: AdminProviderListUsersInput) => Promise<AdminProviderHealthSnapshot>
}
