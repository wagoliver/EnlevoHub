import { FastifyInstance } from 'fastify'
import { JWTService } from '../auth/jwt.service'
import { createAuthMiddleware } from '../auth/auth.middleware'
import { requirePermission } from '../rbac/rbac.middleware'
import { Permissions } from '../rbac/permissions'
import { UserService } from './user.service'

export async function userRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authMiddleware = createAuthMiddleware(jwtService)
  const userService = new UserService(fastify.prisma)

  // List users
  fastify.get('/', {
    preHandler: [authMiddleware, requirePermission(Permissions.USERS_VIEW)],
    schema: {
      description: 'List all users of the tenant',
      tags: ['users'],
      security: [{ bearerAuth: [] }],
    }
  }, async (request, reply) => {
    try {
      const tenantId = (request as any).user.tenantId
      const users = await userService.list(tenantId)
      return reply.send({ data: users })
    } catch (error) {
      if (error instanceof Error) {
        return (reply as any).status(400).send({ error: error.message })
      }
      throw error
    }
  })

  // Create user (internal - not contractor)
  fastify.post('/', {
    preHandler: [authMiddleware, requirePermission(Permissions.USERS_CREATE)],
    schema: {
      description: 'Create a new internal user',
      tags: ['users'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['email', 'password', 'name', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', minLength: 2 },
          role: { type: 'string', enum: ['ROOT', 'MASTER', 'ENGINEER', 'ADMIN_STAFF', 'VIEWER'] }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const tenantId = (request as any).user.tenantId
      const body = request.body as any
      const user = await userService.create(tenantId, body)
      return reply.send(user)
    } catch (error) {
      if (error instanceof Error) {
        return (reply as any).status(400).send({ error: error.message })
      }
      throw error
    }
  })

  // Update user
  fastify.patch('/:id', {
    preHandler: [authMiddleware, requirePermission(Permissions.USERS_EDIT)],
    schema: {
      description: 'Update user',
      tags: ['users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2 },
          role: { type: 'string', enum: ['ROOT', 'MASTER', 'ENGINEER', 'ADMIN_STAFF', 'VIEWER'] },
          isActive: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const tenantId = (request as any).user.tenantId
      const { id } = request.params as { id: string }
      const body = request.body as any
      const user = await userService.update(tenantId, id, body)
      return reply.send(user)
    } catch (error) {
      if (error instanceof Error) {
        return (reply as any).status(400).send({ error: error.message })
      }
      throw error
    }
  })

  // Approve user (contractor)
  fastify.post('/:id/approve', {
    preHandler: [authMiddleware, requirePermission(Permissions.USERS_EDIT)],
    schema: {
      description: 'Approve a pending user (contractor)',
      tags: ['users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      }
    }
  }, async (request, reply) => {
    try {
      const tenantId = (request as any).user.tenantId
      const { id } = request.params as { id: string }
      const user = await userService.approve(tenantId, id)
      return reply.send(user)
    } catch (error) {
      if (error instanceof Error) {
        return (reply as any).status(400).send({ error: error.message })
      }
      throw error
    }
  })

  // Reject user (contractor)
  fastify.post('/:id/reject', {
    preHandler: [authMiddleware, requirePermission(Permissions.USERS_EDIT)],
    schema: {
      description: 'Reject a pending user (contractor)',
      tags: ['users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      }
    }
  }, async (request, reply) => {
    try {
      const tenantId = (request as any).user.tenantId
      const { id } = request.params as { id: string }
      const user = await userService.reject(tenantId, id)
      return reply.send(user)
    } catch (error) {
      if (error instanceof Error) {
        return (reply as any).status(400).send({ error: error.message })
      }
      throw error
    }
  })
}
