import { z } from 'zod'

export const genericRestUserSchema = z
  .object({
    id: z.union([z.string().min(1), z.number().int().nonnegative()]),
    email: z.string().email(),
    name: z.string().min(1).nullable(),
    avatarUrl: z.string().min(1).nullable().optional(),
    avatar_url: z.string().min(1).nullable().optional(),
    role: z.enum(['master', 'admin', 'editor', 'user'])
  })
  .transform(({ id, avatarUrl, avatar_url, ...value }) => ({
    ...value,
    id: String(id),
    avatarUrl: (avatarUrl ?? avatar_url)?.trim() || null
  }))
