import { z } from 'zod'

const roleSchema = z.enum(['master', 'admin', 'editor', 'user'])
const tabKeySchema = z.enum(['home', 'profile', 'settings'])

const roleMatrixSchema = z.object({
  master: z.array(roleSchema),
  admin: z.array(roleSchema),
  editor: z.array(roleSchema),
  user: z.array(roleSchema)
})

const adminModuleSchema = z.object({
  enabled: z.boolean(),
  label: z.string().min(1),
  icon: z.string().min(1),
  group: z.enum(['system', 'app']),
  roles: z.array(roleSchema).min(1)
})

const genericRestAuthEndpointsSchema = z.object({
  login: z.string().min(1),
  register: z.string().min(1),
  forgotPassword: z.string().min(1).optional(),
  logout: z.string().min(1),
  session: z.string().min(1),
  refresh: z.string().min(1)
})

export const pmNativeConfigSchema = z.object({
  app: z.object({
    name: z.string().min(1),
    slug: z.string().min(1)
  }),
  theme: z.object({
    colors: z.object({
      black: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      white: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      brand: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/)
    }),
    defaultMode: z.enum(['system', 'light', 'dark'])
  }),
  features: z.object({
    auth: z.boolean(),
    registration: z.boolean(),
    forgotPassword: z.boolean(),
    admin: z.boolean()
  }),
  navigation: z.object({
    tabs: z.array(
      z.object({
        key: tabKeySchema,
        title: z.string().min(1),
        icon: z.enum(['home-outline', 'person-outline', 'settings-outline']),
        enabled: z.boolean(),
        requireAuth: z.boolean(),
        minRole: roleSchema.optional()
      })
    )
  }),
  admin: z.object({
    enabled: z.boolean(),
    modules: z.object({
      users: adminModuleSchema,
      roles: adminModuleSchema,
      translations: adminModuleSchema,
      settings: adminModuleSchema,
      health: adminModuleSchema,
      logs: adminModuleSchema
    })
  }),
  rbac: roleMatrixSchema,
  api: z.object({
    baseUrl: z.string().url(),
    timeoutMs: z.number().int().positive()
  }),
  backend: z.object({
    provider: z.enum(['generic-rest', 'supabase']),
    genericRest: z.object({
      auth: z.object({
        endpoints: genericRestAuthEndpointsSchema
      })
    }).optional(),
    supabase: z.object({
      urlEnvVar: z.string().min(1),
      anonKeyEnvVar: z.string().min(1)
    }).optional()
  }).superRefine((value, ctx) => {
    if (value.provider === 'generic-rest' && !value.genericRest) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'backend.genericRest is required when provider is generic-rest',
        path: ['genericRest']
      })
    }

    if (value.provider === 'supabase' && !value.supabase) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'backend.supabase is required when provider is supabase',
        path: ['supabase']
      })
    }
  }),
  i18n: z.object({
    defaultLocale: z.string().min(2),
    supportedLocales: z.array(z.string().min(2)).min(1)
  })
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
})

export const forgotPasswordSchema = z.object({
  email: z.string().email()
})
