import { FastifyInstance } from 'fastify'
import { createAuthMiddleware } from '../../core/auth/auth.middleware'
import { JWTService } from '../../core/auth/jwt.service'
import { hasPermission } from '../../core/rbac/permissions'
import { getContractorScope } from '../../core/rbac/contractor-filter'
import { ProjectActivityService } from './project-activity.service'
import { MeasurementService } from './measurement.service'
import { UploadService } from '../../core/projects/upload.service'
import {
  createProjectActivitySchema,
  updateProjectActivitySchema,
  createFromTemplateSchema,
  createFromTemplateWithScheduleSchema,
  createMeasurementSchema,
  createBatchMeasurementSchema,
  reviewMeasurementSchema,
  listMeasurementsQuerySchema,
} from './project-activity.schemas'

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

export async function projectActivityRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authMiddleware = createAuthMiddleware(jwtService)
  const activityService = new ProjectActivityService(fastify.prisma)
  const measurementService = new MeasurementService(fastify.prisma)
  const uploadService = new UploadService()

  const getTenantId = (request: any): string => request.user.tenantId
  const getUserId = (request: any): string => request.user.userId

  // ==================== ACTIVITIES ====================

  // List activities for project
  fastify.get('/:id/activities', {
    preHandler: [authMiddleware, requirePermission('activities:view')],
    schema: {
      description: 'List project activities',
      tags: ['activities'],
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
      const result = await activityService.listByProject(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Create activity
  fastify.post('/:id/activities', {
    preHandler: [authMiddleware, requirePermission('activities:create')],
    schema: {
      description: 'Create a project activity',
      tags: ['activities'],
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
      const body = createProjectActivitySchema.parse(request.body)
      const activity = await activityService.create(getTenantId(request), id, body)
      return reply.status(201).send(activity)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Create activities from template
  fastify.post('/:id/activities/from-template', {
    preHandler: [authMiddleware, requirePermission('activities:create')],
    schema: {
      description: 'Create project activities from a template',
      tags: ['activities'],
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
      const rawBody = request.body as any

      // If body has 'activities' array, use the new hierarchical schedule flow
      if (rawBody && rawBody.activities) {
        const body = createFromTemplateWithScheduleSchema.parse(rawBody)
        const activities = await activityService.createFromTemplateWithSchedule(
          getTenantId(request),
          id,
          body
        )
        return reply.status(201).send(activities)
      }

      // Otherwise use the legacy flat flow
      const body = createFromTemplateSchema.parse(rawBody)
      const activities = await activityService.createFromTemplate(
        getTenantId(request),
        id,
        body.templateId
      )
      return reply.status(201).send(activities)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Get activity detail
  fastify.get('/:id/activities/:actId', {
    preHandler: [authMiddleware, requirePermission('activities:view')],
    schema: {
      description: 'Get project activity details',
      tags: ['activities'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'actId'],
        properties: {
          id: { type: 'string' },
          actId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id, actId } = request.params as { id: string; actId: string }
      const activity = await activityService.getById(getTenantId(request), id, actId)
      return reply.send(activity)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Update activity
  fastify.patch('/:id/activities/:actId', {
    preHandler: [authMiddleware, requirePermission('activities:edit')],
    schema: {
      description: 'Update a project activity',
      tags: ['activities'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'actId'],
        properties: {
          id: { type: 'string' },
          actId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id, actId } = request.params as { id: string; actId: string }
      const body = updateProjectActivitySchema.parse(request.body)
      const activity = await activityService.update(getTenantId(request), id, actId, body)
      return reply.send(activity)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Delete activity
  fastify.delete('/:id/activities/:actId', {
    preHandler: [authMiddleware, requirePermission('activities:delete')],
    schema: {
      description: 'Delete a project activity',
      tags: ['activities'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'actId'],
        properties: {
          id: { type: 'string' },
          actId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id, actId } = request.params as { id: string; actId: string }
      const result = await activityService.delete(getTenantId(request), id, actId)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Get project progress
  fastify.get('/:id/progress', {
    preHandler: [authMiddleware, requirePermission('activities:view')],
    schema: {
      description: 'Get project weighted progress from activities',
      tags: ['activities'],
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
      const progress = await activityService.getProjectProgress(getTenantId(request), id)
      return reply.send(progress)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // ==================== MEASUREMENTS ====================

  // List measurements for project
  fastify.get('/:id/measurements', {
    preHandler: [authMiddleware, requirePermission('activities:view')],
    schema: {
      description: 'List project measurements',
      tags: ['measurements'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
          status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
          activityId: { type: 'string' },
          contractorId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const query = listMeasurementsQuerySchema.parse(request.query)
      const scope = await getContractorScope(request, fastify.prisma)
      const result = await measurementService.listByProject(getTenantId(request), id, query, scope)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Create measurement
  fastify.post('/:id/measurements', {
    preHandler: [authMiddleware, requirePermission('measurements:create')],
    schema: {
      description: 'Submit a new measurement',
      tags: ['measurements'],
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
      const body = createMeasurementSchema.parse(request.body)
      const scope = await getContractorScope(request, fastify.prisma)
      const measurement = await measurementService.create(
        getTenantId(request),
        id,
        getUserId(request),
        body,
        scope
      )
      return reply.status(201).send(measurement)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Create batch measurements
  fastify.post('/:id/measurements/batch', {
    preHandler: [authMiddleware, requirePermission('measurements:create')],
    schema: {
      description: 'Submit multiple measurements at once',
      tags: ['measurements'],
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
      const body = createBatchMeasurementSchema.parse(request.body)
      const scope = await getContractorScope(request, fastify.prisma)
      const result = await measurementService.createBatch(
        getTenantId(request),
        id,
        getUserId(request),
        body,
        scope
      )
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Get measurement detail
  fastify.get('/:id/measurements/:mid', {
    preHandler: [authMiddleware, requirePermission('activities:view')],
    schema: {
      description: 'Get measurement details',
      tags: ['measurements'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'mid'],
        properties: {
          id: { type: 'string' },
          mid: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id, mid } = request.params as { id: string; mid: string }
      const measurement = await measurementService.getById(getTenantId(request), id, mid)
      return reply.send(measurement)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Review measurement (approve/reject)
  fastify.patch('/:id/measurements/:mid/review', {
    preHandler: [authMiddleware, requirePermission('measurements:approve')],
    schema: {
      description: 'Approve or reject a measurement',
      tags: ['measurements'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'mid'],
        properties: {
          id: { type: 'string' },
          mid: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id, mid } = request.params as { id: string; mid: string }
      const body = reviewMeasurementSchema.parse(request.body)
      const measurement = await measurementService.review(
        getTenantId(request),
        id,
        mid,
        getUserId(request),
        body
      )
      return reply.send(measurement)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Upload measurement photos
  fastify.post('/:id/measurements/upload', {
    preHandler: [authMiddleware, requirePermission('measurements:create')],
    schema: {
      description: 'Upload photos for measurements',
      tags: ['measurements'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
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
      const files: any[] = []

      for await (const part of parts) {
        if (part.type === 'file') {
          files.push(part)
        }
      }

      if (files.length === 0) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Nenhum arquivo enviado' })
      }

      const urls = await uploadService.saveFiles(id, files)
      return reply.send({ urls })
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Upload failed', message: error.message })
      }
      throw error
    }
  })
}
