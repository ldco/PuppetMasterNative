import type { AuthUser } from '@/types/auth'
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

export interface AdminDirectoryQueryInput {
  activeUser: AuthUser | null
}

const toDirectoryUsers = (activeUser: AuthUser | null): AdminDirectoryUser[] => {
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
  async listUsers(input: AdminDirectoryQueryInput): Promise<AdminDirectoryUser[]> {
    await delay(450)
    return toDirectoryUsers(input.activeUser)
  },

  async refreshUsers(input: AdminDirectoryQueryInput): Promise<AdminDirectoryUser[]> {
    await delay(700)
    return toDirectoryUsers(input.activeUser)
  }
}
