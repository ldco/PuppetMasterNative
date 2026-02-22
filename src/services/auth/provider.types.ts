import type {
  AuthRegisterResult,
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

export type AuthProviderErrorCode = 'UNAUTHORIZED' | 'CONFIG' | 'PROVIDER' | 'UNKNOWN'

export class AuthProviderError extends Error {
  readonly code: AuthProviderErrorCode

  constructor(message: string, code: AuthProviderErrorCode = 'UNKNOWN') {
    super(message)
    this.name = 'AuthProviderError'
    this.code = code
  }
}

export interface AuthProvider {
  login: (input: LoginInput) => Promise<AuthSession>
  register: (input: RegisterInput) => Promise<AuthRegisterResult>
  requestPasswordReset: (input: ForgotPasswordInput) => Promise<void>
  logout: (context: AuthLogoutContext) => Promise<void>
  getSessionUser: (token: string) => Promise<AuthUser>
  refreshAccessToken: (refreshToken: string) => Promise<RefreshSessionResult>
}
