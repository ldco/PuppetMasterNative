import { pmNativeConfig } from '@/pm-native.config'
import {
  AuthProviderError,
  defaultAuthProviderCapabilities,
  type AuthProvider
} from '@/services/auth/provider.types'
import { genericRestAuthProvider } from '@/services/auth/providers/genericRestAuthProvider'
import { supabaseAuthProvider } from '@/services/auth/providers/supabaseAuthProvider'

const notImplementedProvider = (provider: string): AuthProvider => ({
  getCapabilities() {
    return defaultAuthProviderCapabilities
  },
  async login() {
    throw new AuthProviderError(`${provider} auth provider is not implemented yet`, 'PROVIDER')
  },
  async register() {
    throw new AuthProviderError(`${provider} auth provider is not implemented yet`, 'PROVIDER')
  },
  async signInWithSocial() {
    throw new AuthProviderError(`${provider} social auth is not implemented yet`, 'NOT_SUPPORTED')
  },
  async completeSocialAuthCallback() {
    throw new AuthProviderError(`${provider} social auth is not implemented yet`, 'NOT_SUPPORTED')
  },
  async requestPasswordReset() {
    throw new AuthProviderError(`${provider} auth provider is not implemented yet`, 'PROVIDER')
  },
  async logout() {
    throw new AuthProviderError(`${provider} auth provider is not implemented yet`, 'PROVIDER')
  },
  async getSessionUser() {
    throw new AuthProviderError(`${provider} auth provider is not implemented yet`, 'PROVIDER')
  },
  async refreshAccessToken() {
    throw new AuthProviderError(`${provider} auth provider is not implemented yet`, 'PROVIDER')
  }
})

export const authProvider: AuthProvider = (() => {
  switch (pmNativeConfig.backend.provider) {
    case 'generic-rest':
      return genericRestAuthProvider
    case 'supabase':
      return supabaseAuthProvider
    default:
      return notImplementedProvider('unknown')
  }
})()
