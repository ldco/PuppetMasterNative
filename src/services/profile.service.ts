import type { AuthUser } from '@/types/auth'

const delay = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

export interface ProfileServiceInput {
  sessionUser: AuthUser | null
}

export const profileService = {
  async getProfile(input: ProfileServiceInput): Promise<AuthUser | null> {
    await delay(350)
    return input.sessionUser
  },

  async refreshProfile(input: ProfileServiceInput): Promise<AuthUser | null> {
    await delay(550)
    return input.sessionUser
  }
}
