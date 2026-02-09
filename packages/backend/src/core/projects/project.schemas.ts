import { z } from 'zod'

export const addressSchema = z.object({
  street: z.string().min(2),
  number: z.string().min(1),
  complement: z.string().optional(),
  neighborhood: z.string().min(2),
  city: z.string().min(2),
  state: z.string().length(2),
  zipCode: z.string().min(8),
})

export const createProjectSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  address: addressSchema,
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  expectedEndDate: z.string().datetime().optional(),
  budget: z.number().positive(),
  metadata: z.record(z.any()).optional(),
})

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  address: addressSchema.optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().datetime().nullable().optional(),
  expectedEndDate: z.string().datetime().nullable().optional(),
  actualEndDate: z.string().datetime().nullable().optional(),
  budget: z.number().positive().optional(),
  metadata: z.record(z.any()).optional(),
})

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'status', 'budget']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const createEvolutionSchema = z.object({
  date: z.string().datetime().optional(),
  percentage: z.number().min(0).max(100),
  phase: z.string().min(2),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional(),
})

export const updateEvolutionSchema = z.object({
  date: z.string().datetime().optional(),
  percentage: z.number().min(0).max(100).optional(),
  phase: z.string().min(2).optional(),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional(),
})

export const createUnitSchema = z.object({
  code: z.string().min(1).max(20),
  type: z.enum(['APARTMENT', 'HOUSE', 'COMMERCIAL', 'LAND']),
  floor: z.number().int().optional(),
  area: z.number().positive(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  price: z.number().positive(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED']).optional(),
  metadata: z.record(z.any()).optional(),
})

export const updateUnitSchema = createUnitSchema.partial()

export const listUnitsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED']).optional(),
  type: z.enum(['APARTMENT', 'HOUSE', 'COMMERCIAL', 'LAND']).optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>
export type CreateEvolutionInput = z.infer<typeof createEvolutionSchema>
export type UpdateEvolutionInput = z.infer<typeof updateEvolutionSchema>
export type CreateUnitInput = z.infer<typeof createUnitSchema>
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>
export type ListUnitsQuery = z.infer<typeof listUnitsQuerySchema>
