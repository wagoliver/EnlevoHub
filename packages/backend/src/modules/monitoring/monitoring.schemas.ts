import { z } from 'zod'

export const auditQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
})

export const timeseriesQuerySchema = z.object({
  minutes: z.coerce.number().int().min(5).max(1440).default(60),
})
