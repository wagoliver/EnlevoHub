import { FastifyInstance } from 'fastify'
import { createAuthMiddleware } from '../../core/auth/auth.middleware'
import { JWTService } from '../../core/auth/jwt.service'
import { hasPermission } from '../../core/rbac/permissions'
import { SinapiService } from './sinapi.service'
import { SinapiImportService } from './sinapi-import.service'
import { SinapiCollectorService } from './sinapi-collector.service'
import {
  searchInsumosSchema,
  searchComposicoesSchema,
  calculateComposicaoSchema,
} from './sinapi.schemas'

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

function requireAdmin() {
  return async (request: any, reply: any) => {
    const role = request.user?.role
    if (role !== 'ROOT' && role !== 'MASTER') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Apenas ROOT ou MASTER pode importar dados SINAPI',
      })
    }
  }
}

export async function sinapiRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authMiddleware = createAuthMiddleware(jwtService)
  const service = new SinapiService(fastify.prisma)
  const importService = new SinapiImportService(fastify.prisma)
  const collectorService = new SinapiCollectorService(fastify.prisma)

  const getUserId = (request: any): string => request.user.userId

  // ---- Meses Referência ----

  fastify.get('/meses-referencia', {
    preHandler: [authMiddleware],
  }, async (_request, reply) => {
    try {
      const result = await service.getMesesDisponiveis()
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // ---- Stats ----

  fastify.get('/stats', {
    preHandler: [authMiddleware],
  }, async (_request, reply) => {
    try {
      const result = await service.getStats()
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // ---- Insumos ----

  fastify.get('/insumos', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const query = searchInsumosSchema.parse(request.query)
      const result = await service.searchInsumos(query)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.get('/insumos/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await service.getInsumo(id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // ---- Composicoes ----

  fastify.get('/composicoes', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const query = searchComposicoesSchema.parse(request.query)
      const result = await service.searchComposicoes(query)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.get('/composicoes/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await service.getComposicao(id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  fastify.get('/composicoes/:id/calculate', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const query = calculateComposicaoSchema.parse(request.query)
      const result = await service.calculateComposicao(id, query)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // ---- Import (ROOT/MASTER only) ----

  fastify.post('/import/insumos', {
    preHandler: [authMiddleware, requireAdmin()],
    schema: { consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Nenhum arquivo enviado' })
      }
      const buffer = await data.toBuffer()
      const result = await importService.importInsumos(getUserId(request), data.filename, buffer)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.post('/import/composicoes', {
    preHandler: [authMiddleware, requireAdmin()],
    schema: { consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Nenhum arquivo enviado' })
      }
      const buffer = await data.toBuffer()
      const result = await importService.importComposicoes(getUserId(request), data.filename, buffer)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.post('/import/precos', {
    preHandler: [authMiddleware, requireAdmin()],
    schema: { consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Nenhum arquivo enviado' })
      }
      const buffer = await data.toBuffer()
      const result = await importService.importPrecos(getUserId(request), data.filename, buffer)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // ---- Upload ZIP (ROOT/MASTER only) ----

  fastify.post('/collect-from-zip', {
    preHandler: [authMiddleware, requireAdmin()],
    schema: { consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    // Extend timeout — processing XLSX takes several minutes
    request.raw.setTimeout(600_000) // 10 min

    try {
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Nenhum arquivo enviado' })
      }

      const fileName = data.filename || ''
      if (!fileName.toLowerCase().endsWith('.zip')) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Envie um arquivo .zip do SINAPI' })
      }

      const buffer = await data.toBuffer()
      if (buffer.length < 1000) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Arquivo muito pequeno' })
      }

      // Hijack response for SSE streaming (must be before writeHead)
      await reply.hijack()

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      })

      const sendEvent = (event: string, payload: any) => {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
      }

      try {
        const result = await collectorService.collectFromZip(
          buffer,
          getUserId(request),
          (msg) => sendEvent('progress', { message: msg }),
        )
        sendEvent('done', result)
      } catch (err: any) {
        sendEvent('error', { message: err.message || 'Erro desconhecido' })
      }

      reply.raw.end()
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // ---- Coleta Automática (ROOT/MASTER only) ----

  fastify.post('/collect', {
    preHandler: [authMiddleware, requireAdmin()],
  }, async (request, reply) => {
    request.raw.setTimeout(600_000) // 10 min

    try {
      const { year, month } = request.body as { year: number; month: number }

      if (!year || !month || month < 1 || month > 12) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Informe year e month válidos',
        })
      }

      // Hijack response for SSE streaming (must be before writeHead)
      await reply.hijack()

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      })

      const sendEvent = (event: string, payload: any) => {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
      }

      try {
        const result = await collectorService.collect(
          year,
          month,
          getUserId(request),
          (msg) => sendEvent('progress', { message: msg }),
        )
        sendEvent('done', result)
      } catch (err: any) {
        sendEvent('error', { message: err.message || 'Erro desconhecido' })
      }

      reply.raw.end()
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })
}
