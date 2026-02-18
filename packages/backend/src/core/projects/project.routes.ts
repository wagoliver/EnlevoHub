import { FastifyInstance } from 'fastify'
import { createAuthMiddleware } from '../auth/auth.middleware'
import { JWTService } from '../auth/jwt.service'
import { hasPermission } from '../rbac/permissions'
import { getContractorScope } from '../rbac/contractor-filter'
import { ProjectService } from './project.service'
import { EvolutionService } from './evolution.service'
import { UnitService } from './unit.service'
import { FloorPlanService } from './floor-plan.service'
import { BlockService } from './block.service'
import { UploadService } from './upload.service'
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  createEvolutionSchema,
  updateEvolutionSchema,
  createUnitSchema,
  updateUnitSchema,
  listUnitsQuerySchema,
  createFloorPlanSchema,
  updateFloorPlanSchema,
  createBlockSchema,
  updateBlockSchema,
  bulkGenerateSchema,
  bulkDeleteUnitsSchema,
} from './project.schemas'
import * as path from 'path'
import * as fs from 'fs'

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

export async function projectRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authMiddleware = createAuthMiddleware(jwtService)
  const projectService = new ProjectService(fastify.prisma)
  const evolutionService = new EvolutionService(fastify.prisma)
  const unitService = new UnitService(fastify.prisma)
  const floorPlanService = new FloorPlanService(fastify.prisma)
  const blockService = new BlockService(fastify.prisma)
  const uploadService = new UploadService()

  // Helper to get tenantId from request
  const getTenantId = (request: any): string => request.user.tenantId
  const getUserId = (request: any): string => request.user.userId

  // ==================== PROJECT CRUD ====================

  // List projects
  fastify.get('/', {
    preHandler: [authMiddleware, requirePermission('projects:view')],
    schema: {
      description: 'List projects with pagination and filters',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
          search: { type: 'string' },
          status: { type: 'string', enum: ['PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'] },
          sortBy: { type: 'string', enum: ['name', 'createdAt', 'updatedAt', 'status', 'budget'], default: 'createdAt' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const query = listProjectsQuerySchema.parse(request.query)
      const scope = await getContractorScope(request, fastify.prisma)
      const result = await projectService.list(getTenantId(request), query, scope)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Create project
  fastify.post('/', {
    preHandler: [authMiddleware, requirePermission('projects:create')],
    schema: {
      description: 'Create a new project',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'address'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              number: { type: 'string' },
              complement: { type: 'string' },
              neighborhood: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              zipCode: { type: 'string' },
            },
          },
          status: { type: 'string', enum: ['PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'] },
          startDate: { type: 'string', format: 'date-time' },
          expectedEndDate: { type: 'string', format: 'date-time' },
          budget: { type: 'number' },
          metadata: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const body = createProjectSchema.parse(request.body)
      const project = await projectService.create(getTenantId(request), body)
      return reply.status(201).send(project)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Dashboard stats
  fastify.get('/dashboard/stats', {
    preHandler: [authMiddleware, requirePermission('projects:view')],
    schema: {
      description: 'Get dashboard statistics',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const scope = await getContractorScope(request, fastify.prisma)
      const stats = await projectService.getDashboardStats(getTenantId(request), scope)
      return reply.send(stats)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Get project by ID
  fastify.get('/:id', {
    preHandler: [authMiddleware, requirePermission('projects:view')],
    schema: {
      description: 'Get project details',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const project = await projectService.getById(getTenantId(request), id)
      return reply.send(project)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Update project
  fastify.patch('/:id', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
    schema: {
      description: 'Update a project',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          address: { type: 'object' },
          status: { type: 'string', enum: ['PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'] },
          startDate: { type: 'string', format: 'date-time', nullable: true },
          expectedEndDate: { type: 'string', format: 'date-time', nullable: true },
          actualEndDate: { type: 'string', format: 'date-time', nullable: true },
          budget: { type: 'number' },
          metadata: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = updateProjectSchema.parse(request.body)
      const project = await projectService.update(getTenantId(request), id, body)
      return reply.send(project)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Delete project
  fastify.delete('/:id', {
    preHandler: [authMiddleware, requirePermission('projects:delete')],
    schema: {
      description: 'Delete a project',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await projectService.delete(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Get project statistics
  fastify.get('/:id/statistics', {
    preHandler: [authMiddleware, requirePermission('projects:view')],
    schema: {
      description: 'Get project statistics',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const stats = await projectService.getStatistics(getTenantId(request), id)
      return reply.send(stats)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // ==================== EVOLUTION CRUD ====================

  // List evolutions
  fastify.get('/:id/evolutions', {
    preHandler: [authMiddleware, requirePermission('projects:view')],
    schema: {
      description: 'List project evolutions',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const evolutions = await evolutionService.listByProject(getTenantId(request), id)
      return reply.send(evolutions)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Create evolution
  fastify.post('/:id/evolutions', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
    schema: {
      description: 'Create a project evolution entry',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['percentage', 'phase'],
        properties: {
          date: { type: 'string', format: 'date-time' },
          percentage: { type: 'number' },
          phase: { type: 'string' },
          notes: { type: 'string' },
          photos: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = createEvolutionSchema.parse(request.body)
      const evolution = await evolutionService.create(
        getTenantId(request),
        id,
        getUserId(request),
        body
      )
      return reply.status(201).send(evolution)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Update evolution
  fastify.patch('/:id/evolutions/:evoId', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
    schema: {
      description: 'Update a project evolution entry',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'evoId'],
        properties: {
          id: { type: 'string' },
          evoId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date-time' },
          percentage: { type: 'number' },
          phase: { type: 'string' },
          notes: { type: 'string' },
          photos: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id, evoId } = request.params as { id: string; evoId: string }
      const body = updateEvolutionSchema.parse(request.body)
      const evolution = await evolutionService.update(getTenantId(request), id, evoId, body)
      return reply.send(evolution)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Delete evolution
  fastify.delete('/:id/evolutions/:evoId', {
    preHandler: [authMiddleware, requirePermission('projects:delete')],
    schema: {
      description: 'Delete a project evolution entry',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'evoId'],
        properties: {
          id: { type: 'string' },
          evoId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id, evoId } = request.params as { id: string; evoId: string }
      const result = await evolutionService.delete(getTenantId(request), id, evoId)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // ==================== UPLOAD ====================

  // Upload photos
  fastify.post('/:id/evolutions/upload', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
    schema: {
      description: 'Upload photos for project evolution',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      // Verify project belongs to tenant
      const project = await fastify.prisma.project.findFirst({
        where: { id, tenantId: getTenantId(request) },
      })

      if (!project) {
        return reply.status(404).send({ error: 'Not Found', message: 'Projeto não encontrado' })
      }

      const parts = request.parts()
      const buffers: Buffer[] = []

      for await (const part of parts) {
        if (part.type === 'file') {
          buffers.push(await part.toBuffer())
        }
      }

      if (buffers.length === 0) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Nenhum arquivo enviado' })
      }

      const urls: string[] = []
      for (const buf of buffers) {
        const url = await uploadService.saveBuffer(id, buf)
        urls.push(url)
      }
      return reply.send({ urls })
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Upload failed', message: error.message })
      }
      throw error
    }
  })

  // Serve uploaded files
  fastify.get('/uploads/:projectId/:filename', {
    schema: {
      description: 'Serve uploaded project files',
      tags: ['projects'],
      params: {
        type: 'object',
        required: ['projectId', 'filename'],
        properties: {
          projectId: { type: 'string' },
          filename: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { projectId, filename } = request.params as { projectId: string; filename: string }

    // Sanitize filename to prevent directory traversal
    const safeName = path.basename(filename)
    const filePath = path.join(uploadService.getStorageDir(), projectId, safeName)

    if (!fs.existsSync(filePath)) {
      fastify.log.warn({ filePath, storageDir: uploadService.getStorageDir(), projectId, filename: safeName }, '[UPLOAD] File not found')
      return reply.status(404).send({ error: 'Not Found', message: 'Arquivo não encontrado' })
    }

    const ext = path.extname(safeName).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }

    const contentType = mimeTypes[ext] || 'application/octet-stream'
    const stream = fs.createReadStream(filePath)

    return reply.type(contentType).send(stream)
  })

  // ==================== UNITS CRUD ====================

  // List units
  fastify.get('/:id/units', {
    preHandler: [authMiddleware, requirePermission('units:view')],
    schema: {
      description: 'List project units with pagination and filters',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 50 },
          search: { type: 'string' },
          status: { type: 'string', enum: ['AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED'] },
          type: { type: 'string', enum: ['APARTMENT', 'HOUSE', 'COMMERCIAL', 'LAND'] },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const query = listUnitsQuerySchema.parse(request.query)
      const result = await unitService.list(getTenantId(request), id, query)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Get unit by ID
  fastify.get('/:id/units/:unitId', {
    preHandler: [authMiddleware, requirePermission('units:view')],
    schema: {
      description: 'Get unit details',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'unitId'],
        properties: {
          id: { type: 'string' },
          unitId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id, unitId } = request.params as { id: string; unitId: string }
      const unit = await unitService.getById(getTenantId(request), id, unitId)
      return reply.send(unit)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Create unit
  fastify.post('/:id/units', {
    preHandler: [authMiddleware, requirePermission('units:create')],
    schema: {
      description: 'Create a new unit in the project',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['code', 'type', 'area', 'price'],
        properties: {
          code: { type: 'string' },
          type: { type: 'string', enum: ['APARTMENT', 'HOUSE', 'COMMERCIAL', 'LAND'] },
          floor: { type: 'integer' },
          area: { type: 'number' },
          bedrooms: { type: 'integer' },
          bathrooms: { type: 'integer' },
          price: { type: 'number' },
          status: { type: 'string', enum: ['AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED'] },
          metadata: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = createUnitSchema.parse(request.body)
      const unit = await unitService.create(getTenantId(request), id, body)
      return reply.status(201).send(unit)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Update unit
  fastify.patch('/:id/units/:unitId', {
    preHandler: [authMiddleware, requirePermission('units:edit')],
    schema: {
      description: 'Update a unit',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'unitId'],
        properties: {
          id: { type: 'string' },
          unitId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          type: { type: 'string', enum: ['APARTMENT', 'HOUSE', 'COMMERCIAL', 'LAND'] },
          floor: { type: 'integer' },
          area: { type: 'number' },
          bedrooms: { type: 'integer' },
          bathrooms: { type: 'integer' },
          price: { type: 'number' },
          status: { type: 'string', enum: ['AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED'] },
          metadata: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id, unitId } = request.params as { id: string; unitId: string }
      const body = updateUnitSchema.parse(request.body)
      const unit = await unitService.update(getTenantId(request), id, unitId, body)
      return reply.send(unit)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Delete unit
  fastify.delete('/:id/units/:unitId', {
    preHandler: [authMiddleware, requirePermission('units:delete')],
    schema: {
      description: 'Delete a unit',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'unitId'],
        properties: {
          id: { type: 'string' },
          unitId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id, unitId } = request.params as { id: string; unitId: string }
      const result = await unitService.delete(getTenantId(request), id, unitId)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Preview bulk generate
  fastify.post('/:id/units/preview-generate', {
    preHandler: [authMiddleware, requirePermission('units:create')],
    schema: {
      description: 'Preview bulk unit generation (does not persist)',
      tags: ['projects'],
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
      const body = bulkGenerateSchema.parse(request.body)
      const result = await unitService.previewGenerate(getTenantId(request), id, body)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Bulk generate units
  fastify.post('/:id/units/bulk-generate', {
    preHandler: [authMiddleware, requirePermission('units:create')],
    schema: {
      description: 'Generate units in bulk (atomic transaction)',
      tags: ['projects'],
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
      const body = bulkGenerateSchema.parse(request.body)
      const result = await unitService.bulkGenerate(getTenantId(request), id, body)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Bulk delete units
  fastify.post('/:id/units/bulk-delete', {
    preHandler: [authMiddleware, requirePermission('units:delete')],
    schema: {
      description: 'Delete multiple units at once',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['unitIds'],
        properties: {
          unitIds: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = bulkDeleteUnitsSchema.parse(request.body)
      const result = await unitService.bulkDelete(getTenantId(request), id, body)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // ==================== FLOOR PLANS CRUD ====================

  // List floor plans
  fastify.get('/:id/floor-plans', {
    preHandler: [authMiddleware, requirePermission('units:view')],
    schema: {
      description: 'List project floor plans',
      tags: ['projects'],
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
      const result = await floorPlanService.list(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Create floor plan
  fastify.post('/:id/floor-plans', {
    preHandler: [authMiddleware, requirePermission('units:create')],
    schema: {
      description: 'Create a floor plan',
      tags: ['projects'],
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
      const body = createFloorPlanSchema.parse(request.body)
      const result = await floorPlanService.create(getTenantId(request), id, body)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Update floor plan
  fastify.patch('/:id/floor-plans/:fpId', {
    preHandler: [authMiddleware, requirePermission('units:edit')],
    schema: {
      description: 'Update a floor plan',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'fpId'],
        properties: {
          id: { type: 'string' },
          fpId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id, fpId } = request.params as { id: string; fpId: string }
      const body = updateFloorPlanSchema.parse(request.body)
      const result = await floorPlanService.update(getTenantId(request), id, fpId, body)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Delete floor plan
  fastify.delete('/:id/floor-plans/:fpId', {
    preHandler: [authMiddleware, requirePermission('units:delete')],
    schema: {
      description: 'Delete a floor plan',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'fpId'],
        properties: {
          id: { type: 'string' },
          fpId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id, fpId } = request.params as { id: string; fpId: string }
      const result = await floorPlanService.delete(getTenantId(request), id, fpId)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // ==================== BLOCKS CRUD ====================

  // List blocks
  fastify.get('/:id/blocks', {
    preHandler: [authMiddleware, requirePermission('units:view')],
    schema: {
      description: 'List project blocks',
      tags: ['projects'],
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
      const result = await blockService.list(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Create block
  fastify.post('/:id/blocks', {
    preHandler: [authMiddleware, requirePermission('units:create')],
    schema: {
      description: 'Create a block',
      tags: ['projects'],
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
      const body = createBlockSchema.parse(request.body)
      const result = await blockService.create(getTenantId(request), id, body)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Update block
  fastify.patch('/:id/blocks/:blockId', {
    preHandler: [authMiddleware, requirePermission('units:edit')],
    schema: {
      description: 'Update a block',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'blockId'],
        properties: {
          id: { type: 'string' },
          blockId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id, blockId } = request.params as { id: string; blockId: string }
      const body = updateBlockSchema.parse(request.body)
      const result = await blockService.update(getTenantId(request), id, blockId, body)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Delete block
  fastify.delete('/:id/blocks/:blockId', {
    preHandler: [authMiddleware, requirePermission('units:delete')],
    schema: {
      description: 'Delete a block',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'blockId'],
        properties: {
          id: { type: 'string' },
          blockId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id, blockId } = request.params as { id: string; blockId: string }
      const result = await blockService.delete(getTenantId(request), id, blockId)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })
}
