import { pmNativeConfig } from '@/pm-native.config'
import {
  filterAdminSectionsByRole,
  getAdminSections,
  type AdminSection,
  type PMNativeConfig,
  type Role
} from '@/types/config'
import { pmNativeConfigSchema } from '@/utils/validation'

export interface PMNativeRuntimeConfig extends PMNativeConfig {
  hasAuth: boolean
  hasAdmin: boolean
  getAdminSections: () => AdminSection[]
  getAdminSectionsForRole: (role: Role) => AdminSection[]
}

const parsedConfig = pmNativeConfigSchema.parse(pmNativeConfig)
const adminSections = getAdminSections(parsedConfig.admin.modules)

const runtimeConfig: PMNativeRuntimeConfig = {
  ...parsedConfig,
  hasAuth: parsedConfig.features.auth,
  hasAdmin: parsedConfig.features.admin && parsedConfig.admin.enabled,
  getAdminSections: () => adminSections,
  getAdminSectionsForRole: (role: Role) => filterAdminSectionsByRole(adminSections, role)
}

export const useConfig = (): PMNativeRuntimeConfig => runtimeConfig
