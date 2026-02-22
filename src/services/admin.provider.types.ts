import type { AuthUser } from '@/types/auth'

export interface AdminProviderCapabilities {
  canListUsersRemote: boolean
  detail: string
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

export interface AdminProviderDirectoryUser {
  id: string
  email: string
  name: string | null
  role: AuthUser['role']
}

export interface AdminProvider {
  getCapabilities: () => AdminProviderCapabilities
  listUsers: (input: AdminProviderListUsersInput) => Promise<AdminProviderDirectoryUser[]>
}
