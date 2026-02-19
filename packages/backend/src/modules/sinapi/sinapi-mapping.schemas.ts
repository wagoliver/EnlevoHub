import { z } from 'zod'

export const createMappingSchema = z.object({
  fase: z.string().min(1, 'Fase é obrigatória'),
  etapa: z.string().min(1, 'Etapa é obrigatória'),
  atividade: z.string().min(1, 'Atividade é obrigatória'),
  sinapiCodigo: z.string().optional().nullable(),
  unidade: z.string().optional().nullable(),
  grupoSinapi: z.string().optional().nullable(),
  order: z.coerce.number().int().optional(),
})

export const updateMappingSchema = z.object({
  fase: z.string().min(1).optional(),
  etapa: z.string().min(1).optional(),
  atividade: z.string().min(1).optional(),
  sinapiCodigo: z.string().optional().nullable(),
  unidade: z.string().optional().nullable(),
  grupoSinapi: z.string().optional().nullable(),
  order: z.coerce.number().int().optional(),
})

export const listMappingsSchema = z.object({
  fase: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
})

export const suggestMappingsSchema = z.object({
  fase: z.string().min(1),
  etapa: z.string().min(1),
})

export type CreateMappingInput = z.infer<typeof createMappingSchema>
export type UpdateMappingInput = z.infer<typeof updateMappingSchema>
export type ListMappingsQuery = z.infer<typeof listMappingsSchema>
