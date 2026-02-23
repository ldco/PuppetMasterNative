import type { Role } from '@/types/config'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  avatarUrl?: string | null
  role: Role
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export interface ForgotPasswordInput {
  email: string
}

export interface AuthSession {
  token: string
  refreshToken?: string | null
  user: AuthUser
}

export type AuthRegisterResult =
  | {
      kind: 'session'
      session: AuthSession
    }
  | {
      kind: 'email_confirmation_required'
      email: string
    }

export type AuthSocialResult =
  | {
      kind: 'session'
      session: AuthSession
    }
  | {
      kind: 'redirect_started'
    }

export interface RefreshSessionResult {
  token: string
  refreshToken?: string | null
  user?: AuthUser
}
