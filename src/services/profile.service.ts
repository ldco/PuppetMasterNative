import { profileProvider } from '@/services/profile.provider'
import type { AuthUser } from '@/types/auth'
import { ProfileProviderError } from '@/services/profile.provider.types'

export interface ProfileServiceInput {
  sessionUser: AuthUser | null
  accessToken?: string | null
}

export const profileService = {
  async getProfile(input: ProfileServiceInput): Promise<AuthUser | null> {
    if (!input.sessionUser) {
      return null
    }

    const capability = profileProvider.getCapabilities()
    if (!capability.canFetchRemote) {
      return input.sessionUser
    }

    try {
      return await profileProvider.getProfile({ accessToken: input.accessToken })
    } catch (error) {
      if (
        error instanceof ProfileProviderError &&
        (error.code === 'CONFIG' || error.code === 'NOT_SUPPORTED' || error.code === 'UNAUTHORIZED')
      ) {
        return input.sessionUser
      }

      throw error
    }
  },

  async refreshProfile(input: ProfileServiceInput): Promise<AuthUser | null> {
    if (!input.sessionUser) {
      return null
    }

    const capability = profileProvider.getCapabilities()
    if (!capability.canFetchRemote) {
      return input.sessionUser
    }

    try {
      return await profileProvider.getProfile({ accessToken: input.accessToken })
    } catch (error) {
      if (
        error instanceof ProfileProviderError &&
        (error.code === 'CONFIG' || error.code === 'NOT_SUPPORTED' || error.code === 'UNAUTHORIZED')
      ) {
        return input.sessionUser
      }

      throw error
    }
  }
}
