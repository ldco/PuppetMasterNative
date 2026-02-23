import type { AuthUser } from '@/types/auth'

export interface AdminProviderCapabilities {
  canListUsersRemote: boolean
  canGetUserRemote: boolean
  canListRolesRemote: boolean
  canUpdateUserRoleRemote: boolean
  listUsersDetail: string
  getUserDetail: string
  listRolesDetail: string
  updateUserRoleDetail: string
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

export interface AdminProviderGetUserInput {
  accessToken?: string | null
  userId: string
}

export interface AdminProviderUpdateUserRoleInput extends AdminProviderGetUserInput {
  role: AuthUser['role']
}

export interface AdminProviderDirectoryUser {
  id: string
  email: string
  name: string | null
  role: AuthUser['role']
}

export interface AdminProviderRoleSummary {
  key: AuthUser['role']
  label: string
  description: string | null
  assignable: boolean
}

export interface AdminProvider {
  getCapabilities: () => AdminProviderCapabilities
  listUsers: (input: AdminProviderListUsersInput) => Promise<AdminProviderDirectoryUser[]>
  getUser: (input: AdminProviderGetUserInput) => Promise<AdminProviderDirectoryUser>
  listRoles: (input: AdminProviderListUsersInput) => Promise<AdminProviderRoleSummary[]>
  updateUserRole: (input: AdminProviderUpdateUserRoleInput) => Promise<AdminProviderDirectoryUser>
}
