import { z } from 'zod'

export const createProjectActivitySchema = z.object({
  name: z.string().min(2).max(200),
  weight: z.number().min(0.01).max(999.99).default(1),
  order: z.number().int().min(0),
  scope: z.enum(['ALL_UNITS', 'SPECIFIC_UNITS', 'GENERAL']).default('ALL_UNITS'),
  unitIds: z.array(z.string()).optional(), // required when scope = SPECIFIC_UNITS
})

export const updateProjectActivitySchema = z.object({
  name: z.string().min(2).max(200).optional(),
  weight: z.number().min(0.01).max(999.99).optional(),
  order: z.number().int().min(0).optional(),
})

export const createFromTemplateSchema = z.object({
  templateId: z.string().uuid(),
})

export const createMeasurementSchema = z.object({
  activityId: z.string().uuid(),
  unitActivityId: z.string().uuid().optional(),
  contractorId: z.string().uuid().optional(),
  progress: z.number().min(0).max(100),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional(),
})

export const reviewMeasurementSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNotes: z.string().optional(),
})

export const listMeasurementsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  activityId: z.string().optional(),
  contractorId: z.string().optional(),
})

export type CreateProjectActivityInput = z.infer<typeof createProjectActivitySchema>
export type UpdateProjectActivityInput = z.infer<typeof updateProjectActivitySchema>
export type CreateFromTemplateInput = z.infer<typeof createFromTemplateSchema>
export type CreateMeasurementInput = z.infer<typeof createMeasurementSchema>
export type ReviewMeasurementInput = z.infer<typeof reviewMeasurementSchema>
export type ListMeasurementsQuery = z.infer<typeof listMeasurementsQuerySchema>
