import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/services/api'

interface LoadAdminProviderOptions {
  provider: 'generic-rest' | 'supabase'
  adminEndpoints?: {
    listUsers: string
    getUser?: string
    listRoles?: string
    updateUserRole?: string
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
        updateUserRole: '/admin/users/:id/role'
      }
    })

    expect(adminProvider.getCapabilities()).toEqual({
      canListUsersRemote: true,
      canGetUserRemote: true,
      canListRolesRemote: true,
      canUpdateUserRoleRemote: true,
      listUsersDetail: 'GET /admin/users',
      getUserDetail: 'GET /admin/users/:id',
      listRolesDetail: 'GET /admin/roles',
      updateUserRoleDetail: 'PATCH /admin/users/:id/role'
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
})
