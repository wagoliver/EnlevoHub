import { z } from 'zod'

export const createLevantamentoSchema = z.object({
  nome: z.string().min(1).max(200),
  tipo: z.enum(['MANUAL', 'SINAPI']).default('MANUAL'),
  uf: z.string().length(2).optional(),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  observacoes: z.string().optional(),
})

export const updateLevantamentoSchema = z.object({
  nome: z.string().min(1).max(200).optional(),
  tipo: z.enum(['MANUAL', 'SINAPI']).optional(),
  uf: z.string().length(2).optional().nullable(),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}$/).optional().nullable(),
  observacoes: z.string().optional().nullable(),
})

export const createItemSchema = z.object({
  nome: z.string().min(1).max(500),
  unidade: z.string().min(1).max(20),
  quantidade: z.number().positive(),
  precoUnitario: z.number().min(0),
  etapa: z.string().max(200).optional(),
  sinapiInsumoId: z.string().uuid().optional(),
  sinapiComposicaoId: z.string().uuid().optional(),
  observacoes: z.string().optional(),
})

export const updateItemSchema = z.object({
  nome: z.string().min(1).max(500).optional(),
  unidade: z.string().min(1).max(20).optional(),
  quantidade: z.number().positive().optional(),
  precoUnitario: z.number().min(0).optional(),
  etapa: z.string().max(200).optional().nullable(),
  observacoes: z.string().optional().nullable(),
})

export const fromComposicaoSchema = z.object({
  composicaoId: z.string().uuid(),
  uf: z.string().length(2),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}$/),
  quantidade: z.number().positive().default(1),
  desonerado: z.boolean().default(false),
  etapa: z.string().max(200).optional(),
})

export const listLevantamentosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateLevantamentoInput = z.infer<typeof createLevantamentoSchema>
export type UpdateLevantamentoInput = z.infer<typeof updateLevantamentoSchema>
export type CreateItemInput = z.infer<typeof createItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>
export type FromComposicaoInput = z.infer<typeof fromComposicaoSchema>
