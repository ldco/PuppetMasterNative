import type {
  AuthRegisterResult,
  AuthSocialResult,
  AuthSession,
  AuthUser,
  ForgotPasswordInput,
  LoginInput,
  RefreshSessionResult,
  RegisterInput
} from '@/types/auth'

export interface AuthLogoutContext {
  accessToken?: string | null
  refreshToken?: string | null
}

export type SocialAuthProvider = 'google' | 'telegram' | 'vk'
export type SocialAuthMode = 'login' | 'register'

export interface AuthProviderCapabilities {
  socialAuth: Record<SocialAuthProvider, boolean>
}

export const defaultAuthProviderCapabilities: AuthProviderCapabilities = {
  socialAuth: {
    google: false,
    telegram: false,
    vk: false
  }
}

export type AuthProviderErrorCode =
  | 'UNAUTHORIZED'
  | 'CONFIG'
  | 'PROVIDER'
  | 'NOT_SUPPORTED'
  | 'CANCELLED'
  | 'UNKNOWN'

export class AuthProviderError extends Error {
  readonly code: AuthProviderErrorCode

  constructor(message: string, code: AuthProviderErrorCode = 'UNKNOWN') {
    super(message)
    this.name = 'AuthProviderError'
    this.code = code
  }
}

export interface AuthProvider {
  getCapabilities: () => AuthProviderCapabilities
  login: (input: LoginInput) => Promise<AuthSession>
  register: (input: RegisterInput) => Promise<AuthRegisterResult>
  signInWithSocial: (provider: SocialAuthProvider, mode: SocialAuthMode) => Promise<AuthSocialResult>
  completeSocialAuthCallback: (callbackUrl: string) => Promise<AuthSession>
  requestPasswordReset: (input: ForgotPasswordInput) => Promise<void>
  logout: (context: AuthLogoutContext) => Promise<void>
  getSessionUser: (token: string) => Promise<AuthUser>
  refreshAccessToken: (refreshToken: string) => Promise<RefreshSessionResult>
}
