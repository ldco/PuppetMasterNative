import type { AuthError, User } from '@supabase/supabase-js'
import * as ExpoLinking from 'expo-linking'
import { Platform } from 'react-native'

import { pmNativeConfig } from '@/pm-native.config'
import { getSupabaseClient } from '@/services/supabase.client'
import {
  AuthProviderError,
  defaultAuthProviderCapabilities,
  type AuthProvider,
  type SocialAuthMode,
  type SocialAuthProvider
} from '@/services/auth/provider.types'
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

const getSocialCapabilities = () => {
  return {
    ...defaultAuthProviderCapabilities.socialAuth,
    google: Boolean(pmNativeConfig.backend.socialAuth?.google)
  }
}

const assertSupportedSupabaseSocialProvider = (
  provider: SocialAuthProvider
): provider is 'google' => {
  return provider === 'google'
}

const getWebOrigin = (): string | null => {
  if (Platform.OS !== 'web') {
    return null
  }

  const location = (globalThis as { location?: { origin?: string } }).location
  return typeof location?.origin === 'string' && location.origin.length > 0 ? location.origin : null
}

const buildSocialRedirectUrl = (mode: SocialAuthMode): string => {
  const rawUrl = ExpoLinking.createURL('/oauth-callback')
  const webOrigin = getWebOrigin()
  const url = webOrigin ? new URL(rawUrl, webOrigin) : new URL(rawUrl)
  url.searchParams.set('mode', mode)
  return url.toString()
}

const openSocialRedirect = async (url: string): Promise<void> => {
  if (Platform.OS === 'web') {
    const location = (globalThis as { location?: { assign?: (href: string) => void } }).location

    if (location?.assign) {
      location.assign(url)
      return
    }
  }

  await ExpoLinking.openURL(url)
}

const parseCallbackUrl = (callbackUrl: string): URL => {
  try {
    return new URL(callbackUrl)
  } catch {
    const webOrigin = getWebOrigin()

    if (webOrigin) {
      try {
        return new URL(callbackUrl, webOrigin)
      } catch {
        // fall through to provider error below
      }
    }

    throw new AuthProviderError('Invalid social auth callback URL', 'PROVIDER')
  }
}

const getCallbackError = (url: URL): AuthProviderError | null => {
  const query = url.searchParams
  const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash)
  const error = query.get('error') ?? hashParams.get('error')
  const errorDescription =
    query.get('error_description') ??
    hashParams.get('error_description') ??
    query.get('errorDescription') ??
    hashParams.get('errorDescription')

  if (!error) {
    return null
  }

  const message =
    errorDescription?.trim() ||
    (error === 'access_denied' ? 'Social sign-in was cancelled' : 'Social sign-in failed')

  return new AuthProviderError(message, error === 'access_denied' ? 'CANCELLED' : 'PROVIDER')
}

export const supabaseAuthProvider: AuthProvider = {
  getCapabilities() {
    return {
      socialAuth: getSocialCapabilities()
    }
  },

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

  async signInWithSocial(provider, mode) {
    const capabilities = getSocialCapabilities()

    if (!capabilities[provider]) {
      throw new AuthProviderError(`${provider} social auth is disabled in configuration`, 'NOT_SUPPORTED')
    }

    if (!assertSupportedSupabaseSocialProvider(provider)) {
      throw new AuthProviderError(`${provider} is not supported by the Supabase provider yet`, 'NOT_SUPPORTED')
    }

    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: buildSocialRedirectUrl(mode),
        skipBrowserRedirect: true
      }
    })

    if (error) {
      throw toProviderError(error)
    }

    if (!data.url) {
      throw new AuthProviderError('Supabase did not return a social auth redirect URL', 'PROVIDER')
    }

    await openSocialRedirect(data.url)

    return {
      kind: 'redirect_started'
    }
  },

  async completeSocialAuthCallback(callbackUrl) {
    if (!getSocialCapabilities().google) {
      throw new AuthProviderError('google social auth is disabled in configuration', 'NOT_SUPPORTED')
    }

    const supabase = getSupabaseClient()
    const parsedUrl = parseCallbackUrl(callbackUrl)
    const callbackError = getCallbackError(parsedUrl)

    if (callbackError) {
      throw callbackError
    }

    const code = parsedUrl.searchParams.get('code')

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        throw toProviderError(error)
      }

      return requireSession(data.session, 'Supabase social auth callback did not return a session')
    }

    const hashParams = new URLSearchParams(
      parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash
    )
    const accessToken = hashParams.get('access_token') ?? parsedUrl.searchParams.get('access_token')
    const refreshToken =
      hashParams.get('refresh_token') ?? parsedUrl.searchParams.get('refresh_token')

    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      if (error) {
        throw toProviderError(error)
      }

      return requireSession(data.session, 'Supabase social auth callback did not return a session')
    }

    throw new AuthProviderError(
      'Supabase social auth callback is missing OAuth code or session tokens',
      'PROVIDER'
    )
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
