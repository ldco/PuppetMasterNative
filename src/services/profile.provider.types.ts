import type { AuthUser } from '@/types/auth'

export interface ProfileProviderCapabilities {
  canFetchRemote: boolean
  canUpdateRemote: boolean
  canUploadAvatar: boolean
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
    avatarUrl?: string | null
  }
}

export interface ProfileProviderRotatedSession {
  token: string
  refreshToken: string | null
}

export interface ProfileAvatarUploadFile {
  uri: string
  fileName?: string | null
  mimeType?: string | null
  webFile?: Blob | null
}

export interface ProfileProviderUpdateResult {
  user: AuthUser
  rotatedSession?: ProfileProviderRotatedSession
}

export interface ProfileProviderUploadAvatarInput {
  userId: string
  accessToken?: string | null
  refreshToken?: string | null
  file: ProfileAvatarUploadFile
}

export interface ProfileProviderUploadAvatarResult {
  avatarUrl: string
  rotatedSession?: ProfileProviderRotatedSession
}

export interface ProfileProvider {
  getCapabilities: () => ProfileProviderCapabilities
  getProfile: (input: ProfileProviderGetInput) => Promise<AuthUser>
  updateProfile: (input: ProfileProviderUpdateInput) => Promise<ProfileProviderUpdateResult>
  uploadAvatar: (input: ProfileProviderUploadAvatarInput) => Promise<ProfileProviderUploadAvatarResult>
}
