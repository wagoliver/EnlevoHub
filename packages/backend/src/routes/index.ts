import { FastifyInstance } from 'fastify'
import { authRoutes } from '../core/auth'
import { tenantRoutes } from '../core/tenancy'
import { rbacRoutes } from '../core/rbac'
import { projectRoutes } from '../core/projects'
import { userRoutes } from '../core/users'
import { contractorRoutes } from '../modules/contractors'
import { activityTemplateRoutes } from '../modules/activity-templates'
import { projectActivityRoutes } from '../modules/project-activities'
import { financialRoutes } from '../modules/financial'
import { monitoringRoutes } from '../modules/monitoring'
import { supplierRoutes } from '../modules/suppliers'
import { brokerRoutes } from '../modules/brokers'
import { sinapiRoutes } from '../modules/sinapi'
import { levantamentoRoutes } from '../modules/levantamento'
import { aiRoutes } from '../modules/ai'

export function registerRoutes(server: FastifyInstance) {
  // API v1 routes
  server.register(
    async (api) => {
      // Auth routes
      api.register(authRoutes)

      // Tenant routes
      api.register(tenantRoutes)

      // RBAC routes
      api.register(rbacRoutes)

      // User management routes
      api.register(userRoutes, { prefix: '/users' })

      // Project routes
      api.register(projectRoutes, { prefix: '/projects' })

      // Module routes
      api.register(contractorRoutes, { prefix: '/contractors' })
      api.register(activityTemplateRoutes, { prefix: '/activity-templates' })
      api.register(projectActivityRoutes, { prefix: '/projects' })
      api.register(financialRoutes, { prefix: '/financial' })
      api.register(monitoringRoutes, { prefix: '/monitoring' })
      api.register(supplierRoutes, { prefix: '/suppliers' })
      api.register(brokerRoutes, { prefix: '/brokers' })
      api.register(sinapiRoutes, { prefix: '/sinapi' })
      api.register(levantamentoRoutes, { prefix: '/projects' })
      api.register(aiRoutes, { prefix: '/ai' })

      // Placeholder route
      api.get('/', async () => {
        return {
          message: 'EnlevoHub API v1',
          version: '1.0.0',
        }
      })
    },
    { prefix: '/api/v1' }
  )
}
