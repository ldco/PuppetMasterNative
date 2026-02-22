import type { AuthError, User } from '@supabase/supabase-js'

import { getSupabaseClient } from '@/services/supabase.client'
import { AuthProviderError, type AuthProvider } from '@/services/auth/provider.types'
import type { AuthRegisterResult, AuthUser, RefreshSessionResult } from '@/types/auth'
import type { Role } from '@/types/config'

const roleValues: Role[] = ['master', 'admin', 'editor', 'user']

const resolveRole = (user: User): Role => {
  const appRole = user.app_metadata?.role
  const userRole = user.user_metadata?.role

  if (typeof appRole === 'string' && roleValues.includes(appRole as Role)) {
    return appRole as Role
  }

  if (typeof userRole === 'string' && roleValues.includes(userRole as Role)) {
    return userRole as Role
  }

  return 'user'
}

const resolveName = (user: User): string | null => {
  const candidates = [
    user.user_metadata?.name,
    user.user_metadata?.full_name,
    user.user_metadata?.display_name
  ]

  const value = candidates.find((candidate) => {
    return typeof candidate === 'string' && candidate.trim().length > 0
  })

  return typeof value === 'string' ? value.trim() : null
}

const mapSupabaseUser = (user: User): AuthUser => {
  if (!user.email) {
    throw new Error('Supabase user is missing email')
  }

  return {
    id: user.id,
    email: user.email,
    name: resolveName(user),
    role: resolveRole(user)
  }
}

const requireSession = (
  session: { access_token: string; refresh_token: string | null; user: User } | null,
  fallbackMessage: string
): { token: string; refreshToken: string | null; user: AuthUser } => {
  if (!session) {
    throw new Error(fallbackMessage)
  }

  return {
    token: session.access_token,
    refreshToken: session.refresh_token,
    user: mapSupabaseUser(session.user)
  }
}

const toProviderError = (error: AuthError): AuthProviderError => {
  if (error.status === 401 || error.status === 403) {
    return new AuthProviderError(error.message, 'UNAUTHORIZED')
  }

  return new AuthProviderError(error.message, 'PROVIDER')
}

export const supabaseAuthProvider: AuthProvider = {
  async login(input) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password
    })

    if (error) {
      throw new Error(error.message)
    }

    return requireSession(data.session, 'Supabase sign-in did not return a session')
  },

  async register(input): Promise<AuthRegisterResult> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          name: input.name
        }
      }
    })

    if (error) {
      throw toProviderError(error)
    }

    if (!data.session) {
      return {
        kind: 'email_confirmation_required',
        email: input.email
      }
    }

    return {
      kind: 'session',
      session: requireSession(data.session, 'Supabase sign-up did not return a session')
    }
  },

  async requestPasswordReset(input) {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.resetPasswordForEmail(input.email)

    if (error) {
      throw toProviderError(error)
    }
  },

  async logout({ accessToken, refreshToken }) {
    if (!refreshToken || !accessToken) {
      return
    }

    const supabase = getSupabaseClient()
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: accessToken ?? '',
      refresh_token: refreshToken
    })

    if (setSessionError) {
      throw toProviderError(setSessionError)
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      throw toProviderError(error)
    }
  },

  async getSessionUser(token) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.getUser(token)

    if (error) {
      throw toProviderError(error)
    }

    if (!data.user) {
      throw new Error('Supabase did not return a user for the provided session token')
    }

    return mapSupabaseUser(data.user)
  },

  async refreshAccessToken(refreshToken) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    })

    if (error) {
      throw toProviderError(error)
    }

    if (!data.session) {
      throw new Error('Supabase refresh did not return a session')
    }

    const result: RefreshSessionResult = {
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: data.user ? mapSupabaseUser(data.user) : mapSupabaseUser(data.session.user)
    }

    return result
  }
}
