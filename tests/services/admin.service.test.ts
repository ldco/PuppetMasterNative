import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminProviderError } from '@/services/admin.provider.types'

const mockAdminProvider = {
  getCapabilities: vi.fn(),
  listUsers: vi.fn(),
  getUser: vi.fn(),
  listRoles: vi.fn(),
  updateUserRole: vi.fn()
}

vi.mock('@/services/admin.provider', () => ({
  adminProvider: mockAdminProvider
}))

describe('adminService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('falls back to config roles when roles endpoint is unsupported', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: false,
      canUpdateUserRoleRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles unsupported',
      updateUserRoleDetail: 'role update unsupported'
    })

    const result = await adminService.listRoles({
      activeUser: {
        id: 'u1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token'
    })

    expect(result.source).toBe('config-fallback')
    expect(result.sourceDetail).toBe('roles unsupported')
    expect(result.roles).toEqual([
      { key: 'master', label: 'Master', description: null, assignable: false },
      { key: 'admin', label: 'Admin', description: null, assignable: true },
      { key: 'editor', label: 'Editor', description: null, assignable: true },
      { key: 'user', label: 'User', description: null, assignable: true }
    ])
    expect(mockAdminProvider.listRoles).not.toHaveBeenCalled()
  })

  it('maps remote roles response and preserves provider source detail', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canUpdateUserRoleRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'GET /admin/roles',
      updateUserRoleDetail: 'role update unsupported'
    })
    mockAdminProvider.listRoles.mockResolvedValueOnce([
      { key: 'admin', label: 'Admin', description: 'Manages the app', assignable: false }
    ])

    const result = await adminService.listRoles({
      activeUser: {
        id: 'u1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token'
    })

    expect(mockAdminProvider.listRoles).toHaveBeenCalledWith({ accessToken: 'token' })
    expect(result).toEqual({
      roles: [{ key: 'admin', label: 'Admin', description: 'Manages the app', assignable: false }],
      source: 'remote',
      sourceDetail: 'GET /admin/roles'
    })
  })

  it('falls back to config roles on UNAUTHORIZED/CONFIG/NOT_SUPPORTED provider errors', async () => {
    const { adminService } = await import('@/services/admin.service')
    const activeUser = {
      id: 'u1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'admin' as const
    }

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canUpdateUserRoleRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'GET /admin/roles',
      updateUserRoleDetail: 'role update unsupported'
    })

    for (const code of ['UNAUTHORIZED', 'CONFIG', 'NOT_SUPPORTED'] as const) {
      mockAdminProvider.listRoles.mockRejectedValueOnce(new AdminProviderError(`err-${code}`, code))

      const result = await adminService.listRoles({
        activeUser,
        accessToken: 'token'
      })

      expect(result.source).toBe('config-fallback')
      expect(result.sourceDetail).toBe(`err-${code}`)
      expect(result.roles).toHaveLength(4)
    }
  })

  it('updates user role through provider when mutation capability is available', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canUpdateUserRoleRemote: true,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      updateUserRoleDetail: 'PATCH /admin/users/:id/role'
    })
    mockAdminProvider.updateUserRole.mockResolvedValueOnce({
      id: 'u2',
      email: 'user@example.com',
      name: null,
      role: 'editor'
    })

    const result = await adminService.updateUserRole({
      activeUser: {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token',
      userId: 'u2',
      role: 'editor'
    })

    expect(mockAdminProvider.updateUserRole).toHaveBeenCalledWith({
      accessToken: 'token',
      userId: 'u2',
      role: 'editor'
    })
    expect(result).toEqual({
      user: {
        id: 'u2',
        email: 'user@example.com',
        name: 'Unknown user',
        role: 'editor'
      },
      source: 'remote',
      sourceDetail: 'PATCH /admin/users/:id/role'
    })
  })

  it('throws NOT_SUPPORTED for role update when mutation capability is unavailable', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canUpdateUserRoleRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      updateUserRoleDetail: 'role update unsupported'
    })

    await expect(
      adminService.updateUserRole({
        activeUser: {
          id: 'admin-1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin'
        },
        accessToken: 'token',
        userId: 'u2',
        role: 'editor'
      })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'NOT_SUPPORTED',
      message: 'role update unsupported'
    })
  })
})
