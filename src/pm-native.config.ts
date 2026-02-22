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
    },
    supabase: {
      urlEnvVar: 'EXPO_PUBLIC_SUPABASE_URL',
      anonKeyEnvVar: 'EXPO_PUBLIC_SUPABASE_ANON_KEY'
    }
  },
  i18n: {
    defaultLocale: 'en',
    supportedLocales: ['en']
  }
}
