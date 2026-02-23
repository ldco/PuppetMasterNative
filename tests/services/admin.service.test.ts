import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminProviderError } from '@/services/admin.provider.types'

const mockAdminProvider = {
  getCapabilities: vi.fn(),
  listUsers: vi.fn(),
  getUser: vi.fn(),
  listRoles: vi.fn(),
  listLogs: vi.fn(),
  clearLogs: vi.fn(),
  getSettings: vi.fn(),
  updateUserRole: vi.fn(),
  updateUserStatus: vi.fn(),
  updateUserLock: vi.fn(),
  getHealth: vi.fn()
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
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles unsupported',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'health unsupported'
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
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'GET /admin/roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'health unsupported'
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
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'GET /admin/roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'health unsupported'
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

  it('returns local fallback logs when logs endpoint is unsupported', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs endpoint unavailable',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'health unsupported'
    })

    const result = await adminService.getLogs({
      activeUser: {
        id: 'u1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token',
      limit: 20
    })

    expect(mockAdminProvider.listLogs).not.toHaveBeenCalled()
    expect(result).toEqual({
      logs: [],
      source: 'local-fallback',
      sourceDetail: 'logs endpoint unavailable'
    })
  })

  it('returns remote logs and preserves provider source detail', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'health unsupported'
    })
    mockAdminProvider.listLogs.mockResolvedValueOnce([
      {
        id: 'log-1',
        timestamp: '2026-02-24T00:10:00.000Z',
        level: 'warning',
        message: 'Queue lag high',
        source: 'worker'
      }
    ])

    const result = await adminService.getLogs({
      activeUser: {
        id: 'u1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token',
      limit: 10
    })

    expect(mockAdminProvider.listLogs).toHaveBeenCalledWith({
      accessToken: 'token',
      limit: 10
    })
    expect(result).toEqual({
      logs: [
        {
          id: 'log-1',
          timestamp: '2026-02-24T00:10:00.000Z',
          level: 'warning',
          message: 'Queue lag high',
          source: 'worker'
        }
      ],
      source: 'remote',
      sourceDetail: 'GET /admin/logs'
    })
  })

  it('clears logs through provider when mutation capability is available', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: true,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'POST /admin/logs/clear',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'health unsupported'
    })
    mockAdminProvider.clearLogs.mockResolvedValueOnce({ clearedCount: 8 })

    const result = await adminService.clearLogs({
      activeUser: {
        id: 'u1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token'
    })

    expect(mockAdminProvider.clearLogs).toHaveBeenCalledWith({ accessToken: 'token' })
    expect(result).toEqual({
      clearedCount: 8,
      source: 'remote',
      sourceDetail: 'POST /admin/logs/clear'
    })
  })

  it('throws NOT_SUPPORTED for clearLogs when mutation capability is unavailable', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'health unsupported'
    })

    await expect(
      adminService.clearLogs({
        activeUser: {
          id: 'u1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin'
        },
        accessToken: 'token'
      })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'NOT_SUPPORTED',
      message: 'clear logs unsupported'
    })
  })

  it('returns config fallback admin settings when settings endpoint is unsupported', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'settings endpoint unavailable',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'health unsupported'
    })

    const result = await adminService.getSettings({
      activeUser: {
        id: 'u1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token'
    })

    expect(mockAdminProvider.getSettings).not.toHaveBeenCalled()
    expect(result.source).toBe('config-fallback')
    expect(result.sourceDetail).toBe('settings endpoint unavailable')
    expect(result.settings.items.some((item) => item.key === 'features.auth')).toBe(true)
    expect(result.settings.items.some((item) => item.key === 'backend.provider')).toBe(true)
  })

  it('returns remote admin settings when provider capability is available', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canGetSettingsRemote: true,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'GET /admin/settings',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'health unsupported'
    })
    mockAdminProvider.getSettings.mockResolvedValueOnce({
      updatedAt: '2026-02-23T23:59:59.000Z',
      items: [
        {
          key: 'maintenanceMode',
          label: 'Maintenance Mode',
          value: false,
          group: 'operations'
        }
      ]
    })

    const result = await adminService.getSettings({
      activeUser: {
        id: 'u1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token'
    })

    expect(mockAdminProvider.getSettings).toHaveBeenCalledWith({ accessToken: 'token' })
    expect(result).toEqual({
      settings: {
        updatedAt: '2026-02-23T23:59:59.000Z',
        items: [
          {
            key: 'maintenanceMode',
            label: 'Maintenance Mode',
            value: false,
            group: 'operations'
          }
        ]
      },
      source: 'remote',
      sourceDetail: 'GET /admin/settings'
    })
  })

  it('updates user role through provider when mutation capability is available', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: true,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'PATCH /admin/users/:id/role',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'health unsupported'
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
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'health unsupported'
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

  it('updates user status through provider when mutation capability is available', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: true,
      canUpdateUserStatusRemote: true,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'PATCH /admin/users/:id/role',
      updateUserStatusDetail: 'PATCH /admin/users/:id/status',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'health unsupported'
    })
    mockAdminProvider.updateUserStatus.mockResolvedValueOnce({
      id: 'u2',
      email: 'user@example.com',
      name: 'User',
      role: 'editor'
    })

    const result = await adminService.updateUserStatus({
      activeUser: {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token',
      userId: 'u2',
      disabled: true
    })

    expect(mockAdminProvider.updateUserStatus).toHaveBeenCalledWith({
      accessToken: 'token',
      userId: 'u2',
      disabled: true
    })
    expect(result).toEqual({
      user: {
        id: 'u2',
        email: 'user@example.com',
        name: 'User',
        role: 'editor'
      },
      source: 'remote',
      sourceDetail: 'PATCH /admin/users/:id/status'
    })
  })

  it('throws NOT_SUPPORTED for status update when mutation capability is unavailable', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: true,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'PATCH /admin/users/:id/role',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'health unsupported'
    })

    await expect(
      adminService.updateUserStatus({
        activeUser: {
          id: 'admin-1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin'
        },
        accessToken: 'token',
        userId: 'u2',
        disabled: true
      })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'NOT_SUPPORTED',
      message: 'status update unsupported'
    })
  })

  it('updates user lock state through provider when mutation capability is available', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: true,
      canUpdateUserStatusRemote: true,
      canUpdateUserLockRemote: true,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'PATCH /admin/users/:id/role',
      updateUserStatusDetail: 'PATCH /admin/users/:id/status',
      updateUserLockDetail: 'PATCH /admin/users/:id/lock',
      getHealthDetail: 'health unsupported'
    })
    mockAdminProvider.updateUserLock.mockResolvedValueOnce({
      id: 'u2',
      email: 'user@example.com',
      name: 'User',
      role: 'editor',
      locked: true,
      lockedUntil: '2026-02-24T12:00:00.000Z'
    })

    const result = await adminService.updateUserLock({
      activeUser: {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token',
      userId: 'u2',
      locked: true
    })

    expect(mockAdminProvider.updateUserLock).toHaveBeenCalledWith({
      accessToken: 'token',
      userId: 'u2',
      locked: true
    })
    expect(result).toEqual({
      user: {
        id: 'u2',
        email: 'user@example.com',
        name: 'User',
        role: 'editor',
        locked: true,
        lockedUntil: '2026-02-24T12:00:00.000Z'
      },
      source: 'remote',
      sourceDetail: 'PATCH /admin/users/:id/lock'
    })
  })

  it('throws NOT_SUPPORTED for lock update when mutation capability is unavailable', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: true,
      canUpdateUserStatusRemote: true,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'PATCH /admin/users/:id/role',
      updateUserStatusDetail: 'PATCH /admin/users/:id/status',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'health unsupported'
    })

    await expect(
      adminService.updateUserLock({
        activeUser: {
          id: 'admin-1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin'
        },
        accessToken: 'token',
        userId: 'u2',
        locked: true
      })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'NOT_SUPPORTED',
      message: 'lock update unsupported'
    })
  })

  it('returns local fallback health when health capability is unavailable', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'health endpoint unavailable'
    })

    const result = await adminService.getHealth({
      activeUser: {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token'
    })

    expect(mockAdminProvider.getHealth).not.toHaveBeenCalled()
    expect(result).toEqual({
      health: {
        status: 'unknown',
        checkedAt: null,
        message: 'health endpoint unavailable',
        checks: []
      },
      source: 'local-fallback',
      sourceDetail: 'health endpoint unavailable'
    })
  })

  it('returns remote health when provider capability is available', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: true,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'GET /admin/health'
    })
    mockAdminProvider.getHealth.mockResolvedValueOnce({
      status: 'ok',
      checkedAt: '2026-02-24T00:00:00.000Z',
      message: 'healthy',
      checks: [{ key: 'db', label: 'DB', status: 'ok', message: null }]
    })

    const result = await adminService.getHealth({
      activeUser: {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token'
    })

    expect(mockAdminProvider.getHealth).toHaveBeenCalledWith({ accessToken: 'token' })
    expect(result).toEqual({
      health: {
        status: 'ok',
        checkedAt: '2026-02-24T00:00:00.000Z',
        message: 'healthy',
        checks: [{ key: 'db', label: 'DB', status: 'ok', message: null }]
      },
      source: 'remote',
      sourceDetail: 'GET /admin/health'
    })
  })

  it('falls back to local health on UNAUTHORIZED provider error', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canGetHealthRemote: true,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      getHealthDetail: 'GET /admin/health'
    })
    mockAdminProvider.getHealth.mockRejectedValueOnce(
      new AdminProviderError('expired token', 'UNAUTHORIZED')
    )

    const result = await adminService.getHealth({
      activeUser: {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token'
    })

    expect(result).toEqual({
      health: {
        status: 'unknown',
        checkedAt: null,
        message: 'expired token',
        checks: []
      },
      source: 'local-fallback',
      sourceDetail: 'expired token'
    })
  })
})
