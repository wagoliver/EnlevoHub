import { FastifyInstance } from 'fastify'
import { createAuthMiddleware } from '../../core/auth/auth.middleware'
import { JWTService } from '../../core/auth/jwt.service'
import { hasPermission } from '../../core/rbac/permissions'
import { LevantamentoService } from './levantamento.service'
import {
  createLevantamentoSchema,
  updateLevantamentoSchema,
  createItemSchema,
  updateItemSchema,
  fromComposicaoSchema,
  listLevantamentosSchema,
} from './levantamento.schemas'

function requirePermission(permission: string) {
  return async (request: any, reply: any) => {
    const userRole = request.user?.role
    if (!userRole || !hasPermission(userRole, permission as any)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Você não tem permissão para esta ação',
      })
    }
  }
}

export async function levantamentoRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authMiddleware = createAuthMiddleware(jwtService)
  const service = new LevantamentoService(fastify.prisma)

  const getTenantId = (request: any): string => request.user.tenantId

  // ---- Levantamentos CRUD ----

  fastify.get('/:projectId/levantamentos', {
    preHandler: [authMiddleware, requirePermission('projects:view')],
  }, async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string }
      const query = listLevantamentosSchema.parse(request.query)
      const result = await service.list(getTenantId(request), projectId, query.page, query.limit)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.get('/:projectId/levantamentos/:id', {
    preHandler: [authMiddleware, requirePermission('projects:view')],
  }, async (request, reply) => {
    try {
      const { projectId, id } = request.params as { projectId: string; id: string }
      const result = await service.getById(getTenantId(request), projectId, id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  fastify.post('/:projectId/levantamentos', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string }
      const data = createLevantamentoSchema.parse(request.body)
      const result = await service.create(getTenantId(request), projectId, data)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.patch('/:projectId/levantamentos/:id', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { projectId, id } = request.params as { projectId: string; id: string }
      const data = updateLevantamentoSchema.parse(request.body)
      const result = await service.update(getTenantId(request), projectId, id, data)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.delete('/:projectId/levantamentos/:id', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { projectId, id } = request.params as { projectId: string; id: string }
      const result = await service.delete(getTenantId(request), projectId, id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // ---- Items ----

  fastify.post('/:projectId/levantamentos/:levantamentoId/itens', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { projectId, levantamentoId } = request.params as { projectId: string; levantamentoId: string }
      const data = createItemSchema.parse(request.body)
      const result = await service.addItem(getTenantId(request), projectId, levantamentoId, data)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.patch('/:projectId/levantamentos/:levantamentoId/itens/:itemId', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { projectId, levantamentoId, itemId } = request.params as { projectId: string; levantamentoId: string; itemId: string }
      const data = updateItemSchema.parse(request.body)
      const result = await service.updateItem(getTenantId(request), projectId, levantamentoId, itemId, data)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.delete('/:projectId/levantamentos/:levantamentoId/itens/:itemId', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { projectId, levantamentoId, itemId } = request.params as { projectId: string; levantamentoId: string; itemId: string }
      const result = await service.deleteItem(getTenantId(request), projectId, levantamentoId, itemId)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // ---- SINAPI integration ----

  fastify.post('/:projectId/levantamentos/:levantamentoId/from-composicao', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { projectId, levantamentoId } = request.params as { projectId: string; levantamentoId: string }
      const data = fromComposicaoSchema.parse(request.body)
      const result = await service.addFromComposicao(getTenantId(request), projectId, levantamentoId, data)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // ---- Summary ----

  fastify.get('/:projectId/levantamentos/:id/resumo', {
    preHandler: [authMiddleware, requirePermission('projects:view')],
  }, async (request, reply) => {
    try {
      const { projectId, id } = request.params as { projectId: string; id: string }
      const result = await service.getResumo(getTenantId(request), projectId, id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })
}
