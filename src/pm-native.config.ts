import type { PMNativeConfig } from '@/types/config'
import { defaultAdminModules } from '@/types/config'

const runtimeEnv = globalThis as {
  process?: {
    env?: Record<string, string | undefined>
  }
}

export const pmNativeConfig: PMNativeConfig = {
  app: {
    name: 'PMNative',
    slug: 'pm-native'
  },
  theme: {
    colors: {
      black: '#2f2f2f',
      white: '#f0f0f0',
      brand: '#aa0000',
      accent: '#0f172a'
    },
    defaultMode: 'system'
  },
  features: {
    auth: true,
    registration: true,
    forgotPassword: true,
    admin: true
  },
  navigation: {
    tabs: [
      {
        key: 'home',
        title: 'Home',
        icon: 'home-outline',
        enabled: true,
        requireAuth: true,
        minRole: 'user'
      },
      {
        key: 'profile',
        title: 'Profile',
        icon: 'person-outline',
        enabled: true,
        requireAuth: true,
        minRole: 'user'
      },
      {
        key: 'settings',
        title: 'Settings',
        icon: 'settings-outline',
        enabled: true,
        requireAuth: true,
        minRole: 'user'
      }
    ]
  },
  admin: {
    // Admin shell remains enabled by default; unsupported backend actions are capability-gated in UI/services.
    enabled: true,
    modules: defaultAdminModules
  },
  rbac: {
    master: ['master', 'admin', 'editor', 'user'],
    admin: ['admin', 'editor', 'user'],
    editor: ['editor', 'user'],
    user: ['user']
  },
  api: {
    baseUrl: runtimeEnv.process?.env?.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.example.com',
    timeoutMs: 10000
  },
  backend: {
    provider: 'supabase',
    socialAuth: {
      google: false,
      telegram: false,
      vk: false
    },
    genericRest: {
      auth: {
        endpoints: {
          login: '/auth/login',
          register: '/auth/register',
          forgotPassword: '/auth/forgot-password',
          // Optional PMN-070 direct password update endpoint (provider capability follows this):
          // changePassword: '/auth/change-password',
          logout: '/auth/logout',
          session: '/auth/session',
          refresh: '/auth/refresh'
        }
      }
      // Optional future endpoint contract for PMN-071 settings sync:
      // settings: {
      //   endpoints: {
      //     sync: '/settings/sync'
      //   }
      // }
      // profile: {
      //   endpoints: {
      //     get: '/profile/me',
      //     update: '/profile/me',
      //     uploadAvatar: '/profile/avatar'
      //   }
      // }
      // admin: {
      //   endpoints: {
      //     listUsers: '/admin/users',
      //     getUser: '/admin/users/:id',
      //     listRoles: '/admin/roles',
      //     listLogs: '/admin/logs',
      //     clearLogs: '/admin/logs/clear',
      //     exportLogs: '/admin/logs/export',
      //     getLogExportJob: '/admin/logs/export/:jobId',
      //     acknowledgeLog: '/admin/logs/:id/ack',
      //     resolveLog: '/admin/logs/:id/resolve',
      //     retryLog: '/admin/logs/:id/retry',
      //     settings: '/admin/settings',
      //     updateUserRole: '/admin/users/:id/role',
      //     updateUserStatus: '/admin/users/:id/status',
      //     updateUserLock: '/admin/users/:id/lock',
      //     listUserSessions: '/admin/users/:id/sessions',
      //     revokeUserSessions: '/admin/users/:id/sessions/revoke',
      //     revokeUserSession: '/admin/users/:id/sessions/:sessionId/revoke',
      //     health: '/admin/health'
      //   }
      // }
    },
    supabase: {
      urlEnvVar: 'EXPO_PUBLIC_SUPABASE_URL',
      anonKeyEnvVar: 'EXPO_PUBLIC_SUPABASE_ANON_KEY'
      // Optional PMN-070 avatar upload bucket (public bucket recommended for direct avatar URLs):
      // profileAvatarsBucket: 'profile-avatars'
    }
  },
  i18n: {
    defaultLocale: 'en',
    supportedLocales: ['en']
  }
}
