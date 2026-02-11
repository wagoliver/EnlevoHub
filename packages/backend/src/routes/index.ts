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
