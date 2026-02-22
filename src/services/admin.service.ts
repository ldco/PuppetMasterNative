import { adminProvider } from '@/services/admin.provider'
import { AdminProviderError } from '@/services/admin.provider.types'
import type { AuthUser } from '@/types/auth'
import type { Role } from '@/types/config'

export interface AdminDirectoryUser {
  id: string
  name: string
  email: string
  role: Role
}

export interface AdminDirectoryQueryInput {
  activeUser: AuthUser | null
  accessToken?: string | null
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

const toAdminDirectoryUsers = (
  users: Awaited<ReturnType<typeof adminProvider.listUsers>>
): AdminDirectoryUser[] => {
  return users.map((user) => ({
    ...user,
    name: user.name ?? 'Unknown user'
  }))
}

export const adminService = {
  async listUsers(input: AdminDirectoryQueryInput): Promise<AdminDirectoryUser[]> {
    if (!input.activeUser) {
      return []
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canListUsersRemote) {
      return toDirectoryUsers(input.activeUser)
    }

    try {
      const users = await adminProvider.listUsers({ accessToken: input.accessToken })
      return toAdminDirectoryUsers(users)
    } catch (error) {
      if (
        error instanceof AdminProviderError &&
        (error.code === 'CONFIG' || error.code === 'NOT_SUPPORTED' || error.code === 'UNAUTHORIZED')
      ) {
        return toDirectoryUsers(input.activeUser)
      }

      throw error
    }
  },

  async refreshUsers(input: AdminDirectoryQueryInput): Promise<AdminDirectoryUser[]> {
    if (!input.activeUser) {
      return []
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canListUsersRemote) {
      return toDirectoryUsers(input.activeUser)
    }

    try {
      const users = await adminProvider.listUsers({ accessToken: input.accessToken })
      return toAdminDirectoryUsers(users)
    } catch (error) {
      if (
        error instanceof AdminProviderError &&
        (error.code === 'CONFIG' || error.code === 'NOT_SUPPORTED' || error.code === 'UNAUTHORIZED')
      ) {
        return toDirectoryUsers(input.activeUser)
      }

      throw error
    }
  }
}
