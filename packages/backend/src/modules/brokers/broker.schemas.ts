import { z } from 'zod'

export const createBrokerSchema = z.object({
  name: z.string().min(2).max(200),
  document: z.string().min(11).max(14),
  creci: z.string().optional(),
  commissionRate: z.number().min(0).max(100),
  contacts: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
  }),
  loginEmail: z.string().email().optional(),
  loginPassword: z.string().min(6).optional(),
})

export const updateBrokerSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  document: z.string().min(11).max(14).optional(),
  creci: z.string().nullable().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  contacts: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
  }).optional(),
  isActive: z.boolean().optional(),
})

export const listBrokersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

export type CreateBrokerInput = z.infer<typeof createBrokerSchema>
export type UpdateBrokerInput = z.infer<typeof updateBrokerSchema>
export type ListBrokersQuery = z.infer<typeof listBrokersQuerySchema>
