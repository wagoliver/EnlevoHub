import { z } from 'zod'

export const createContractorSchema = z.object({
  name: z.string().min(2).max(200),
  document: z.string().min(11).max(18),
  specialty: z.array(z.string()).min(1),
  teamSize: z.number().int().positive().optional(),
  contacts: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
  }),
  rating: z.number().min(0).max(5).optional(),
  loginEmail: z.string().email().optional(),
  loginPassword: z.string().min(6).optional(),
})

export const updateContractorSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  document: z.string().min(11).max(18).optional(),
  specialty: z.array(z.string()).min(1).optional(),
  teamSize: z.number().int().positive().nullable().optional(),
  contacts: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
  }).optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  isActive: z.boolean().optional(),
})

export const listContractorsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  specialty: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

export const assignContractorToProjectSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  role: z.string().min(2),
})

export const assignActivitiesSchema = z.object({
  activityIds: z.array(z.string().uuid()).min(1),
})

export const syncUnitsSchema = z.object({
  unitIds: z.array(z.string().uuid()),
})

export type CreateContractorInput = z.infer<typeof createContractorSchema>
export type UpdateContractorInput = z.infer<typeof updateContractorSchema>
export type ListContractorsQuery = z.infer<typeof listContractorsQuerySchema>
export type AssignContractorToProjectInput = z.infer<typeof assignContractorToProjectSchema>
export type AssignActivitiesInput = z.infer<typeof assignActivitiesSchema>
export type SyncUnitsInput = z.infer<typeof syncUnitsSchema>
