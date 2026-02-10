import { z } from 'zod'

// === Hierarchical schemas ===

export const templateActivitySchema = z.object({
  name: z.string().min(2).max(200),
  order: z.number().int().min(0),
  weight: z.number().min(0.01).max(999.99).default(1),
  durationDays: z.number().int().min(1).nullable().optional(),
  dependencies: z.array(z.string()).nullable().optional(),
})

export const templateStageSchema = z.object({
  name: z.string().min(2).max(200),
  order: z.number().int().min(0),
  activities: z.array(templateActivitySchema).min(1),
})

export const templatePhaseSchema = z.object({
  name: z.string().min(2).max(200),
  order: z.number().int().min(0),
  percentageOfTotal: z.number().min(0.01).max(100),
  color: z.string().nullable().optional(),
  stages: z.array(templateStageSchema).min(1),
})

// === Legacy flat item schema (backward compat) ===

export const templateItemSchema = z.object({
  name: z.string().min(2).max(200),
  order: z.number().int().min(0),
  weight: z.number().min(0.01).max(999.99).default(1),
})

// === Create / Update ===

export const createActivityTemplateSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  // Hierarchical format (preferred)
  phases: z.array(templatePhaseSchema).optional(),
  // Flat format (backward compat)
  items: z.array(templateItemSchema).optional(),
}).refine(
  (data) => {
    // Must have either phases or items
    if (!data.phases?.length && !data.items?.length) return false
    // If phases, percentages must sum to 100
    if (data.phases?.length) {
      const sum = data.phases.reduce((s, p) => s + p.percentageOfTotal, 0)
      return Math.abs(sum - 100) < 0.1
    }
    return true
  },
  {
    message: 'Forneça phases (com percentuais somando 100%) ou items',
  }
)

export const updateActivityTemplateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().nullable().optional(),
  phases: z.array(templatePhaseSchema).optional(),
  items: z.array(templateItemSchema).optional(),
}).refine(
  (data) => {
    if (data.phases?.length) {
      const sum = data.phases.reduce((s, p) => s + p.percentageOfTotal, 0)
      return Math.abs(sum - 100) < 0.1
    }
    return true
  },
  {
    message: 'Percentuais das fases devem somar 100%',
  }
)

export const listActivityTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
})

export const previewScheduleSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  mode: z.enum(['BUSINESS_DAYS', 'CALENDAR_DAYS']),
  holidays: z.array(z.string()).optional(),
})

export const cloneActivityTemplateSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional(),
})

export type CreateActivityTemplateInput = z.infer<typeof createActivityTemplateSchema>
export type UpdateActivityTemplateInput = z.infer<typeof updateActivityTemplateSchema>
export type ListActivityTemplatesQuery = z.infer<typeof listActivityTemplatesQuerySchema>
export type PreviewScheduleInput = z.infer<typeof previewScheduleSchema>
export type CloneActivityTemplateInput = z.infer<typeof cloneActivityTemplateSchema>
