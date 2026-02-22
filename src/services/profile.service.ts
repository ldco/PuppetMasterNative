import { useAuthStore } from '@/stores/auth.store'
import type { AuthUser } from '@/types/auth'

const delay = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

const toProfile = (): AuthUser | null => {
  return useAuthStore.getState().user
}

export const profileService = {
  async getProfile(): Promise<AuthUser | null> {
    await delay(350)
    return toProfile()
  },

  async refreshProfile(): Promise<AuthUser | null> {
    await delay(550)
    return toProfile()
  }
}
