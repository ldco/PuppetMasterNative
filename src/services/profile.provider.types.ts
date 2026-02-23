import type { AuthUser } from '@/types/auth'

export interface ProfileProviderCapabilities {
  canFetchRemote: boolean
  canUpdateRemote: boolean
  detail: string
}

export type ProfileProviderErrorCode =
  | 'NOT_SUPPORTED'
  | 'CONFIG'
  | 'UNAUTHORIZED'
  | 'PROVIDER'
  | 'UNKNOWN'

export class ProfileProviderError extends Error {
  readonly code: ProfileProviderErrorCode

  constructor(message: string, code: ProfileProviderErrorCode = 'UNKNOWN') {
    super(message)
    this.name = 'ProfileProviderError'
    this.code = code
  }
}

export interface ProfileProviderGetInput {
  accessToken?: string | null
}

export interface ProfileProviderUpdateInput {
  accessToken?: string | null
  refreshToken?: string | null
  profile: {
    name: string
  }
}

export interface ProfileProvider {
  getCapabilities: () => ProfileProviderCapabilities
  getProfile: (input: ProfileProviderGetInput) => Promise<AuthUser>
  updateProfile: (input: ProfileProviderUpdateInput) => Promise<AuthUser>
}
