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

export const createAmbienteSchema = z.object({
  nome: z.string().min(1).max(200),
  tipo: z.enum([
    'SALA', 'QUARTO', 'COZINHA', 'BANHEIRO', 'AREA_SERVICO',
    'VARANDA', 'GARAGEM', 'HALL', 'CORREDOR', 'AREA_COMUM', 'OUTRO',
  ]),
  comprimento: z.number().positive(),
  largura: z.number().positive(),
  peDireito: z.number().positive().default(2.80),
  qtdPortas: z.number().int().min(0).default(1),
  qtdJanelas: z.number().int().min(0).default(1),
  observacoes: z.string().optional(),
  order: z.number().int().min(0).optional(),
})

export const updateAmbienteSchema = z.object({
  nome: z.string().min(1).max(200).optional(),
  tipo: z.enum([
    'SALA', 'QUARTO', 'COZINHA', 'BANHEIRO', 'AREA_SERVICO',
    'VARANDA', 'GARAGEM', 'HALL', 'CORREDOR', 'AREA_COMUM', 'OUTRO',
  ]).optional(),
  comprimento: z.number().positive().optional(),
  largura: z.number().positive().optional(),
  peDireito: z.number().positive().optional(),
  qtdPortas: z.number().int().min(0).optional(),
  qtdJanelas: z.number().int().min(0).optional(),
  observacoes: z.string().optional().nullable(),
  order: z.number().int().min(0).optional(),
})

export const createItemSchema = z.object({
  nome: z.string().min(1).max(500),
  unidade: z.string().min(1).max(20),
  quantidade: z.number().positive(),
  precoUnitario: z.number().min(0),
  etapa: z.string().max(200).optional(),
  ambienteId: z.string().uuid().optional(),
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
  ambienteId: z.string().uuid().optional(),
})

export const batchCreateItemsSchema = z.object({
  itens: z.array(z.object({
    nome: z.string().min(1).max(500),
    unidade: z.string().min(1).max(20),
    quantidade: z.number().positive(),
    precoUnitario: z.number().min(0),
    etapa: z.string().max(200).optional(),
    ambienteId: z.string().uuid().optional(),
    observacoes: z.string().optional(),
  })).min(1).max(50),
})

export const listLevantamentosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateLevantamentoInput = z.infer<typeof createLevantamentoSchema>
export type UpdateLevantamentoInput = z.infer<typeof updateLevantamentoSchema>
export type CreateAmbienteInput = z.infer<typeof createAmbienteSchema>
export type UpdateAmbienteInput = z.infer<typeof updateAmbienteSchema>
export type CreateItemInput = z.infer<typeof createItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>
export type FromComposicaoInput = z.infer<typeof fromComposicaoSchema>
export type BatchCreateItemsInput = z.infer<typeof batchCreateItemsSchema>
