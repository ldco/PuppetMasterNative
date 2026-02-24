import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminProviderError } from '@/services/admin.provider.types'

const mockAdminProvider = {
  getCapabilities: vi.fn(),
  listUsers: vi.fn(),
  getUser: vi.fn(),
  listRoles: vi.fn(),
  listLogs: vi.fn(),
  clearLogs: vi.fn(),
  exportLogs: vi.fn(),
  getLogExportJob: vi.fn(),
  acknowledgeLog: vi.fn(),
  resolveLog: vi.fn(),
  retryLog: vi.fn(),
  getSettings: vi.fn(),
  updateUserRole: vi.fn(),
  updateUserStatus: vi.fn(),
  updateUserLock: vi.fn(),
  listUserSessions: vi.fn(),
  revokeUserSessions: vi.fn(),
  revokeUserSession: vi.fn(),
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles unsupported',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'GET /admin/roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'GET /admin/roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs endpoint unavailable',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'POST /admin/logs/clear',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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

  it('exports logs through provider when export capability is available', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: true,
      canExportLogsRemote: true,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'POST /admin/logs/clear',
      exportLogsDetail: 'POST /admin/logs/export',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })
    mockAdminProvider.exportLogs.mockResolvedValueOnce({
      url: 'https://example.com/logs.csv',
      jobId: 'job-77',
      format: 'csv'
    })

    const result = await adminService.exportLogs({
      activeUser: {
        id: 'u1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token',
      format: 'csv',
      limit: 100,
      query: '  queue lag ',
      levels: ['warning', 'error', 'warning'],
      from: ' 2026-02-24T00:00:00.000Z ',
      to: ' 2026-02-24T23:59:59.999Z '
    })

    expect(mockAdminProvider.exportLogs).toHaveBeenCalledWith({
      accessToken: 'token',
      format: 'csv',
      limit: 100,
      query: 'queue lag',
      levels: ['warning', 'error'],
      from: '2026-02-24T00:00:00.000Z',
      to: '2026-02-24T23:59:59.999Z'
    })
    expect(result).toEqual({
      url: 'https://example.com/logs.csv',
      jobId: 'job-77',
      format: 'csv',
      source: 'remote',
      sourceDetail: 'POST /admin/logs/export'
    })
  })

  it('throws NOT_SUPPORTED for exportLogs when export capability is unavailable', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: true,
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'POST /admin/logs/clear',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })

    await expect(
      adminService.exportLogs({
        activeUser: {
          id: 'u1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin'
        },
        accessToken: 'token',
        format: 'json'
      })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'NOT_SUPPORTED',
      message: 'export logs unsupported'
    })
  })

  it('gets export job status through provider when capability is available', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: true,
      canExportLogsRemote: true,
      canGetLogExportJobRemote: true,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'POST /admin/logs/clear',
      exportLogsDetail: 'POST /admin/logs/export',
      getLogExportJobDetail: 'GET /admin/logs/export/:jobId',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })
    mockAdminProvider.getLogExportJob.mockResolvedValueOnce({
      jobId: 'job-1',
      status: 'ready',
      url: 'https://example.com/logs.csv',
      format: 'csv',
      message: 'Ready'
    })

    const result = await adminService.getLogExportJob({
      activeUser: {
        id: 'u1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token',
      jobId: ' job-1 '
    })

    expect(mockAdminProvider.getLogExportJob).toHaveBeenCalledWith({
      accessToken: 'token',
      jobId: 'job-1'
    })
    expect(result).toEqual({
      jobId: 'job-1',
      status: 'ready',
      url: 'https://example.com/logs.csv',
      format: 'csv',
      message: 'Ready',
      source: 'remote',
      sourceDetail: 'GET /admin/logs/export/:jobId'
    })
  })

  it('throws for getLogExportJob when job id is blank after trimming', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: true,
      canExportLogsRemote: true,
      canGetLogExportJobRemote: true,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'POST /admin/logs/clear',
      exportLogsDetail: 'POST /admin/logs/export',
      getLogExportJobDetail: 'GET /admin/logs/export/:jobId',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })

    await expect(
      adminService.getLogExportJob({
        activeUser: {
          id: 'u1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin'
        },
        accessToken: 'token',
        jobId: '   '
      })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'UNKNOWN',
      message: 'Export job id is required'
    })

    expect(mockAdminProvider.getLogExportJob).not.toHaveBeenCalled()
  })

  it('throws NOT_SUPPORTED for getLogExportJob when capability is unavailable', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: true,
      canExportLogsRemote: true,
      canGetLogExportJobRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'POST /admin/logs/clear',
      exportLogsDetail: 'POST /admin/logs/export',
      getLogExportJobDetail: 'export job status unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })

    await expect(
      adminService.getLogExportJob({
        activeUser: {
          id: 'u1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin'
        },
        accessToken: 'token',
        jobId: 'job-1'
      })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'NOT_SUPPORTED',
      message: 'export job status unsupported'
    })
  })

  it('acknowledges a log through provider when mutation capability is available', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: true,
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: true,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'POST /admin/logs/clear',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'POST /admin/logs/:id/ack',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })
    mockAdminProvider.acknowledgeLog.mockResolvedValueOnce({
      id: 'log-1',
      timestamp: '2026-02-24T00:10:00.000Z',
      level: 'warning',
      message: 'Queue lag high',
      source: 'worker',
      acknowledged: true,
      acknowledgedAt: '2026-02-24T00:12:00.000Z'
    })

    const result = await adminService.acknowledgeLog({
      activeUser: {
        id: 'u1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token',
      logId: 'log-1'
    })

    expect(mockAdminProvider.acknowledgeLog).toHaveBeenCalledWith({
      accessToken: 'token',
      logId: 'log-1'
    })
    expect(result).toEqual({
      log: {
        id: 'log-1',
        timestamp: '2026-02-24T00:10:00.000Z',
        level: 'warning',
        message: 'Queue lag high',
        source: 'worker',
        acknowledged: true,
        acknowledgedAt: '2026-02-24T00:12:00.000Z'
      },
      source: 'remote',
      sourceDetail: 'POST /admin/logs/:id/ack'
    })
  })

  it('throws NOT_SUPPORTED for acknowledgeLog when mutation capability is unavailable', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: true,
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'POST /admin/logs/clear',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })

    await expect(
      adminService.acknowledgeLog({
        activeUser: {
          id: 'u1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin'
        },
        accessToken: 'token',
        logId: 'log-1'
      })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'NOT_SUPPORTED',
      message: 'ack log unsupported'
    })
  })

  it('resolves a log through provider when mutation capability is available', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: true,
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: true,
      canResolveLogRemote: true,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'POST /admin/logs/clear',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'POST /admin/logs/:id/ack',
      resolveLogDetail: 'POST /admin/logs/:id/resolve',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })
    mockAdminProvider.resolveLog.mockResolvedValueOnce({
      id: 'log-2',
      timestamp: '2026-02-24T00:20:00.000Z',
      level: 'audit',
      message: 'Issue resolved',
      source: 'worker',
      resolved: true,
      resolvedAt: '2026-02-24T00:21:00.000Z'
    })

    const result = await adminService.resolveLog({
      activeUser: {
        id: 'u1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token',
      logId: 'log-2'
    })

    expect(mockAdminProvider.resolveLog).toHaveBeenCalledWith({
      accessToken: 'token',
      logId: 'log-2'
    })
    expect(result).toEqual({
      log: {
        id: 'log-2',
        timestamp: '2026-02-24T00:20:00.000Z',
        level: 'audit',
        message: 'Issue resolved',
        source: 'worker',
        resolved: true,
        resolvedAt: '2026-02-24T00:21:00.000Z'
      },
      source: 'remote',
      sourceDetail: 'POST /admin/logs/:id/resolve'
    })
  })

  it('throws NOT_SUPPORTED for resolveLog when mutation capability is unavailable', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: true,
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: true,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'POST /admin/logs/clear',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'POST /admin/logs/:id/ack',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })

    await expect(
      adminService.resolveLog({
        activeUser: {
          id: 'u1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin'
        },
        accessToken: 'token',
        logId: 'log-2'
      })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'NOT_SUPPORTED',
      message: 'resolve log unsupported'
    })
  })

  it('retries a log through provider when mutation capability is available', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: true,
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: true,
      canResolveLogRemote: true,
      canRetryLogRemote: true,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'POST /admin/logs/clear',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'POST /admin/logs/:id/ack',
      resolveLogDetail: 'POST /admin/logs/:id/resolve',
      retryLogDetail: 'POST /admin/logs/:id/retry',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })
    mockAdminProvider.retryLog.mockResolvedValueOnce({
      id: 'log-3',
      timestamp: '2026-02-24T00:30:00.000Z',
      level: 'error',
      message: 'Retry requested',
      source: 'worker',
      acknowledged: true,
      resolved: false
    })

    const result = await adminService.retryLog({
      activeUser: {
        id: 'u1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token',
      logId: 'log-3'
    })

    expect(mockAdminProvider.retryLog).toHaveBeenCalledWith({
      accessToken: 'token',
      logId: 'log-3'
    })
    expect(result).toEqual({
      log: {
        id: 'log-3',
        timestamp: '2026-02-24T00:30:00.000Z',
        level: 'error',
        message: 'Retry requested',
        source: 'worker',
        acknowledged: true,
        resolved: false
      },
      source: 'remote',
      sourceDetail: 'POST /admin/logs/:id/retry'
    })
  })

  it('throws NOT_SUPPORTED for retryLog when mutation capability is unavailable', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: true,
      canClearLogsRemote: true,
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: true,
      canResolveLogRemote: true,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'POST /admin/logs/clear',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'POST /admin/logs/:id/ack',
      resolveLogDetail: 'POST /admin/logs/:id/resolve',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })

    await expect(
      adminService.retryLog({
        activeUser: {
          id: 'u1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin'
        },
        accessToken: 'token',
        logId: 'log-3'
      })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'NOT_SUPPORTED',
      message: 'retry log unsupported'
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'GET /admin/logs',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings endpoint unavailable',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: true,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'GET /admin/settings',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: true,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'PATCH /admin/users/:id/role',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: true,
      canUpdateUserStatusRemote: true,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'PATCH /admin/users/:id/role',
      updateUserStatusDetail: 'PATCH /admin/users/:id/status',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: true,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'PATCH /admin/users/:id/role',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: true,
      canUpdateUserStatusRemote: true,
      canUpdateUserLockRemote: true,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'PATCH /admin/users/:id/role',
      updateUserStatusDetail: 'PATCH /admin/users/:id/status',
      updateUserLockDetail: 'PATCH /admin/users/:id/lock',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: true,
      canUpdateUserStatusRemote: true,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'PATCH /admin/users/:id/role',
      updateUserStatusDetail: 'PATCH /admin/users/:id/status',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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

  it('returns local fallback user sessions when sessions capability is unavailable', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })

    const result = await adminService.getUserSessions({
      activeUser: {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token',
      userId: 'u2'
    })

    expect(mockAdminProvider.listUserSessions).not.toHaveBeenCalled()
    expect(result).toEqual({
      sessions: [],
      source: 'local-fallback',
      sourceDetail: 'user sessions unsupported'
    })
  })

  it('returns remote user sessions and preserves provider source detail', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: true,
      canRevokeUserSessionsRemote: true,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'GET /admin/users/:id/sessions',
      revokeUserSessionsDetail: 'POST /admin/users/:id/sessions/revoke',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })
    mockAdminProvider.listUserSessions.mockResolvedValueOnce([
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
      }
    ])

    const result = await adminService.getUserSessions({
      activeUser: {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token',
      userId: 'u2'
    })

    expect(mockAdminProvider.listUserSessions).toHaveBeenCalledWith({
      accessToken: 'token',
      userId: 'u2'
    })
    expect(result).toEqual({
      sessions: [
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
        }
      ],
      source: 'remote',
      sourceDetail: 'GET /admin/users/:id/sessions'
    })
  })

  it('revokes user sessions through provider when mutation capability is available', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: true,
      canRevokeUserSessionsRemote: true,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'GET /admin/users/:id/sessions',
      revokeUserSessionsDetail: 'POST /admin/users/:id/sessions/revoke',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })
    mockAdminProvider.revokeUserSessions.mockResolvedValueOnce({ revokedCount: 4 })

    const result = await adminService.revokeUserSessions({
      activeUser: {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token',
      userId: 'u2'
    })

    expect(mockAdminProvider.revokeUserSessions).toHaveBeenCalledWith({
      accessToken: 'token',
      userId: 'u2'
    })
    expect(result).toEqual({
      revokedCount: 4,
      source: 'remote',
      sourceDetail: 'POST /admin/users/:id/sessions/revoke'
    })
  })

  it('passes trimmed reason and context to revokeUserSessions provider call', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: true,
      canRevokeUserSessionsRemote: true,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'GET /admin/users/:id/sessions',
      revokeUserSessionsDetail: 'POST /admin/users/:id/sessions/revoke',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })
    mockAdminProvider.revokeUserSessions.mockResolvedValueOnce({ revokedCount: 1 })

    await adminService.revokeUserSessions({
      activeUser: {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token',
      userId: 'u2',
      reason: '  suspicious_activity  ',
      auditContext: {
        source: ' admin-user-detail ',
        action: ' force-logout-all '
      }
    })

    expect(mockAdminProvider.revokeUserSessions).toHaveBeenCalledWith({
      accessToken: 'token',
      userId: 'u2',
      reason: 'suspicious_activity',
      auditContext: {
        source: 'admin-user-detail',
        action: 'force-logout-all'
      }
    })
  })

  it('throws NOT_SUPPORTED for revokeUserSessions when mutation capability is unavailable', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: true,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'GET /admin/users/:id/sessions',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })

    await expect(
      adminService.revokeUserSessions({
        activeUser: {
          id: 'admin-1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin'
        },
        accessToken: 'token',
        userId: 'u2'
      })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'NOT_SUPPORTED',
      message: 'revoke user sessions unsupported'
    })
  })

  it('revokes a single user session through provider when mutation capability is available', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: true,
      canRevokeUserSessionsRemote: true,
      canRevokeUserSessionRemote: true,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'GET /admin/users/:id/sessions',
      revokeUserSessionsDetail: 'POST /admin/users/:id/sessions/revoke',
      revokeUserSessionDetail: 'POST /admin/users/:id/sessions/:sessionId/revoke',
      getHealthDetail: 'health unsupported'
    })
    mockAdminProvider.revokeUserSession.mockResolvedValueOnce({
      session: {
        id: 'sess-1',
        createdAt: '2026-02-24T00:00:00.000Z',
        lastSeenAt: '2026-02-24T01:00:00.000Z',
        expiresAt: '2026-02-24T05:00:00.000Z',
        ipAddress: '10.0.0.1',
        userAgent: 'Expo Go',
        deviceLabel: 'iPhone 15 Pro',
        platform: 'ios',
        revoked: true
      },
      revokedCount: 1
    })

    const result = await adminService.revokeUserSession({
      activeUser: {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token',
      userId: 'u2',
      sessionId: 'sess-1'
    })

    expect(mockAdminProvider.revokeUserSession).toHaveBeenCalledWith({
      accessToken: 'token',
      userId: 'u2',
      sessionId: 'sess-1'
    })
    expect(result).toEqual({
      session: {
        id: 'sess-1',
        createdAt: '2026-02-24T00:00:00.000Z',
        lastSeenAt: '2026-02-24T01:00:00.000Z',
        expiresAt: '2026-02-24T05:00:00.000Z',
        ipAddress: '10.0.0.1',
        userAgent: 'Expo Go',
        deviceLabel: 'iPhone 15 Pro',
        platform: 'ios',
        revoked: true
      },
      revokedCount: 1,
      source: 'remote',
      sourceDetail: 'POST /admin/users/:id/sessions/:sessionId/revoke'
    })
  })

  it('passes trimmed reason and context to revokeUserSession provider call', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: true,
      canRevokeUserSessionsRemote: true,
      canRevokeUserSessionRemote: true,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'GET /admin/users/:id/sessions',
      revokeUserSessionsDetail: 'POST /admin/users/:id/sessions/revoke',
      revokeUserSessionDetail: 'POST /admin/users/:id/sessions/:sessionId/revoke',
      getHealthDetail: 'health unsupported'
    })
    mockAdminProvider.revokeUserSession.mockResolvedValueOnce({
      session: null,
      revokedCount: 1
    })

    await adminService.revokeUserSession({
      activeUser: {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin'
      },
      accessToken: 'token',
      userId: 'u2',
      sessionId: 'sess-1',
      reason: '  manual_security_reset  ',
      auditContext: {
        source: ' admin-user-detail ',
        action: ' force-logout-one '
      }
    })

    expect(mockAdminProvider.revokeUserSession).toHaveBeenCalledWith({
      accessToken: 'token',
      userId: 'u2',
      sessionId: 'sess-1',
      reason: 'manual_security_reset',
      auditContext: {
        source: 'admin-user-detail',
        action: 'force-logout-one'
      }
    })
  })

  it('throws NOT_SUPPORTED for revokeUserSession when mutation capability is unavailable', async () => {
    const { adminService } = await import('@/services/admin.service')

    mockAdminProvider.getCapabilities.mockReturnValue({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canListLogsRemote: false,
      canClearLogsRemote: false,
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: true,
      canRevokeUserSessionsRemote: true,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'GET /admin/users/:id/sessions',
      revokeUserSessionsDetail: 'POST /admin/users/:id/sessions/revoke',
      revokeUserSessionDetail: 'revoke user session unsupported',
      getHealthDetail: 'health unsupported'
    })

    await expect(
      adminService.revokeUserSession({
        activeUser: {
          id: 'admin-1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin'
        },
        accessToken: 'token',
        userId: 'u2',
        sessionId: 'sess-1'
      })
    ).rejects.toMatchObject({
      name: 'AdminProviderError',
      code: 'NOT_SUPPORTED',
      message: 'revoke user session unsupported'
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: false,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: true,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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
      canExportLogsRemote: false,
      canAcknowledgeLogRemote: false,
      canResolveLogRemote: false,
      canRetryLogRemote: false,
      canGetSettingsRemote: false,
      canUpdateUserRoleRemote: false,
      canUpdateUserStatusRemote: false,
      canUpdateUserLockRemote: false,
      canListUserSessionsRemote: false,
      canRevokeUserSessionsRemote: false,
      canRevokeUserSessionRemote: false,
      canGetHealthRemote: true,
      listUsersDetail: 'users',
      getUserDetail: 'user-detail',
      listRolesDetail: 'roles',
      listLogsDetail: 'logs unsupported',
      clearLogsDetail: 'clear logs unsupported',
      exportLogsDetail: 'export logs unsupported',
      acknowledgeLogDetail: 'ack log unsupported',
      resolveLogDetail: 'resolve log unsupported',
      retryLogDetail: 'retry log unsupported',
      getSettingsDetail: 'settings unsupported',
      updateUserRoleDetail: 'role update unsupported',
      updateUserStatusDetail: 'status update unsupported',
      updateUserLockDetail: 'lock update unsupported',
      listUserSessionsDetail: 'user sessions unsupported',
      revokeUserSessionsDetail: 'revoke user sessions unsupported',
      revokeUserSessionDetail: 'revoke user session unsupported',
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
