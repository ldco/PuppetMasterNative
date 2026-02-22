import { useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/types/config'

export interface AdminDirectoryUser {
  id: string
  name: string
  email: string
  role: Role
}

const delay = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

const toDirectoryUsers = (): AdminDirectoryUser[] => {
  const activeUser = useAuthStore.getState().user

  if (!activeUser) {
    return []
  }

  return [
    {
      id: activeUser.id,
      name: activeUser.name ?? 'Unknown user',
      email: activeUser.email,
      role: activeUser.role
    }
  ]
}

export const adminService = {
  async listUsers(): Promise<AdminDirectoryUser[]> {
    await delay(450)
    return toDirectoryUsers()
  },

  async refreshUsers(): Promise<AdminDirectoryUser[]> {
    await delay(700)
    return toDirectoryUsers()
  }
}
