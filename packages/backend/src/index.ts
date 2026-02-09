import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import { PrismaClient } from '@prisma/client'
import { logger } from './utils/logger'
import { errorHandler } from './utils/error-handler'
import { registerRoutes } from './routes'
import prisma from './lib/prisma'

const PORT = parseInt(process.env.PORT || '3001', 10)
const HOST = process.env.HOST || '0.0.0.0'

// Extend Fastify to include prisma
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

async function buildServer() {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      } : undefined,
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
  })

  // Decorate server with Prisma client
  server.decorate('prisma', prisma)

  // Register plugins
  await server.register(cors, {
    origin: true,
    credentials: true,
  })

  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  })

  await server.register(multipart, {
    limits: {
      fileSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760', 10),
    },
  })

  await server.register(swagger, {
    openapi: {
      info: {
        title: 'EnlevoHub API',
        description: 'API documentation for EnlevoHub - Construction Management SaaS',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'projects', description: 'Project management' },
        { name: 'units', description: 'Unit management' },
        { name: 'suppliers', description: 'Supplier management' },
        { name: 'purchases', description: 'Purchase order management' },
        { name: 'contractors', description: 'Contractor management' },
        { name: 'activity-templates', description: 'Activity template management' },
        { name: 'activities', description: 'Project activities management' },
        { name: 'measurements', description: 'Measurement management' },
        { name: 'brokers', description: 'Broker management' },
        { name: 'financial', description: 'Financial management' },
        { name: 'contracts', description: 'Contract management' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  })

  await server.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  })

  // Register routes
  registerRoutes(server)

  // Error handler
  server.setErrorHandler(errorHandler)

  // Health check
  server.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
  })

  return server
}

async function start() {
  try {
    const server = await buildServer()

    await server.listen({
      port: PORT,
      host: HOST,
    })

    logger.info(`🚀 Server listening on http://${HOST}:${PORT}`)
    logger.info(`📚 API Documentation: http://${HOST}:${PORT}/docs`)

  } catch (error) {
    logger.error(error, 'Failed to start server')
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...')
  process.exit(0)
})

start()
