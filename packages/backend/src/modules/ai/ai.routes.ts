import { FastifyInstance } from 'fastify'
import { createAuthMiddleware, AuthenticatedRequest } from '../../core/auth/auth.middleware'
import { JWTService } from '../../core/auth/jwt.service'
import { AIService } from './ai.service'
import { chatMessageSchema, generateActivitiesSchema, generatePhaseSchema, aiConfigSchema } from './ai.schemas'
import { saveAIConfig, getAIConfigMasked } from './ai-config'
import { logger } from '../../utils/logger'

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
    const result = await service.checkHealth()
    if (result.healthy) {
      return reply.send({ status: 'ok', model: result.model, provider: result.provider })
    }
    return reply.status(503).send({ status: 'unavailable', message: 'Serviço de IA indisponível', provider: result.provider })
  })

  // GET /config — retorna config atual (API key mascarada)
  fastify.get('/config', {
    preHandler: [authMiddleware],
    schema: {
      description: 'Retorna configuração atual do provedor de IA',
      tags: ['ai'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const user = (request as unknown as AuthenticatedRequest).user
    if (user.role !== 'ROOT' && user.role !== 'MASTER') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Apenas ROOT/MASTER pode acessar configurações de IA' })
    }
    return reply.send(getAIConfigMasked())
  })

  // PUT /config — salva config + reloadConfig
  fastify.put('/config', {
    preHandler: [authMiddleware],
    schema: {
      description: 'Salva configuração do provedor de IA',
      tags: ['ai'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const user = (request as unknown as AuthenticatedRequest).user
    if (user.role !== 'ROOT' && user.role !== 'MASTER') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Apenas ROOT/MASTER pode alterar configurações de IA' })
    }
    try {
      const config = aiConfigSchema.parse(request.body)
      saveAIConfig(config)
      service.reloadConfig()
      // Re-ensure model for Ollama providers
      service.ensureModel().catch(() => {})
      return reply.send({ success: true, message: 'Configuração salva com sucesso' })
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // POST /config/test — testa conexão com config fornecida (antes de salvar)
  fastify.post('/config/test', {
    preHandler: [authMiddleware],
    schema: {
      description: 'Testa conexão com provedor de IA',
      tags: ['ai'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const user = (request as unknown as AuthenticatedRequest).user
    if (user.role !== 'ROOT' && user.role !== 'MASTER') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Apenas ROOT/MASTER pode testar conexão de IA' })
    }
    try {
      const config = aiConfigSchema.parse(request.body)
      const result = await service.testConnection(config)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // GET /config/models — lista modelos disponíveis no provedor atual
  fastify.get('/config/models', {
    preHandler: [authMiddleware],
    schema: {
      description: 'Lista modelos disponíveis no provedor de IA',
      tags: ['ai'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const user = (request as unknown as AuthenticatedRequest).user
    if (user.role !== 'ROOT' && user.role !== 'MASTER') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Apenas ROOT/MASTER pode listar modelos de IA' })
    }
    const models = await service.listModels()
    return reply.send({ models })
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

  /**
   * Load mapped activity names from EtapaSinapiMapping for a tenant.
   * Falls back to system mappings (tenantId=null) if tenant has none.
   */
  async function loadMappedActivities(tenantId: string, fase?: string): Promise<{ byPhase: Record<string, string[]>; forPhase: string[] }> {
    try {
      const tenantCount = await fastify.prisma.etapaSinapiMapping.count({ where: { tenantId } })
      const effectiveTenantId = tenantCount === 0 ? null : tenantId

      const where: any = {
        tenantId: effectiveTenantId,
      }
      if (fase) {
        where.fase = { equals: fase, mode: 'insensitive' }
      }

      const mappings = await fastify.prisma.etapaSinapiMapping.findMany({
        where,
        select: { fase: true, atividade: true },
        orderBy: [{ fase: 'asc' }, { order: 'asc' }],
      })

      const byPhase: Record<string, string[]> = {}
      const forPhase: string[] = []
      for (const m of mappings) {
        if (!byPhase[m.fase]) byPhase[m.fase] = []
        byPhase[m.fase].push(m.atividade)
        forPhase.push(m.atividade)
      }

      return { byPhase, forPhase }
    } catch (error) {
      logger.warn({ error }, 'Falha ao carregar mapeamentos SINAPI para prompt da IA')
      return { byPhase: {}, forPhase: [] }
    }
  }

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
      const user = (request as unknown as AuthenticatedRequest).user
      const { byPhase } = await loadMappedActivities(user.tenantId)
      const result = await service.generateActivities(description, detailLevel, byPhase)
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
      const user = (request as unknown as AuthenticatedRequest).user
      const { forPhase } = await loadMappedActivities(user.tenantId, phaseName)
      const result = await service.generatePhase(phaseName, context, forPhase)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })
}
