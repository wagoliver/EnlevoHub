import { z } from 'zod'

export const searchInsumosSchema = z.object({
  search: z.string().optional(),
  tipo: z.enum(['MATERIAL', 'MAO_DE_OBRA', 'EQUIPAMENTO', 'SERVICO']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const searchComposicoesSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const calculateComposicaoSchema = z.object({
  uf: z.string().length(2),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}$/, 'Formato: YYYY-MM'),
  quantidade: z.coerce.number().positive().default(1),
  desonerado: z.coerce.boolean().default(false),
})

export const batchResolveSchema = z.object({
  codes: z.string().min(1, 'Informe pelo menos um código'),
  uf: z.string().length(2),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}$/, 'Formato: YYYY-MM'),
  desonerado: z.coerce.boolean().default(false),
})

export type SearchInsumosQuery = z.infer<typeof searchInsumosSchema>
export type SearchComposicoesQuery = z.infer<typeof searchComposicoesSchema>
export type CalculateComposicaoQuery = z.infer<typeof calculateComposicaoSchema>
export type BatchResolveQuery = z.infer<typeof batchResolveSchema>
