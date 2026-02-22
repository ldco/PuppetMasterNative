import { pmNativeConfig } from '@/pm-native.config'
import { AuthProviderError, type AuthProvider } from '@/services/auth/provider.types'
import { genericRestAuthProvider } from '@/services/auth/providers/genericRestAuthProvider'
import { supabaseAuthProvider } from '@/services/auth/providers/supabaseAuthProvider'

const notImplementedProvider = (provider: string): AuthProvider => ({
  async login() {
    throw new AuthProviderError(`${provider} auth provider is not implemented yet`, 'PROVIDER')
  },
  async register() {
    throw new AuthProviderError(`${provider} auth provider is not implemented yet`, 'PROVIDER')
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
