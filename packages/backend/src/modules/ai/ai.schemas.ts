import { z } from 'zod'

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
})

export const generateActivitiesSchema = z.object({
  description: z.string().min(10).max(2000),
  detailLevel: z.enum(['resumido', 'padrao', 'detalhado']).optional().default('padrao'),
})

export const generatePhaseSchema = z.object({
  phaseName: z.string().min(2).max(200),
  context: z.string().max(500).optional(),
})
