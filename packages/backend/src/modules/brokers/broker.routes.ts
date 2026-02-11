import { FastifyInstance } from 'fastify'
import { createAuthMiddleware } from '../../core/auth/auth.middleware'
import { JWTService } from '../../core/auth/jwt.service'
import { hasPermission } from '../../core/rbac/permissions'
import { BrokerService } from './broker.service'
import {
  createBrokerSchema,
  updateBrokerSchema,
  listBrokersQuerySchema,
} from './broker.schemas'

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

export async function brokerRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authMiddleware = createAuthMiddleware(jwtService)
  const service = new BrokerService(fastify.prisma)

  const getTenantId = (request: any): string => request.user.tenantId

  // List brokers
  fastify.get('/', {
    preHandler: [authMiddleware, requirePermission('brokers:view')],
    schema: {
      description: 'List brokers with pagination and filters',
      tags: ['brokers'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
          search: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const query = listBrokersQuerySchema.parse(request.query)
      const result = await service.list(getTenantId(request), query)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Get broker by ID
  fastify.get('/:id', {
    preHandler: [authMiddleware, requirePermission('brokers:view')],
    schema: {
      description: 'Get broker details',
      tags: ['brokers'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const broker = await service.getById(getTenantId(request), id)
      return reply.send(broker)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Create broker
  fastify.post('/', {
    preHandler: [authMiddleware, requirePermission('brokers:create')],
    schema: {
      description: 'Create a new broker',
      tags: ['brokers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const body = createBrokerSchema.parse(request.body)
      const broker = await service.create(getTenantId(request), body)
      return reply.status(201).send(broker)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Update broker
  fastify.patch('/:id', {
    preHandler: [authMiddleware, requirePermission('brokers:edit')],
    schema: {
      description: 'Update a broker',
      tags: ['brokers'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = updateBrokerSchema.parse(request.body)
      const broker = await service.update(getTenantId(request), id, body)
      return reply.send(broker)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Delete broker
  fastify.delete('/:id', {
    preHandler: [authMiddleware, requirePermission('brokers:delete')],
    schema: {
      description: 'Delete a broker',
      tags: ['brokers'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await service.delete(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })
}
