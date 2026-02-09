import { FastifyInstance } from 'fastify'
import { createAuthMiddleware } from '../../core/auth/auth.middleware'
import { JWTService } from '../../core/auth/jwt.service'
import { requireRole } from '../../core/rbac/rbac.middleware'
import { MetricsCollector } from './metrics-collector'
import { MonitoringService } from './monitoring.service'
import { auditQuerySchema, timeseriesQuerySchema } from './monitoring.schemas'

export async function monitoringRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authMiddleware = createAuthMiddleware(jwtService)
  const service = new MonitoringService(fastify.prisma)
  const collector = MetricsCollector.getInstance()

  const rootOnly = [authMiddleware, requireRole('ROOT')]

  const swaggerSchema = (description: string) => ({
    description,
    tags: ['monitoring'],
    security: [{ bearerAuth: [] }],
  })

  // GET /overview — combined overview
  fastify.get('/overview', {
    preHandler: rootOnly,
    schema: swaggerSchema('Get full system overview (ROOT only)'),
  }, async () => {
    const eventLoopLag = await collector.measureEventLoopLag()
    const [database, application] = await Promise.all([
      service.getDatabaseMetrics(),
      service.getApplicationMetrics(),
    ])

    return {
      system: { ...collector.getSystemMetrics(), eventLoopLagMs: eventLoopLag },
      http: collector.getHttpMetrics(),
      database,
      application,
    }
  })

  // GET /system
  fastify.get('/system', {
    preHandler: rootOnly,
    schema: swaggerSchema('Get system metrics (ROOT only)'),
  }, async () => {
    const eventLoopLag = await collector.measureEventLoopLag()
    return { ...collector.getSystemMetrics(), eventLoopLagMs: eventLoopLag }
  })

  // GET /http
  fastify.get('/http', {
    preHandler: rootOnly,
    schema: swaggerSchema('Get HTTP metrics (ROOT only)'),
  }, async () => {
    return collector.getHttpMetrics()
  })

  // GET /http/timeseries
  fastify.get('/http/timeseries', {
    preHandler: rootOnly,
    schema: swaggerSchema('Get HTTP requests time series (ROOT only)'),
  }, async (request) => {
    const { minutes } = timeseriesQuerySchema.parse(request.query)
    return collector.getRequestsTimeSeries(minutes)
  })

  // GET /database
  fastify.get('/database', {
    preHandler: rootOnly,
    schema: swaggerSchema('Get database metrics (ROOT only)'),
  }, async () => {
    return service.getDatabaseMetrics()
  })

  // GET /application
  fastify.get('/application', {
    preHandler: rootOnly,
    schema: swaggerSchema('Get application metrics (ROOT only)'),
  }, async () => {
    return service.getApplicationMetrics()
  })

  // GET /tenants
  fastify.get('/tenants', {
    preHandler: rootOnly,
    schema: swaggerSchema('Get tenant usage metrics (ROOT only)'),
  }, async () => {
    return service.getTenantUsage()
  })

  // GET /audit
  fastify.get('/audit', {
    preHandler: rootOnly,
    schema: swaggerSchema('Get audit activity (ROOT only)'),
  }, async (request) => {
    const { days } = auditQuerySchema.parse(request.query)
    return service.getAuditActivity(days)
  })
}
