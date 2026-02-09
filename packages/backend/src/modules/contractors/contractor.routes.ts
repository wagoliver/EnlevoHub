import { FastifyInstance } from 'fastify'
import { createAuthMiddleware } from '../../core/auth/auth.middleware'
import { JWTService } from '../../core/auth/jwt.service'
import { hasPermission } from '../../core/rbac/permissions'
import { ContractorService } from './contractor.service'
import {
  createContractorSchema,
  updateContractorSchema,
  listContractorsQuerySchema,
  assignContractorToProjectSchema,
} from './contractor.schemas'

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

export async function contractorRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authMiddleware = createAuthMiddleware(jwtService)
  const service = new ContractorService(fastify.prisma)

  const getTenantId = (request: any): string => request.user.tenantId

  // List contractors
  fastify.get('/', {
    preHandler: [authMiddleware, requirePermission('contractors:view')],
    schema: {
      description: 'List contractors with pagination and filters',
      tags: ['contractors'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
          search: { type: 'string' },
          specialty: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const query = listContractorsQuerySchema.parse(request.query)
      const result = await service.list(getTenantId(request), query)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Get contractor by ID
  fastify.get('/:id', {
    preHandler: [authMiddleware, requirePermission('contractors:view')],
    schema: {
      description: 'Get contractor details',
      tags: ['contractors'],
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
      const contractor = await service.getById(getTenantId(request), id)
      return reply.send(contractor)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Create contractor
  fastify.post('/', {
    preHandler: [authMiddleware, requirePermission('contractors:create')],
    schema: {
      description: 'Create a new contractor',
      tags: ['contractors'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const body = createContractorSchema.parse(request.body)
      const contractor = await service.create(getTenantId(request), body)
      return reply.status(201).send(contractor)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Update contractor
  fastify.patch('/:id', {
    preHandler: [authMiddleware, requirePermission('contractors:edit')],
    schema: {
      description: 'Update a contractor',
      tags: ['contractors'],
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
      const body = updateContractorSchema.parse(request.body)
      const contractor = await service.update(getTenantId(request), id, body)
      return reply.send(contractor)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Delete contractor
  fastify.delete('/:id', {
    preHandler: [authMiddleware, requirePermission('contractors:delete')],
    schema: {
      description: 'Delete a contractor',
      tags: ['contractors'],
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

  // Assign contractor to project
  fastify.post('/:id/projects/:projectId', {
    preHandler: [authMiddleware, requirePermission('contractors:edit')],
    schema: {
      description: 'Assign contractor to a project',
      tags: ['contractors'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'projectId'],
        properties: {
          id: { type: 'string' },
          projectId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id, projectId } = request.params as { id: string; projectId: string }
      const body = assignContractorToProjectSchema.parse(request.body)
      const result = await service.assignToProject(getTenantId(request), id, projectId, body)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Unassign contractor from project
  fastify.delete('/:id/projects/:projectId', {
    preHandler: [authMiddleware, requirePermission('contractors:edit')],
    schema: {
      description: 'Remove contractor from a project',
      tags: ['contractors'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'projectId'],
        properties: {
          id: { type: 'string' },
          projectId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id, projectId } = request.params as { id: string; projectId: string }
      const result = await service.unassignFromProject(getTenantId(request), id, projectId)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // List contractors by project
  fastify.get('/project/:projectId', {
    preHandler: [authMiddleware, requirePermission('contractors:view')],
    schema: {
      description: 'List contractors assigned to a project',
      tags: ['contractors'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: { projectId: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string }
      const result = await service.listByProject(getTenantId(request), projectId)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })
}
