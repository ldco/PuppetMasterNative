export const roleHierarchy = ['master', 'admin', 'editor', 'user'] as const

export type Role = (typeof roleHierarchy)[number]
export type ThemeMode = 'system' | 'light' | 'dark'
export type ThemeResolvedMode = 'light' | 'dark'

export const ROLE_LEVELS: Record<Role, number> = {
  user: 0,
  editor: 1,
  admin: 2,
  master: 3
}

export const hasRoleLevel = (activeRole: Role | undefined, minRole: Role): boolean => {
  if (!activeRole) {
    return false
  }

  return ROLE_LEVELS[activeRole] >= ROLE_LEVELS[minRole]
}

export interface ColorPrimitives {
  black: string
  white: string
  brand: string
  accent: string
}

export interface FeatureFlags {
  auth: boolean
  registration: boolean
  forgotPassword: boolean
  admin: boolean
}

export type BackendProvider = 'generic-rest' | 'supabase'
export type SocialAuthProviderKey = 'google' | 'telegram' | 'vk'

export interface BackendSocialAuthConfig {
  google?: boolean
  telegram?: boolean
  vk?: boolean
}

export interface GenericRestAuthEndpoints {
  login: string
  register: string
  forgotPassword?: string
  logout: string
  session: string
  refresh: string
}

export interface GenericRestSettingsEndpoints {
  sync: string
}

export interface GenericRestBackendConfig {
  auth: {
    endpoints: GenericRestAuthEndpoints
  }
  settings?: {
    endpoints: GenericRestSettingsEndpoints
  }
}

export interface SupabaseBackendConfig {
  urlEnvVar: string
  anonKeyEnvVar: string
}

export type TabKey = 'home' | 'profile' | 'settings'

export interface TabDefinition {
  key: TabKey
  title: string
  icon: 'home-outline' | 'person-outline' | 'settings-outline'
  enabled: boolean
  requireAuth: boolean
  minRole?: Role
}

export type AdminModuleGroup = 'system' | 'app'

export type AdminModuleId =
  | 'users'
  | 'roles'
  | 'translations'
  | 'settings'
  | 'health'
  | 'logs'

export interface AdminModuleConfig {
  enabled: boolean
  label: string
  icon: string
  group: AdminModuleGroup
  roles: Role[]
}

export type AdminModulesConfig = Record<AdminModuleId, AdminModuleConfig>

export interface AdminSection {
  id: AdminModuleId
  label: string
  icon: string
  group: AdminModuleGroup
  roles: Role[]
}

export const defaultAdminModules: AdminModulesConfig = {
  users: {
    enabled: true,
    label: 'Users',
    icon: 'people-outline',
    group: 'system',
    roles: ['master', 'admin']
  },
  roles: {
    enabled: false,
    label: 'Roles',
    icon: 'shield-outline',
    group: 'system',
    roles: ['master']
  },
  translations: {
    enabled: false,
    label: 'Translations',
    icon: 'language-outline',
    group: 'system',
    roles: ['master', 'admin', 'editor']
  },
  settings: {
    enabled: true,
    label: 'Settings',
    icon: 'settings-outline',
    group: 'system',
    roles: ['master', 'admin']
  },
  health: {
    enabled: false,
    label: 'Health',
    icon: 'pulse-outline',
    group: 'system',
    roles: ['master']
  },
  logs: {
    enabled: false,
    label: 'Logs',
    icon: 'document-text-outline',
    group: 'system',
    roles: ['master']
  }
}

export const getAdminSections = (modules: AdminModulesConfig): AdminSection[] => {
  return (Object.entries(modules) as [AdminModuleId, AdminModuleConfig][])
    .filter(([, module]) => module.enabled)
    .map(([id, module]) => ({
      id,
      label: module.label,
      icon: module.icon,
      group: module.group,
      roles: module.roles
    }))
}

export const filterAdminSectionsByRole = (
  sections: AdminSection[],
  role: Role
): AdminSection[] => {
  return sections.filter((section) => {
    return section.roles.some((allowedRole) => hasRoleLevel(role, allowedRole))
  })
}

export interface PMNativeConfig {
  app: {
    name: string
    slug: string
  }
  theme: {
    colors: ColorPrimitives
    defaultMode: ThemeMode
  }
  features: FeatureFlags
  navigation: {
    tabs: TabDefinition[]
  }
  admin: {
    enabled: boolean
    modules: AdminModulesConfig
  }
  rbac: Record<Role, Role[]>
  api: {
    baseUrl: string
    timeoutMs: number
  }
  backend: {
    provider: BackendProvider
    socialAuth?: BackendSocialAuthConfig
    genericRest?: GenericRestBackendConfig
    supabase?: SupabaseBackendConfig
  }
  i18n: {
    defaultLocale: string
    supportedLocales: string[]
  }
}

export const hasRoleAccess = (
  activeRole: Role,
  requiredRole: Role,
  rbac: Record<Role, Role[]>
): boolean => {
  return rbac[activeRole].includes(requiredRole)
}
