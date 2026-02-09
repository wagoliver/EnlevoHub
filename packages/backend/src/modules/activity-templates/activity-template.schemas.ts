import { z } from 'zod'

export const templateItemSchema = z.object({
  name: z.string().min(2).max(200),
  order: z.number().int().min(0),
  weight: z.number().min(0.01).max(999.99).default(1),
})

export const createActivityTemplateSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  items: z.array(templateItemSchema).min(1),
})

export const updateActivityTemplateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().nullable().optional(),
  items: z.array(templateItemSchema).min(1).optional(),
})

export const listActivityTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
})

export type CreateActivityTemplateInput = z.infer<typeof createActivityTemplateSchema>
export type UpdateActivityTemplateInput = z.infer<typeof updateActivityTemplateSchema>
export type ListActivityTemplatesQuery = z.infer<typeof listActivityTemplatesQuerySchema>
