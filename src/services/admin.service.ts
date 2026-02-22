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

export interface AdminDirectoryResult {
  users: AdminDirectoryUser[]
  source: 'remote' | 'session-fallback'
  sourceDetail: string
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
  getCapabilities() {
    return adminProvider.getCapabilities()
  },

  async listUsers(input: AdminDirectoryQueryInput): Promise<AdminDirectoryResult> {
    if (!input.activeUser) {
      return {
        users: [],
        source: 'session-fallback',
        sourceDetail: 'No active user'
      }
    }

    const capability = adminProvider.getCapabilities()
    if (!capability.canListUsersRemote) {
      return {
        users: toDirectoryUsers(input.activeUser),
        source: 'session-fallback',
        sourceDetail: capability.detail
      }
    }

    try {
      const users = await adminProvider.listUsers({ accessToken: input.accessToken })
      return {
        users: toAdminDirectoryUsers(users),
        source: 'remote',
        sourceDetail: capability.detail
      }
    } catch (error) {
      if (
        error instanceof AdminProviderError &&
        (error.code === 'CONFIG' || error.code === 'NOT_SUPPORTED' || error.code === 'UNAUTHORIZED')
      ) {
        return {
          users: toDirectoryUsers(input.activeUser),
          source: 'session-fallback',
          sourceDetail: error.message
        }
      }

      throw error
    }
  },

  async refreshUsers(input: AdminDirectoryQueryInput): Promise<AdminDirectoryResult> {
    return adminService.listUsers(input)
  }
}
