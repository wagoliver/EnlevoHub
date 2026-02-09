import { FastifyInstance } from 'fastify'
import { createAuthMiddleware } from '../auth/auth.middleware'
import { JWTService } from '../auth/jwt.service'
import { Roles, Permissions, getRolePermissions } from './permissions'

export async function rbacRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authMiddleware = createAuthMiddleware(jwtService)

  // Get all roles
  fastify.get('/rbac/roles', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get all available roles and their permissions',
      tags: ['rbac'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            roles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  permissions: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const roles = Object.values(Roles).map(role => ({
      name: role.name,
      description: role.description,
      permissions: role.permissions
    }))

    return reply.send({ roles })
  })

  // Get all permissions
  fastify.get('/rbac/permissions', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get all available permissions',
      tags: ['rbac'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            permissions: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const permissions = Object.values(Permissions)
    return reply.send({ permissions })
  })

  // Get current user's permissions
  fastify.get('/rbac/my-permissions', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get current user permissions',
      tags: ['rbac'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            role: { type: 'string' },
            permissions: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const userRole = (request as any).user.role as keyof typeof Roles
    const permissions = getRolePermissions(userRole)

    return reply.send({
      role: userRole,
      permissions
    })
  })

  // Check if user has permission
  fastify.post('/rbac/check-permission', {
    preHandler: authMiddleware,
    schema: {
      description: 'Check if current user has a specific permission',
      tags: ['rbac'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['permission'],
        properties: {
          permission: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            hasPermission: { type: 'boolean' },
            permission: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { permission } = request.body as { permission: string }
    const userRole = (request as any).user.role as keyof typeof Roles
    const permissions = getRolePermissions(userRole)

    return reply.send({
      hasPermission: permissions.includes(permission as any),
      permission
    })
  })
}
