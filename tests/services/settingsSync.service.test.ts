import { describe, expect, it } from 'vitest'

import { settingsSyncService } from '@/services/settingsSync.service'

describe('settingsSyncService', () => {
  it('builds a warning preview when actor and remote endpoint are missing', () => {
    const preview = settingsSyncService.buildPreview({
      preferences: {
        notificationsEnabled: true,
        analyticsEnabled: false
      },
      backendProvider: 'supabase',
      hasAdminModule: true,
      actor: null,
      hasRemoteSyncEndpoint: false
    })

    expect(preview.status).toBe('warning')
    expect(preview.summary).toContain('Preview only')
    expect(preview.rows.find((row) => row.key === 'sync-endpoint')?.status).toBe('warning')
    expect(preview.rows.find((row) => row.key === 'actor')?.status).toBe('warning')
    expect(preview.rows.find((row) => row.key === 'notifications')?.value).toBe('enabled')
    expect(preview.rows.find((row) => row.key === 'analytics')?.value).toBe('disabled')
  })

  it('builds an ok preview and request draft when remote sync is available', () => {
    const actor = {
      id: 'u-1',
      email: 'admin@example.com',
      role: 'admin' as const
    }

    const input = {
      preferences: {
        notificationsEnabled: false,
        analyticsEnabled: true
      },
      backendProvider: 'generic-rest' as const,
      hasAdminModule: true,
      actor,
      hasRemoteSyncEndpoint: true
    }

    const preview = settingsSyncService.buildPreview(input)
    const draft = settingsSyncService.buildRequestDraft(input)

    expect(preview.status).toBe('ok')
    expect(preview.summary).toContain('ready to sync')
    expect(preview.nextStep).toContain('Invoke the configured settings sync endpoint')
    expect(draft).toEqual({
      schema: 'pmnative.settings.sync/1',
      backendProvider: 'generic-rest',
      actor,
      preferences: {
        notificationsEnabled: false,
        analyticsEnabled: true
      },
      context: {
        source: 'admin-settings',
        hasAdminModule: true,
        hasRemoteSyncEndpoint: true,
        mode: 'preview'
      }
    })
  })
})
