import { FastifyInstance } from 'fastify'
import { createAuthMiddleware } from '../../core/auth/auth.middleware'
import { JWTService } from '../../core/auth/jwt.service'
import { hasPermission } from '../../core/rbac/permissions'
import { SinapiMappingService } from './sinapi-mapping.service'
import {
  createMappingSchema,
  updateMappingSchema,
  listMappingsSchema,
  suggestMappingsSchema,
} from './sinapi-mapping.schemas'

function requireAdmin() {
  return async (request: any, reply: any) => {
    const role = request.user?.role
    if (role !== 'ROOT' && role !== 'MASTER') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Apenas ROOT ou MASTER pode gerenciar mapeamentos',
      })
    }
  }
}

function requireRoot() {
  return async (request: any, reply: any) => {
    const role = request.user?.role
    if (role !== 'ROOT') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Apenas ROOT pode gerenciar mapeamentos de sistema',
      })
    }
  }
}

export async function sinapiMappingRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authMiddleware = createAuthMiddleware(jwtService)
  const service = new SinapiMappingService(fastify.prisma)

  const getTenantId = (request: any): string => request.user.tenantId

  // ---- Tenant-scoped routes ----

  // List mappings (tenant or fallback to system)
  fastify.get('/', {
    preHandler: [authMiddleware, requireAdmin()],
  }, async (request, reply) => {
    try {
      const query = listMappingsSchema.parse(request.query)
      const result = await service.list(getTenantId(request), query)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // List distinct fases
  fastify.get('/fases', {
    preHandler: [authMiddleware, requireAdmin()],
  }, async (request, reply) => {
    try {
      const result = await service.listFases(getTenantId(request))
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Suggest mappings by fase+etapa
  fastify.get('/suggest', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const { fase, etapa } = suggestMappingsSchema.parse(request.query)
      const result = await service.findByFaseEtapa(getTenantId(request), fase, etapa)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Create mapping (tenant scope)
  fastify.post('/', {
    preHandler: [authMiddleware, requireAdmin()],
  }, async (request, reply) => {
    try {
      const data = createMappingSchema.parse(request.body)
      const result = await service.create(getTenantId(request), data)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Update mapping (tenant scope)
  fastify.patch('/:id', {
    preHandler: [authMiddleware, requireAdmin()],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = updateMappingSchema.parse(request.body)
      const result = await service.update(getTenantId(request), id, data)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        const status = error.message.includes('não encontrado') ? 404 : 400
        return reply.status(status).send({ error: status === 404 ? 'Not Found' : 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Delete mapping (tenant scope)
  fastify.delete('/:id', {
    preHandler: [authMiddleware, requireAdmin()],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      await service.delete(getTenantId(request), id)
      return reply.send({ success: true })
    } catch (error) {
      if (error instanceof Error) {
        const status = error.message.includes('não encontrado') ? 404 : 400
        return reply.status(status).send({ error: status === 404 ? 'Not Found' : 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Copy system mappings to tenant
  fastify.post('/copy', {
    preHandler: [authMiddleware, requireAdmin()],
  }, async (request, reply) => {
    try {
      const count = await service.copySystemToTenant(getTenantId(request))
      return reply.send({ success: true, copied: count })
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // ---- System routes (ROOT only) ----

  fastify.post('/system', {
    preHandler: [authMiddleware, requireRoot()],
  }, async (request, reply) => {
    try {
      const data = createMappingSchema.parse(request.body)
      const result = await service.createSystem(data)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.patch('/system/:id', {
    preHandler: [authMiddleware, requireRoot()],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = updateMappingSchema.parse(request.body)
      const result = await service.updateSystem(id, data)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        const status = error.message.includes('não encontrado') ? 404 : 400
        return reply.status(status).send({ error: status === 404 ? 'Not Found' : 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.delete('/system/:id', {
    preHandler: [authMiddleware, requireRoot()],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      await service.deleteSystem(id)
      return reply.send({ success: true })
    } catch (error) {
      if (error instanceof Error) {
        const status = error.message.includes('não encontrado') ? 404 : 400
        return reply.status(status).send({ error: status === 404 ? 'Not Found' : 'Bad Request', message: error.message })
      }
      throw error
    }
  })
}
