import { FastifyInstance } from 'fastify'
import { createAuthMiddleware } from '../../core/auth/auth.middleware'
import { JWTService } from '../../core/auth/jwt.service'
import { hasPermission } from '../../core/rbac/permissions'
import { LevantamentoService } from './levantamento.service'
import { ServicoTemplateService } from './servico-template.service'
import { ActivityServiceLinkService } from './activity-service-link.service'
import {
  createLevantamentoSchema,
  updateLevantamentoSchema,
  createAmbienteSchema,
  updateAmbienteSchema,
  createItemSchema,
  updateItemSchema,
  fromComposicaoSchema,
  batchCreateItemsSchema,
  listLevantamentosSchema,
  createTemplateSchema,
  updateTemplateSchema,
  createAmbienteTagSchema,
  updateAmbienteTagSchema,
  createLinkSchema,
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
  const templateService = new ServicoTemplateService(fastify.prisma)
  const linkService = new ActivityServiceLinkService(fastify.prisma)

  const getTenantId = (request: any): string => request.user.tenantId

  // ---- Workflow status check (tenant-level) ----

  fastify.get('/levantamento-item-count', {
    preHandler: [authMiddleware, requirePermission('projects:view')],
  }, async (request, reply) => {
    try {
      const count = await service.countItemsForTenant(getTenantId(request))
      return reply.send({ count })
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // ---- Levantamento por Planta (get or create) ----

  fastify.get('/:projectId/floor-plans/:floorPlanId/levantamento', {
    preHandler: [authMiddleware, requirePermission('projects:view')],
  }, async (request, reply) => {
    try {
      const { projectId, floorPlanId } = request.params as { projectId: string; floorPlanId: string }
      const result = await service.getOrCreateForFloorPlan(getTenantId(request), projectId, floorPlanId)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // ---- Levantamento por Projeto (get or create, project-level) ----

  fastify.get('/:projectId/levantamento', {
    preHandler: [authMiddleware, requirePermission('projects:view')],
  }, async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string }
      const result = await service.getOrCreateForProject(getTenantId(request), projectId)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

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

  // ---- Ambientes ----

  fastify.get('/:projectId/levantamentos/:levantamentoId/ambientes', {
    preHandler: [authMiddleware, requirePermission('projects:view')],
  }, async (request, reply) => {
    try {
      const { projectId, levantamentoId } = request.params as { projectId: string; levantamentoId: string }
      const result = await service.listAmbientes(getTenantId(request), projectId, levantamentoId)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.post('/:projectId/levantamentos/:levantamentoId/ambientes', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { projectId, levantamentoId } = request.params as { projectId: string; levantamentoId: string }
      const data = createAmbienteSchema.parse(request.body)
      const result = await service.createAmbiente(getTenantId(request), projectId, levantamentoId, data)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.patch('/:projectId/levantamentos/:levantamentoId/ambientes/:ambienteId', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { projectId, levantamentoId, ambienteId } = request.params as { projectId: string; levantamentoId: string; ambienteId: string }
      const data = updateAmbienteSchema.parse(request.body)
      const result = await service.updateAmbiente(getTenantId(request), projectId, levantamentoId, ambienteId, data)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.delete('/:projectId/levantamentos/:levantamentoId/ambientes/:ambienteId', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { projectId, levantamentoId, ambienteId } = request.params as { projectId: string; levantamentoId: string; ambienteId: string }
      const result = await service.deleteAmbiente(getTenantId(request), projectId, levantamentoId, ambienteId)
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

  // ---- Batch Items ----

  fastify.post('/:projectId/levantamentos/:levantamentoId/itens/batch', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { projectId, levantamentoId } = request.params as { projectId: string; levantamentoId: string }
      const data = batchCreateItemsSchema.parse(request.body)
      const result = await service.batchCreateItems(getTenantId(request), projectId, levantamentoId, data)
      return reply.status(201).send(result)
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

  // ---- Servico Templates ----

  fastify.get('/servico-templates', {
    preHandler: [authMiddleware, requirePermission('projects:view')],
  }, async (request, reply) => {
    try {
      const tenantId = getTenantId(request)
      // Auto-seed defaults on first access
      await templateService.seedDefaults(tenantId)
      const result = await templateService.list(tenantId)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.get('/servico-templates/stage-suggestions', {
    preHandler: [authMiddleware, requirePermission('projects:view')],
  }, async (request, reply) => {
    try {
      const result = await templateService.getStageSuggestions(getTenantId(request))
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.post('/servico-templates', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const data = createTemplateSchema.parse(request.body)
      const result = await templateService.create(getTenantId(request), data)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.patch('/servico-templates/:id', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = updateTemplateSchema.parse(request.body)
      const result = await templateService.update(getTenantId(request), id, data)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.delete('/servico-templates/:id', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await templateService.delete(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.post('/servico-templates/reset', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const result = await templateService.resetDefaults(getTenantId(request))
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // ---- Activity-Service Links ----

  fastify.post('/:projectId/activity-service-links/auto', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string }
      const result = await linkService.autoLink(getTenantId(request), projectId)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.get('/:projectId/templates-by-activity', {
    preHandler: [authMiddleware, requirePermission('projects:view')],
  }, async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string }
      const result = await linkService.getTemplatesForProject(getTenantId(request), projectId)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.post('/:projectId/activity-service-links', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const data = createLinkSchema.parse(request.body)
      const result = await linkService.link(data.projectActivityId, data.servicoTemplateId)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.delete('/:projectId/activity-service-links/:id', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await linkService.unlink(id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // ---- Ambiente Tags ----

  fastify.get('/ambiente-tags', {
    preHandler: [authMiddleware, requirePermission('projects:view')],
  }, async (request, reply) => {
    try {
      const tenantId = getTenantId(request)
      // Auto-seed defaults on first access
      await templateService.seedTags(tenantId)
      const result = await templateService.listTags(tenantId)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.post('/ambiente-tags', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const data = createAmbienteTagSchema.parse(request.body)
      const result = await templateService.createTag(getTenantId(request), data)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.patch('/ambiente-tags/:id', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = updateAmbienteTagSchema.parse(request.body)
      const result = await templateService.updateTag(getTenantId(request), id, data)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.delete('/ambiente-tags/:id', {
    preHandler: [authMiddleware, requirePermission('projects:edit')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await templateService.deleteTag(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })
}
