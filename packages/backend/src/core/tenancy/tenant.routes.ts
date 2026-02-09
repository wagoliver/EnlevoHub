import { FastifyInstance } from 'fastify'
import { TenantService } from './tenant.service'
import { createAuthMiddleware } from '../auth/auth.middleware'
import { JWTService } from '../auth/jwt.service'
import { getTenantId } from './tenant.middleware'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  maxProjects: z.number().optional(),
  maxUsers: z.number().optional(),
  features: z.object({
    projects: z.boolean().optional(),
    financial: z.boolean().optional(),
    units: z.boolean().optional(),
    contracts: z.boolean().optional(),
    suppliers: z.boolean().optional(),
    contractors: z.boolean().optional(),
    brokers: z.boolean().optional()
  }).optional(),
  customization: z.object({
    logo: z.string().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional()
  }).optional()
})

export async function tenantRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authMiddleware = createAuthMiddleware(jwtService)
  const tenantService = new TenantService(fastify.prisma)

  // Get current tenant info
  fastify.get('/tenant', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get current tenant information',
      tags: ['tenant'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            document: { type: 'string' },
            plan: { type: 'string' },
            settings: { type: 'object' },
            createdAt: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const tenantId = getTenantId(request)
      const tenant = await tenantService.getTenant(tenantId)
      return reply.send(tenant)
    } catch (error) {
      if (error instanceof Error) {
        return (reply as any).status(404).send({
          error: 'Not found',
          message: error.message
        })
      }
      throw error
    }
  })

  // Get tenant settings
  fastify.get('/tenant/settings', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get tenant settings',
      tags: ['tenant'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object'
        }
      }
    }
  }, async (request, reply) => {
    try {
      const tenantId = getTenantId(request)
      const settings = await tenantService.getSettings(tenantId)
      return reply.send(settings)
    } catch (error) {
      if (error instanceof Error) {
        return (reply as any).status(404).send({
          error: 'Not found',
          message: error.message
        })
      }
      throw error
    }
  })

  // Update tenant settings
  fastify.patch('/tenant/settings', {
    preHandler: authMiddleware,
    schema: {
      description: 'Update tenant settings (Admin only)',
      tags: ['tenant'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          maxProjects: { type: 'number' },
          maxUsers: { type: 'number' },
          features: {
            type: 'object',
            properties: {
              projects: { type: 'boolean' },
              financial: { type: 'boolean' },
              units: { type: 'boolean' },
              contracts: { type: 'boolean' },
              suppliers: { type: 'boolean' },
              contractors: { type: 'boolean' },
              brokers: { type: 'boolean' }
            }
          },
          customization: {
            type: 'object',
            properties: {
              logo: { type: 'string' },
              primaryColor: { type: 'string' },
              secondaryColor: { type: 'string' }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            settings: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Check if user is admin
      if ((request as any).user.role !== 'ADMIN') {
        return (reply as any).status(403).send({
          error: 'Forbidden',
          message: 'Only admins can update tenant settings'
        })
      }

      const tenantId = getTenantId(request)
      const body = updateSettingsSchema.parse(request.body)
      const tenant = await tenantService.updateSettings(tenantId, body)
      return reply.send(tenant)
    } catch (error) {
      if (error instanceof Error) {
        return (reply as any).status(400).send({
          error: 'Bad request',
          message: error.message
        })
      }
      throw error
    }
  })

  // Get tenant statistics
  fastify.get('/tenant/statistics', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get tenant statistics',
      tags: ['tenant'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            projects: { type: 'number' },
            users: { type: 'number' },
            suppliers: { type: 'number' },
            contractors: { type: 'number' },
            units: { type: 'number' },
            sales: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const tenantId = getTenantId(request)
      const stats = await tenantService.getStatistics(tenantId)
      return reply.send(stats)
    } catch (error) {
      if (error instanceof Error) {
        return (reply as any).status(500).send({
          error: 'Internal server error',
          message: error.message
        })
      }
      throw error
    }
  })

  // Get tenant users
  fastify.get('/tenant/users', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get all users in tenant',
      tags: ['tenant'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              createdAt: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const tenantId = getTenantId(request)
      const users = await tenantService.getUsers(tenantId)
      return reply.send(users)
    } catch (error) {
      if (error instanceof Error) {
        return (reply as any).status(500).send({
          error: 'Internal server error',
          message: error.message
        })
      }
      throw error
    }
  })
}
