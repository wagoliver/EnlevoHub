import { FastifyInstance } from 'fastify'
import { TenantService } from './tenant.service'
import { createAuthMiddleware } from '../auth/auth.middleware'
import { JWTService } from '../auth/jwt.service'
import { getTenantId } from './tenant.middleware'
import { EmailService } from '../email'
import { z } from 'zod'
import {
  getAvailableDrives,
  testStoragePath,
  getStorageConfig,
  saveStoragePath,
} from '../storage/storage-config'

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
  }).optional(),
  smtp: z.object({
    host: z.string().min(1),
    port: z.number().min(1).max(65535),
    secure: z.boolean(),
    user: z.string().min(1),
    password: z.string().min(1),
    fromName: z.string().min(1),
    fromEmail: z.string().email(),
  }).optional()
})

const testEmailSchema = z.object({
  to: z.string().email('Email inválido'),
})

export async function tenantRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authMiddleware = createAuthMiddleware(jwtService)
  const tenantService = new TenantService(fastify.prisma)
  const emailService = new EmailService(fastify.prisma)

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
          },
          smtp: {
            type: 'object',
            properties: {
              host: { type: 'string' },
              port: { type: 'number' },
              secure: { type: 'boolean' },
              user: { type: 'string' },
              password: { type: 'string' },
              fromName: { type: 'string' },
              fromEmail: { type: 'string' }
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
      if ((request as any).user.role !== 'ROOT') {
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

  // Send test email (ROOT only)
  fastify.post('/tenant/settings/test-email', {
    preHandler: authMiddleware,
    schema: {
      description: 'Send a test email to verify SMTP settings (ROOT only)',
      tags: ['tenant'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['to'],
        properties: {
          to: { type: 'string', format: 'email' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      if ((request as any).user.role !== 'ROOT') {
        return (reply as any).status(403).send({
          error: 'Forbidden',
          message: 'Apenas ROOT pode enviar email de teste'
        })
      }

      const tenantId = getTenantId(request)
      const body = testEmailSchema.parse(request.body)

      const smtp = await emailService.getSmtpSettings(tenantId)
      if (!smtp) {
        return (reply as any).status(400).send({
          error: 'SMTP não configurado',
          message: 'Configure as credenciais SMTP antes de enviar um email de teste'
        })
      }

      const tenant = await tenantService.getTenant(tenantId)
      await emailService.sendTestEmail(body.to, tenant.name, smtp)

      return reply.send({ message: 'Email de teste enviado com sucesso' })
    } catch (error) {
      if (error instanceof Error) {
        return (reply as any).status(400).send({
          error: 'Falha ao enviar email',
          message: error.message
        })
      }
      throw error
    }
  })

  // Get available drives (ROOT only)
  fastify.get('/tenant/settings/drives', {
    preHandler: authMiddleware,
    schema: {
      description: 'List available drives/mount points on the server (ROOT only)',
      tags: ['tenant'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              letter: { type: 'string' },
              label: { type: 'string' },
              type: { type: 'string' },
              totalGB: { type: 'number' },
              freeGB: { type: 'number' },
              usedPercent: { type: 'number' },
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    if ((request as any).user.role !== 'ROOT') {
      return (reply as any).status(403).send({
        error: 'Forbidden',
        message: 'Apenas ROOT pode listar drives'
      })
    }

    const drives = getAvailableDrives()
    return reply.send(drives)
  })

  // Test storage path (ROOT only)
  fastify.post('/tenant/settings/storage-test', {
    preHandler: authMiddleware,
    schema: {
      description: 'Test if a storage path is writable (ROOT only)',
      tags: ['tenant'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['path'],
        properties: {
          path: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            freeGB: { type: 'number' },
          }
        }
      }
    }
  }, async (request, reply) => {
    if ((request as any).user.role !== 'ROOT') {
      return (reply as any).status(403).send({
        error: 'Forbidden',
        message: 'Apenas ROOT pode testar caminhos de storage'
      })
    }

    const { path: targetPath } = request.body as { path: string }
    if (!targetPath || targetPath.trim().length === 0) {
      return reply.send({ success: false, message: 'Caminho nao pode ser vazio' })
    }

    const result = testStoragePath(targetPath.trim())
    return reply.send(result)
  })

  // Get/Update storage config (ROOT only)
  fastify.get('/tenant/settings/storage-config', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get current storage configuration (ROOT only)',
      tags: ['tenant'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            storagePath: { type: 'string' },
            source: { type: 'string' },
          }
        }
      }
    }
  }, async (request, reply) => {
    if ((request as any).user.role !== 'ROOT') {
      return (reply as any).status(403).send({
        error: 'Forbidden',
        message: 'Apenas ROOT pode ver configuracao de storage'
      })
    }

    const config = getStorageConfig()
    return reply.send(config)
  })

  fastify.put('/tenant/settings/storage-config', {
    preHandler: authMiddleware,
    schema: {
      description: 'Save storage path configuration (ROOT only)',
      tags: ['tenant'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['storagePath'],
        properties: {
          storagePath: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            storagePath: { type: 'string' },
          }
        }
      }
    }
  }, async (request, reply) => {
    if ((request as any).user.role !== 'ROOT') {
      return (reply as any).status(403).send({
        error: 'Forbidden',
        message: 'Apenas ROOT pode alterar configuracao de storage'
      })
    }

    const { storagePath } = request.body as { storagePath: string }
    if (!storagePath || storagePath.trim().length === 0) {
      return (reply as any).status(400).send({
        error: 'Bad request',
        message: 'storagePath e obrigatorio'
      })
    }

    // Test before saving
    const testResult = testStoragePath(storagePath.trim())
    if (!testResult.success) {
      return (reply as any).status(400).send({
        error: 'Caminho invalido',
        message: testResult.message,
      })
    }

    saveStoragePath(storagePath.trim())
    return reply.send({
      message: 'Configuracao de storage salva com sucesso',
      storagePath: storagePath.trim(),
    })
  })
}
