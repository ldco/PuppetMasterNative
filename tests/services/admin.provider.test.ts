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
    exportLogs?: string
    getLogExportJob?: string
    acknowledgeLog?: string
    resolveLog?: string
    retryLog?: string
    settings?: string
    updateUserRole?: string
    updateUserStatus?: string
    updateUserLock?: string
    listUserSessions?: string
    revokeUserSessions?: string
    revokeUserSession?: string
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
        exportLogs: '/admin/logs/export',
        getLogExportJob: '/admin/logs/export/:jobId',
        acknowledgeLog: '/admin/logs/:id/ack',
        resolveLog: '/admin/logs/:id/resolve',
        retryLog: '/admin/logs/:id/retry',
        settings: '/admin/settings',
        updateUserRole: '/admin/users/:id/role',
        updateUserStatus: '/admin/users/:id/status',
        updateUserLock: '/admin/users/:id/lock',
        listUserSessions: '/admin/users/:id/sessions',
        revokeUserSessions: '/admin/users/:id/sessions/revoke',
        revokeUserSession: '/admin/users/:id/sessions/:sessionId/revoke',
        health: '/admin/health'
      }
    })

    expect(adminProvider.getCapabilities()).toEqual({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: true,
      canExportLogsRemote: true,
      canGetLogExportJobRemote: true,
      canAcknowledgeLogRemote: true,
      canResolveLogRemote: true,
      canRetryLogRemote: true,
      canGetSettingsRemote: true,
      canUpdateUserRoleRemote: true,
      canUpdateUserStatusRemote: true,
      canUpdateUserLockRemote: true,
      canListUserSessionsRemote: true,
      canRevokeUserSessionsRemote: true,
      canRevokeUserSessionRemote: true,
      canGetHealthRemote: true,
      listUsersDetail: 'GET /admin/users',
      getUserDetail: 'GET /admin/users/:id',
      listRolesDetail: 'GET /admin/roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'POST /admin/logs/clear',
      exportLogsDetail: 'POST /admin/logs/export',
      getLogExportJobDetail: 'GET /admin/logs/export/:jobId',
      acknowledgeLogDetail: 'POST /admin/logs/:id/ack',
      resolveLogDetail: 'POST /admin/logs/:id/resolve',
      retryLogDetail: 'POST /admin/logs/:id/retry',
      getSettingsDetail: 'GET /admin/settings',
      updateUserRoleDetail: 'PATCH /admin/users/:id/role',
      updateUserStatusDetail: 'PATCH /admin/users/:id/status',
      updateUserLockDetail: 'PATCH /admin/users/:id/lock',
      listUserSessionsDetail: 'GET /admin/users/:id/sessions',
      revokeUserSessionsDetail: 'POST /admin/users/:id/sessions/revoke',
      revokeUserSessionDetail: 'POST /admin/users/:id/sessions/:sessionId/revoke',
      getHealthDetail: 'GET /admin/health'
    })
  })

  it('generic-rest getCapabilities marks export job endpoint unsupported when :jobId placeholder is missing', async () => {
    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        getLogExportJob: '/admin/logs/export/status'
      }
    })

    const capability = adminProvider.getCapabilities()

    expect(capability.canGetLogExportJobRemote).toBe(false)
    expect(capability.getLogExportJobDetail).toContain(':jobId placeholder')
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

  it('generic-rest exportLogs sends POST and normalizes url/job payload aliases', async () => {
    const apiRequestMock = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        data: {
          download_url: 'https://example.com/logs.csv',
          job_id: 'job-1',
          format: 'csv'
        }
      })
      .mockResolvedValueOnce({
        url: 'https://example.com/logs.json'
      })

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        exportLogs: '/admin/logs/export'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(
      adminProvider.exportLogs({ accessToken: 'token', format: 'csv', limit: 25 })
    ).resolves.toEqual({
      url: 'https://example.com/logs.csv',
      jobId: 'job-1',
      format: 'csv'
    })

    await expect(adminProvider.exportLogs({ accessToken: 'token' })).resolves.toEqual({
      url: 'https://example.com/logs.json',
      jobId: null,
      format: null
    })

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/admin/logs/export', {
      method: 'POST',
      token: 'token',
      body: {
        format: 'csv',
        limit: 25
      },
      schema: expect.any(Object),
      useAuthToken: false
    })
  })

  it('generic-rest exportLogs maps ApiError 403 to UNAUTHORIZED', async () => {
    const apiRequestMock = vi.fn().mockRejectedValue(new ApiError('forbidden', 403, 'FORBIDDEN'))

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        exportLogs: '/admin/logs/export'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(adminProvider.exportLogs({ accessToken: 'token' })).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'UNAUTHORIZED',
      message: 'forbidden'
    })
  })

  it('generic-rest exportLogs sends optional filter payload fields when provided', async () => {
    const apiRequestMock = vi.fn().mockResolvedValue({
      success: true,
      data: {
        jobId: 'job-2'
      }
    })

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        exportLogs: '/admin/logs/export'
      },
      apiRequestImpl: apiRequestMock
    })

    await adminProvider.exportLogs({
      accessToken: 'token',
      format: 'json',
      query: '  queue lag  ',
      levels: ['warning', 'error', 'warning'],
      from: ' 2026-02-24T00:00:00.000Z ',
      to: ' 2026-02-24T23:59:59.999Z '
    })

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/logs/export', {
      method: 'POST',
      token: 'token',
      body: {
        format: 'json',
        query: 'queue lag',
        levels: ['warning', 'error'],
        from: '2026-02-24T00:00:00.000Z',
        to: '2026-02-24T23:59:59.999Z'
      },
      schema: expect.any(Object),
      useAuthToken: false
    })
  })

  it('generic-rest getLogExportJob normalizes status/url aliases and maps terminal states', async () => {
    const apiRequestMock = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        data: {
          export: {
            job_id: 'job-1',
            status: 'processing',
            format: 'csv'
          }
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          jobId: 'job-1',
          status: 'completed',
          downloadUrl: 'https://example.com/logs.csv',
          message: 'Ready'
        }
      })

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        getLogExportJob: '/admin/logs/export/:jobId'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(
      adminProvider.getLogExportJob({ accessToken: 'token', jobId: 'job-1' })
    ).resolves.toEqual({
      jobId: 'job-1',
      status: 'running',
      url: null,
      format: 'csv',
      message: null
    })

    await expect(
      adminProvider.getLogExportJob({ accessToken: 'token', jobId: 'job-1' })
    ).resolves.toEqual({
      jobId: 'job-1',
      status: 'ready',
      url: 'https://example.com/logs.csv',
      format: null,
      message: 'Ready'
    })

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/admin/logs/export/job-1', {
      token: 'token',
      schema: expect.any(Object),
      useAuthToken: false
    })
  })

  it('generic-rest getLogExportJob maps ApiError 403 to UNAUTHORIZED', async () => {
    const apiRequestMock = vi.fn().mockRejectedValue(new ApiError('forbidden', 403, 'FORBIDDEN'))

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        getLogExportJob: '/admin/logs/export/:jobId'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(
      adminProvider.getLogExportJob({ accessToken: 'token', jobId: 'job-1' })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'UNAUTHORIZED',
      message: 'forbidden'
    })
  })

  it('generic-rest acknowledgeLog sends POST and normalizes single-log payload aliases', async () => {
    const apiRequestMock = vi.fn().mockResolvedValue({
      success: true,
      data: {
        log: {
          id: 'log-7',
          created_at: '2026-02-23T23:59:00.000Z',
          level: 'warn',
          message: 'Queue lag high',
          service: 'worker',
          acked: true,
          acked_at: '2026-02-24T00:00:00.000Z'
        }
      }
    })

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        acknowledgeLog: '/admin/logs/:id/ack'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(
      adminProvider.acknowledgeLog({ accessToken: 'token', logId: 'log-7' })
    ).resolves.toEqual({
      id: 'log-7',
      timestamp: '2026-02-23T23:59:00.000Z',
      level: 'warning',
      message: 'Queue lag high',
      source: 'worker',
      acknowledged: true,
      acknowledgedAt: '2026-02-24T00:00:00.000Z'
    })

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/logs/log-7/ack', {
      method: 'POST',
      token: 'token',
      schema: expect.any(Object),
      useAuthToken: false
    })
  })

  it('generic-rest acknowledgeLog maps ApiError 403 to UNAUTHORIZED', async () => {
    const apiRequestMock = vi.fn().mockRejectedValue(new ApiError('forbidden', 403, 'FORBIDDEN'))

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        acknowledgeLog: '/admin/logs/:id/ack'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(
      adminProvider.acknowledgeLog({ accessToken: 'token', logId: 'log-7' })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'UNAUTHORIZED',
      message: 'forbidden'
    })
  })

  it('generic-rest resolveLog sends POST and normalizes resolved aliases', async () => {
    const apiRequestMock = vi.fn().mockResolvedValue({
      log: {
        id: 'log-9',
        createdAt: '2026-02-24T01:00:00.000Z',
        level: 'audit',
        message: 'Issue resolved',
        category: 'ops',
        acknowledged: true,
        isResolved: true,
        resolved_at: '2026-02-24T01:05:00.000Z'
      }
    })

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        resolveLog: '/admin/logs/:id/resolve'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(adminProvider.resolveLog({ accessToken: 'token', logId: 'log-9' })).resolves.toEqual({
      id: 'log-9',
      timestamp: '2026-02-24T01:00:00.000Z',
      level: 'audit',
      message: 'Issue resolved',
      source: 'ops',
      acknowledged: true,
      resolved: true,
      resolvedAt: '2026-02-24T01:05:00.000Z'
    })

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/logs/log-9/resolve', {
      method: 'POST',
      token: 'token',
      schema: expect.any(Object),
      useAuthToken: false
    })
  })

  it('generic-rest retryLog sends POST and maps unauthorized errors', async () => {
    const apiRequestMock = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'log-11',
          created_at: '2026-02-24T02:00:00.000Z',
          level: 'error',
          message: 'Job requeued',
          source: 'worker',
          acked: true,
          resolved: false
        }
      })
      .mockRejectedValueOnce(new ApiError('expired', 401, 'AUTH_EXPIRED'))

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        retryLog: '/admin/logs/:id/retry'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(adminProvider.retryLog({ accessToken: 'token', logId: 'log-11' })).resolves.toEqual({
      id: 'log-11',
      timestamp: '2026-02-24T02:00:00.000Z',
      level: 'error',
      message: 'Job requeued',
      source: 'worker',
      acknowledged: true,
      resolved: false
    })

    await expect(adminProvider.retryLog({ accessToken: 'token', logId: 'log-11' })).rejects.toMatchObject({
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

  it('generic-rest listUserSessions normalizes payload aliases', async () => {
    const apiRequestMock = vi.fn().mockResolvedValue({
      success: true,
      data: {
        sessions: [
          {
            id: 'sess-1',
            created_at: '2026-02-24T00:00:00.000Z',
            last_seen_at: '2026-02-24T01:00:00.000Z',
            expires_at: '2026-02-24T05:00:00.000Z',
            ip: '10.0.0.1',
            user_agent: 'Expo Go',
            device_name: 'iPhone 15 Pro',
            platform: 'ios',
            isCurrent: true,
            isRevoked: false
          },
          {
            createdAt: '2026-02-24T00:10:00.000Z',
            expiresAt: '2026-02-24T04:00:00.000Z',
            ipAddress: '10.0.0.2',
            userAgent: 'Chrome',
            deviceLabel: 'Chrome Browser',
            platform: 'web'
          }
        ]
      }
    })

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        listUserSessions: '/admin/users/:id/sessions'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(
      adminProvider.listUserSessions({ accessToken: 'token', userId: 'u7' })
    ).resolves.toEqual([
      {
        id: 'sess-1',
        createdAt: '2026-02-24T00:00:00.000Z',
        lastSeenAt: '2026-02-24T01:00:00.000Z',
        expiresAt: '2026-02-24T05:00:00.000Z',
        ipAddress: '10.0.0.1',
        userAgent: 'Expo Go',
        deviceLabel: 'iPhone 15 Pro',
        platform: 'ios',
        current: true,
        revoked: false
      },
      {
        id: '2026-02-24T00:10:00.000Z:1:10.0.0.2',
        createdAt: '2026-02-24T00:10:00.000Z',
        lastSeenAt: null,
        expiresAt: '2026-02-24T04:00:00.000Z',
        ipAddress: '10.0.0.2',
        userAgent: 'Chrome',
        deviceLabel: 'Chrome Browser',
        platform: 'web'
      }
    ])

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u7/sessions', {
      token: 'token',
      schema: expect.any(Object),
      useAuthToken: false
    })
  })

  it('generic-rest revokeUserSessions sends POST and maps unauthorized errors', async () => {
    const apiRequestMock = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        data: {
          revokedCount: 3
        }
      })
      .mockRejectedValueOnce(new ApiError('forbidden', 403, 'FORBIDDEN'))

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        revokeUserSessions: '/admin/users/:id/sessions/revoke'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(
      adminProvider.revokeUserSessions({ accessToken: 'token', userId: 'u7' })
    ).resolves.toEqual({
      revokedCount: 3
    })

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u7/sessions/revoke', {
      method: 'POST',
      token: 'token',
      schema: expect.any(Object),
      useAuthToken: false
    })

    await expect(
      adminProvider.revokeUserSessions({ accessToken: 'token', userId: 'u7' })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'UNAUTHORIZED',
      message: 'forbidden'
    })
  })

  it('generic-rest revokeUserSession supports session payload and count payload responses', async () => {
    const apiRequestMock = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        data: {
          session: {
            id: 'sess-2',
            last_seen_at: '2026-02-24T02:00:00.000Z',
            expires_at: '2026-02-24T07:00:00.000Z',
            ip: '10.0.0.8',
            user_agent: 'Safari',
            device_name: 'MacBook Air',
            platform: 'web',
            isRevoked: true
          }
        }
      })
      .mockResolvedValueOnce({
        count: 1
      })

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        revokeUserSession: '/admin/users/:id/sessions/:sessionId/revoke'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(
      adminProvider.revokeUserSession({
        accessToken: 'token',
        userId: 'u7',
        sessionId: 'sess-2'
      })
    ).resolves.toEqual({
      session: {
        id: 'sess-2',
        createdAt: null,
        lastSeenAt: '2026-02-24T02:00:00.000Z',
        expiresAt: '2026-02-24T07:00:00.000Z',
        ipAddress: '10.0.0.8',
        userAgent: 'Safari',
        deviceLabel: 'MacBook Air',
        platform: 'web',
        revoked: true
      },
      revokedCount: null
    })

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u7/sessions/sess-2/revoke', {
      method: 'POST',
      token: 'token',
      schema: expect.any(Object),
      useAuthToken: false
    })

    await expect(
      adminProvider.revokeUserSession({
        accessToken: 'token',
        userId: 'u7',
        sessionId: 'sess-3'
      })
    ).resolves.toEqual({
      session: null,
      revokedCount: 1
    })
  })

  it('generic-rest revokeUserSessions sends trimmed reason and context payload when provided', async () => {
    const apiRequestMock = vi.fn().mockResolvedValue({
      success: true,
      data: {
        revokedCount: 2
      }
    })

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        revokeUserSessions: '/admin/users/:id/sessions/revoke'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(
      adminProvider.revokeUserSessions({
        accessToken: 'token',
        userId: 'u7',
        reason: '  suspicious_activity  ',
        auditContext: {
          source: ' admin-user-detail ',
          action: ' force-logout-all '
        }
      })
    ).resolves.toEqual({
      revokedCount: 2
    })

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u7/sessions/revoke', {
      method: 'POST',
      token: 'token',
      body: {
        reason: 'suspicious_activity',
        context: {
          source: 'admin-user-detail',
          action: 'force-logout-all'
        }
      },
      schema: expect.any(Object),
      useAuthToken: false
    })
  })

  it('generic-rest revokeUserSession sends trimmed reason and context payload when provided', async () => {
    const apiRequestMock = vi.fn().mockResolvedValue({
      count: 1
    })

    const { adminProvider } = await loadAdminProviderModule({
      provider: 'generic-rest',
      adminEndpoints: {
        listUsers: '/admin/users',
        revokeUserSession: '/admin/users/:id/sessions/:sessionId/revoke'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(
      adminProvider.revokeUserSession({
        accessToken: 'token',
        userId: 'u7',
        sessionId: 'sess-3',
        reason: '  manual_security_reset ',
        auditContext: {
          source: ' admin-user-detail ',
          action: ' force-logout-one '
        }
      })
    ).resolves.toEqual({
      session: null,
      revokedCount: 1
    })

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u7/sessions/sess-3/revoke', {
      method: 'POST',
      token: 'token',
      body: {
        reason: 'manual_security_reset',
        context: {
          source: 'admin-user-detail',
          action: 'force-logout-one'
        }
      },
      schema: expect.any(Object),
      useAuthToken: false
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
