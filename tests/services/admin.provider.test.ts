import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/services/api'

interface LoadAdminProviderOptions {
  provider: 'generic-rest' | 'supabase'
  adminEndpoints?: {
    listUsers: string
    getUser?: string
    listRoles?: string
    listLogs?: string
    clearLogs?: string
    settings?: string
    updateUserRole?: string
    updateUserStatus?: string
    updateUserLock?: string
    health?: string
  }
  apiRequestImpl?: ReturnType<typeof vi.fn>
}

const loadAdminProviderModule = async (options: LoadAdminProviderOptions) => {
  vi.resetModules()

  const apiRequestMock = options.apiRequestImpl ?? vi.fn()

  vi.doMock('@/pm-native.config', () => ({
    pmNativeConfig: {
      backend: {
        provider: options.provider,
        genericRest:
          options.provider === 'generic-rest' && options.adminEndpoints
            ? {
                admin: {
                  endpoints: options.adminEndpoints
                }
              }
            : undefined
      }
    }
  }))

  vi.doMock('@/services/api', () => ({
    apiRequest: apiRequestMock
  }))

  const module = await import('@/services/admin.provider')

  return {
    adminProvider: module.adminProvider,
    apiRequestMock
  }
}

describe('adminProvider', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.unmock('@/pm-native.config')
    vi.unmock('@/services/api')
  })

  it('generic-rest getCapabilities includes roles endpoint capability/detail', async () => {
    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        getUser: '/admin/users/:id',
        listRoles: '/admin/roles',
        listLogs: '/admin/logs',
        clearLogs: '/admin/logs/clear',
        settings: '/admin/settings',
        updateUserRole: '/admin/users/:id/role',
        updateUserStatus: '/admin/users/:id/status',
        updateUserLock: '/admin/users/:id/lock',
        health: '/admin/health'
      }
    })

    expect(adminProvider.getCapabilities()).toEqual({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: true,
      canGetSettingsRemote: true,
      canUpdateUserRoleRemote: true,
      canUpdateUserStatusRemote: true,
      canUpdateUserLockRemote: true,
      canGetHealthRemote: true,
      listUsersDetail: 'GET /admin/users',
      getUserDetail: 'GET /admin/users/:id',
      listRolesDetail: 'GET /admin/roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'POST /admin/logs/clear',
      getSettingsDetail: 'GET /admin/settings',
      updateUserRoleDetail: 'PATCH /admin/users/:id/role',
      updateUserStatusDetail: 'PATCH /admin/users/:id/status',
      updateUserLockDetail: 'PATCH /admin/users/:id/lock',
      getHealthDetail: 'GET /admin/health'
    })
  })

  it('generic-rest listRoles normalizes payload variants and default assignable=true', async () => {
    const apiRequestMock = vi
      .fn()
      .mockResolvedValueOnce([
        { key: 'admin', label: 'Admin', description: 'Can manage app', assignable: false },
        { key: 'editor', label: 'Editor' }
      ])
      .mockResolvedValueOnce({
        success: true,
        data: {
          roles: [{ key: 'user', label: 'User', description: null }]
        }
      })

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        listRoles: '/admin/roles'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(adminProvider.listRoles({ accessToken: 'token' })).resolves.toEqual([
      { key: 'admin', label: 'Admin', description: 'Can manage app', assignable: false },
      { key: 'editor', label: 'Editor', description: null, assignable: true }
    ])

    await expect(adminProvider.listRoles({ accessToken: 'token' })).resolves.toEqual([
      { key: 'user', label: 'User', description: null, assignable: true }
    ])

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/roles', {
      token: 'token',
      schema: expect.any(Object),
      useAuthToken: false
    })
  })

  it('generic-rest listRoles returns CONFIG when roles endpoint is missing', async () => {
    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users'
      }
    })

    await expect(adminProvider.listRoles({ accessToken: 'token' })).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'CONFIG'
    })
  })

  it('generic-rest updateUserRole sends PATCH and normalizes returned user payload', async () => {
    const apiRequestMock = vi.fn().mockResolvedValue({
      success: true,
      data: {
        user: {
          id: 'u2',
          email: 'editor@example.com',
          name: 'Editor User',
          role: 'admin'
        }
      }
    })

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        updateUserRole: '/admin/users/:id/role'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(
      adminProvider.updateUserRole({
        accessToken: 'token',
        userId: 'u2',
        role: 'admin'
      })
    ).resolves.toEqual({
      id: 'u2',
      email: 'editor@example.com',
      name: 'Editor User',
      role: 'admin'
    })

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u2/role', {
      method: 'PATCH',
      token: 'token',
      body: {
        role: 'admin'
      },
      schema: expect.any(Object),
      useAuthToken: false
    })
  })

  it('generic-rest updateUserRole returns CONFIG when endpoint template is missing :id', async () => {
    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        updateUserRole: '/admin/users/role'
      }
    })

    await expect(
      adminProvider.updateUserRole({
        accessToken: 'token',
        userId: 'u2',
        role: 'admin'
      })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'CONFIG'
    })
  })

  it('generic-rest listRoles maps ApiError 401 to UNAUTHORIZED', async () => {
    const apiRequestMock = vi
      .fn()
      .mockRejectedValue(new ApiError('token expired', 401, 'AUTH_EXPIRED'))

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        listRoles: '/admin/roles'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(adminProvider.listRoles({ accessToken: 'token' })).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'UNAUTHORIZED',
      message: 'token expired'
    })
  })

  it('generic-rest listLogs normalizes payload variants, aliases, levels, and limit query', async () => {
    const apiRequestMock = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        data: {
          logs: [
            {
              id: 7,
              created_at: '2026-02-23T23:59:00.000Z',
              level: 'warn',
              message: 'Queue lag high',
              service: 'worker'
            },
            {
              timestamp: '2026-02-23T23:58:00.000Z',
              level: 'fatal',
              message: 'API crashed',
              category: 'api'
            }
          ]
        }
      })
      .mockResolvedValueOnce([
        {
          message: 'audit event',
          level: 'audit',
          source: 'rbac'
        }
      ])

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        listLogs: '/admin/logs'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(adminProvider.listLogs({ accessToken: 'token', limit: 25 })).resolves.toEqual([
      {
        id: '7',
        timestamp: '2026-02-23T23:59:00.000Z',
        level: 'warning',
        message: 'Queue lag high',
        source: 'worker'
      },
      {
        id: '2026-02-23T23:58:00.000Z:1:API crashed',
        timestamp: '2026-02-23T23:58:00.000Z',
        level: 'error',
        message: 'API crashed',
        source: 'api'
      }
    ])

    await expect(adminProvider.listLogs({ accessToken: 'token' })).resolves.toEqual([
      {
        id: 'no-ts:0:audit event',
        timestamp: null,
        level: 'audit',
        message: 'audit event',
        source: 'rbac'
      }
    ])

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/admin/logs?limit=25', {
      token: 'token',
      schema: expect.any(Object),
      useAuthToken: false
    })
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/admin/logs', {
      token: 'token',
      schema: expect.any(Object),
      useAuthToken: false
    })
  })

  it('generic-rest listLogs maps ApiError 403 to UNAUTHORIZED', async () => {
    const apiRequestMock = vi.fn().mockRejectedValue(new ApiError('forbidden', 403, 'FORBIDDEN'))

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        listLogs: '/admin/logs'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(adminProvider.listLogs({ accessToken: 'token' })).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'UNAUTHORIZED',
      message: 'forbidden'
    })
  })

  it('generic-rest clearLogs sends POST and normalizes cleared count payloads', async () => {
    const apiRequestMock = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        data: {
          count: 12
        }
      })
      .mockResolvedValueOnce({
        success: true
      })

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        clearLogs: '/admin/logs/clear'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(adminProvider.clearLogs({ accessToken: 'token' })).resolves.toEqual({
      clearedCount: 12
    })
    await expect(adminProvider.clearLogs({ accessToken: 'token' })).resolves.toEqual({
      clearedCount: null
    })

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/admin/logs/clear', {
      method: 'POST',
      token: 'token',
      schema: expect.any(Object),
      useAuthToken: false
    })
  })

  it('generic-rest clearLogs maps ApiError 401 to UNAUTHORIZED', async () => {
    const apiRequestMock = vi.fn().mockRejectedValue(new ApiError('expired', 401, 'AUTH_EXPIRED'))

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        clearLogs: '/admin/logs/clear'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(adminProvider.clearLogs({ accessToken: 'token' })).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'UNAUTHORIZED',
      message: 'expired'
    })
  })

  it('generic-rest getSettings normalizes nested payload and aliases', async () => {
    const apiRequestMock = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        data: {
          updated_at: '2026-02-23T23:59:59.000Z',
          settings: [
            {
              key: 'maintenanceMode',
              label: 'Maintenance Mode',
              value: false,
              section: 'operations'
            },
            {
              key: 'supportEmail',
              value: 'ops@example.com'
            }
          ]
        }
      })
      .mockResolvedValueOnce([
        {
          key: 'maxUsers',
          value: 1000,
          group: 'limits'
        }
      ])

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        settings: '/admin/settings'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(adminProvider.getSettings({ accessToken: 'token' })).resolves.toEqual({
      updatedAt: '2026-02-23T23:59:59.000Z',
      items: [
        {
          key: 'maintenanceMode',
          label: 'Maintenance Mode',
          value: false,
          group: 'operations'
        },
        {
          key: 'supportEmail',
          label: 'supportEmail',
          value: 'ops@example.com',
          group: null
        }
      ]
    })

    await expect(adminProvider.getSettings({ accessToken: 'token' })).resolves.toEqual({
      updatedAt: null,
      items: [
        {
          key: 'maxUsers',
          label: 'maxUsers',
          value: 1000,
          group: 'limits'
        }
      ]
    })

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/admin/settings', {
      token: 'token',
      schema: expect.any(Object),
      useAuthToken: false
    })
  })

  it('generic-rest getSettings maps ApiError 401 to UNAUTHORIZED', async () => {
    const apiRequestMock = vi.fn().mockRejectedValue(new ApiError('expired', 401, 'AUTH_EXPIRED'))

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        settings: '/admin/settings'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(adminProvider.getSettings({ accessToken: 'token' })).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'UNAUTHORIZED',
      message: 'expired'
    })
  })

  it('generic-rest updateUserStatus sends PATCH disabled payload', async () => {
    const apiRequestMock = vi.fn().mockResolvedValue({
      user: {
        id: 'u3',
        email: 'user3@example.com',
        name: 'User 3',
        role: 'user'
      }
    })

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        updateUserStatus: '/admin/users/:id/status'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(
      adminProvider.updateUserStatus({
        accessToken: 'token',
        userId: 'u3',
        disabled: true
      })
    ).resolves.toEqual({
      id: 'u3',
      email: 'user3@example.com',
      name: 'User 3',
      role: 'user'
    })

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u3/status', {
      method: 'PATCH',
      token: 'token',
      body: {
        disabled: true
      },
      schema: expect.any(Object),
      useAuthToken: false
    })
  })

  it('generic-rest updateUserStatus maps ApiError 403 to UNAUTHORIZED', async () => {
    const apiRequestMock = vi
      .fn()
      .mockRejectedValue(new ApiError('forbidden', 403, 'FORBIDDEN'))

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        updateUserStatus: '/admin/users/:id/status'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(
      adminProvider.updateUserStatus({
        accessToken: 'token',
        userId: 'u3',
        disabled: true
      })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'UNAUTHORIZED',
      message: 'forbidden'
    })
  })

  it('generic-rest updateUserLock sends PATCH locked payload and normalizes aliases', async () => {
    const apiRequestMock = vi.fn().mockResolvedValue({
      user: {
        id: 'u4',
        email: 'user4@example.com',
        name: 'User 4',
        role: 'user',
        isLocked: true,
        locked_until: '2026-02-24T12:00:00.000Z'
      }
    })

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        updateUserLock: '/admin/users/:id/lock'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(
      adminProvider.updateUserLock({
        accessToken: 'token',
        userId: 'u4',
        locked: true
      })
    ).resolves.toEqual({
      id: 'u4',
      email: 'user4@example.com',
      name: 'User 4',
      role: 'user',
      locked: true,
      lockedUntil: '2026-02-24T12:00:00.000Z'
    })

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u4/lock', {
      method: 'PATCH',
      token: 'token',
      body: {
        locked: true
      },
      schema: expect.any(Object),
      useAuthToken: false
    })
  })

  it('generic-rest updateUserLock maps ApiError 401 to UNAUTHORIZED', async () => {
    const apiRequestMock = vi.fn().mockRejectedValue(new ApiError('expired', 401, 'AUTH_EXPIRED'))

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        updateUserLock: '/admin/users/:id/lock'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(
      adminProvider.updateUserLock({
        accessToken: 'token',
        userId: 'u4',
        locked: true
      })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'UNAUTHORIZED',
      message: 'expired'
    })
  })

  it('generic-rest getHealth normalizes nested payload and degraded/down statuses', async () => {
    const apiRequestMock = vi.fn().mockResolvedValue({
      success: true,
      data: {
        health: {
          status: 'degraded',
          checked_at: '2026-02-23T23:30:00.000Z',
          message: 'degraded db latency',
          checks: [
            {
              key: 'db',
              status: 'degraded',
              message: 'high latency'
            },
            {
              key: 'queue',
              label: 'Queue',
              status: 'down',
              message: 'worker unavailable'
            }
          ]
        }
      }
    })

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        health: '/admin/health'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(adminProvider.getHealth({ accessToken: 'token' })).resolves.toEqual({
      status: 'warning',
      checkedAt: '2026-02-23T23:30:00.000Z',
      message: 'degraded db latency',
      checks: [
        {
          key: 'db',
          label: 'db',
          status: 'warning',
          message: 'high latency'
        },
        {
          key: 'queue',
          label: 'Queue',
          status: 'error',
          message: 'worker unavailable'
        }
      ]
    })
  })

  it('generic-rest getHealth maps ApiError 401 to UNAUTHORIZED', async () => {
    const apiRequestMock = vi.fn().mockRejectedValue(new ApiError('expired', 401, 'AUTH_EXPIRED'))

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        health: '/admin/health'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(adminProvider.getHealth({ accessToken: 'token' })).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'UNAUTHORIZED',
      message: 'expired'
    })
  })
})
