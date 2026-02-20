import { FastifyInstance } from 'fastify'
import { createAuthMiddleware } from '../../core/auth/auth.middleware'
import { JWTService } from '../../core/auth/jwt.service'
import { AIService } from './ai.service'
import { chatMessageSchema, generateActivitiesSchema, generatePhaseSchema } from './ai.schemas'

export async function aiRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authMiddleware = createAuthMiddleware(jwtService)
  const service = new AIService()

  // Garante que o modelo está baixado ao registrar as rotas
  service.ensureModel().catch(() => {})

  // Health check da IA
  fastify.get('/health', {
    schema: {
      description: 'Verifica se o serviço de IA está disponível',
      tags: ['ai'],
    },
  }, async (_request, reply) => {
    const healthy = await service.checkHealth()
    if (healthy) {
      return reply.send({ status: 'ok', model: process.env.AI_MODEL || 'qwen3:1.7b' })
    }
    return reply.status(503).send({ status: 'unavailable', message: 'Serviço de IA indisponível' })
  })

  // Chat FAQ
  fastify.post('/chat', {
    preHandler: [authMiddleware],
    schema: {
      description: 'Chat com assistente IA do EnlevoHub',
      tags: ['ai'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { message, history } = chatMessageSchema.parse(request.body)
      const response = await service.chat(message, history)
      return reply.send({ response })
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Gerar atividades com IA
  fastify.post('/generate-activities', {
    preHandler: [authMiddleware],
    schema: {
      description: 'Gera cronograma de atividades usando IA',
      tags: ['ai'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { description, detailLevel } = generateActivitiesSchema.parse(request.body)
      const result = await service.generateActivities(description, detailLevel)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Gerar etapas/atividades para UMA fase
  fastify.post('/generate-phase', {
    preHandler: [authMiddleware],
    schema: {
      description: 'Gera etapas e atividades para uma fase específica usando IA',
      tags: ['ai'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { phaseName, context } = generatePhaseSchema.parse(request.body)
      const result = await service.generatePhase(phaseName, context)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })
}
