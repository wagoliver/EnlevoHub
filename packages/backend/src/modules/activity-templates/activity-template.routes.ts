import { FastifyInstance } from 'fastify'
import { createAuthMiddleware } from '../../core/auth/auth.middleware'
import { JWTService } from '../../core/auth/jwt.service'
import { hasPermission } from '../../core/rbac/permissions'
import { ActivityTemplateService } from './activity-template.service'
import {
  createActivityTemplateSchema,
  updateActivityTemplateSchema,
  listActivityTemplatesQuerySchema,
  previewScheduleSchema,
  cloneActivityTemplateSchema,
} from './activity-template.schemas'

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

export async function activityTemplateRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authMiddleware = createAuthMiddleware(jwtService)
  const service = new ActivityTemplateService(fastify.prisma)

  const getTenantId = (request: any): string => request.user.tenantId

  // List templates
  fastify.get('/', {
    preHandler: [authMiddleware, requirePermission('activities:view')],
    schema: {
      description: 'List activity templates',
      tags: ['activity-templates'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
          search: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const query = listActivityTemplatesQuerySchema.parse(request.query)
      const result = await service.list(getTenantId(request), query)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Get template by ID
  fastify.get('/:id', {
    preHandler: [authMiddleware, requirePermission('activities:view')],
    schema: {
      description: 'Get activity template details',
      tags: ['activity-templates'],
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
      const template = await service.getById(getTenantId(request), id)
      return reply.send(template)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Create template
  fastify.post('/', {
    preHandler: [authMiddleware, requirePermission('activities:create')],
    schema: {
      description: 'Create an activity template',
      tags: ['activity-templates'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const body = createActivityTemplateSchema.parse(request.body)
      const template = await service.create(getTenantId(request), body)
      return reply.status(201).send(template)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Update template
  fastify.patch('/:id', {
    preHandler: [authMiddleware, requirePermission('activities:edit')],
    schema: {
      description: 'Update an activity template',
      tags: ['activity-templates'],
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
      const body = updateActivityTemplateSchema.parse(request.body)
      const template = await service.update(getTenantId(request), id, body)
      return reply.send(template)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Delete template
  fastify.delete('/:id', {
    preHandler: [authMiddleware, requirePermission('activities:delete')],
    schema: {
      description: 'Delete an activity template',
      tags: ['activity-templates'],
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

  // Clone template
  fastify.post('/:id/clone', {
    preHandler: [authMiddleware, requirePermission('activities:create')],
    schema: {
      description: 'Clone an activity template',
      tags: ['activity-templates'],
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
      const body = cloneActivityTemplateSchema.parse(request.body)
      const template = await service.clone(getTenantId(request), id, body)
      return reply.status(201).send(template)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Preview schedule from template
  fastify.post('/:id/preview-schedule', {
    preHandler: [authMiddleware, requirePermission('activities:view')],
    schema: {
      description: 'Preview schedule calculated from a template',
      tags: ['activity-templates'],
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
      const body = previewScheduleSchema.parse(request.body)
      const result = await service.previewSchedule(getTenantId(request), id, body)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })
}
