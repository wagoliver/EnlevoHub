import { z } from 'zod'

export const createProjectActivitySchema = z.object({
  name: z.string().min(2).max(200),
  weight: z.number().min(0).max(100).default(1),
  order: z.number().int().min(0),
  scope: z.enum(['ALL_UNITS', 'SPECIFIC_UNITS', 'GENERAL']).default('ALL_UNITS'),
  unitIds: z.array(z.string()).optional(), // required when scope = SPECIFIC_UNITS
})

export const updateProjectActivitySchema = z.object({
  name: z.string().min(2).max(200).optional(),
  weight: z.number().min(0).max(100).optional(),
  order: z.number().int().min(0).optional(),
})

export const createFromTemplateSchema = z.object({
  templateId: z.string().uuid(),
})

// === Hierarchical schedule-based template application ===

const scheduledActivityChildSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string().min(1),
    level: z.enum(['PHASE', 'STAGE', 'ACTIVITY']),
    order: z.number().int().min(0),
    weight: z.number().min(0).max(100).default(1),
    plannedStartDate: z.string().optional(),
    plannedEndDate: z.string().optional(),
    dependencies: z.array(z.string()).optional(),
    color: z.string().optional(),
    scope: z.enum(['ALL_UNITS', 'SPECIFIC_UNITS', 'GENERAL']).optional(),
    children: z.array(scheduledActivityChildSchema).optional(),
  })
)

export const createFromTemplateWithScheduleSchema = z.object({
  templateId: z.string().uuid(),
  schedulingMode: z.enum(['BUSINESS_DAYS', 'CALENDAR_DAYS']).optional(),
  holidays: z.array(z.string()).optional(),
  activities: z.array(scheduledActivityChildSchema).min(1),
})

// === Direct hierarchy creation (no template needed) ===

const hierarchyActivitySchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0).max(100).default(1),
  durationDays: z.number().int().positive().optional().nullable(),
  dependencies: z.array(z.string()).optional().nullable(),
})

const hierarchyStageSchema = z.object({
  name: z.string().min(1),
  activities: z.array(hierarchyActivitySchema).min(1),
})

const hierarchyPhaseSchema = z.object({
  name: z.string().min(1),
  percentageOfTotal: z.number().min(0).max(100),
  color: z.string().optional().nullable(),
  stages: z.array(hierarchyStageSchema).min(1),
})

export const createFromHierarchySchema = z.object({
  phases: z.array(hierarchyPhaseSchema).min(1),
})

export type CreateFromHierarchyInput = z.infer<typeof createFromHierarchySchema>

export const createMeasurementSchema = z.object({
  activityId: z.string().uuid(),
  unitActivityId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  contractorId: z.string().uuid().optional(),
  progress: z.number().min(0).max(100),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional(),
})

export const createBatchMeasurementSchema = z.object({
  contractorId: z.string().uuid().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    activityId: z.string().uuid(),
    unitActivityId: z.string().uuid(),
    progress: z.number().min(0).max(100),
  })).min(1),
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
export type CreateFromTemplateWithScheduleInput = z.infer<typeof createFromTemplateWithScheduleSchema>
export type CreateMeasurementInput = z.infer<typeof createMeasurementSchema>
export type CreateBatchMeasurementInput = z.infer<typeof createBatchMeasurementSchema>
export type ReviewMeasurementInput = z.infer<typeof reviewMeasurementSchema>
export type ListMeasurementsQuery = z.infer<typeof listMeasurementsQuerySchema>
