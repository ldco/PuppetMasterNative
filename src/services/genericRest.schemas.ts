import { z } from 'zod'

export const genericRestUserSchema = z
  .object({
    id: z.union([z.string().min(1), z.number().int().nonnegative()]),
    email: z.string().email(),
    name: z.string().min(1).nullable(),
    role: z.enum(['master', 'admin', 'editor', 'user'])
  })
  .transform((value) => ({
    ...value,
    id: String(value.id)
  }))
