import { FastifyRequest, FastifyReply } from 'fastify'

/**
 * Tenant isolation middleware
 * Ensures all requests have a valid tenant context
 * This middleware should be applied after authentication
 */
export function createTenantMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Check if user is authenticated
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required for tenant context'
      })
    }

    // Tenant ID comes from the authenticated user
    const tenantId = (request as any).user.tenantId

    if (!tenantId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'No tenant associated with user'
      })
    }

    // Verify tenant exists and is active
    const tenant = await request.server.prisma.tenant.findUnique({
      where: { id: tenantId }
    })

    if (!tenant) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Invalid tenant'
      })
    }

    // Tenant context is already in (request as any).user.tenantId
    // No additional action needed
  }
}

/**
 * Tenant validation helper
 * Checks if a resource belongs to the current tenant
 */
export function validateTenantOwnership(
  resourceTenantId: string,
  userTenantId: string
): void {
  if (resourceTenantId !== userTenantId) {
    throw new Error('Access denied: Resource belongs to different tenant')
  }
}

/**
 * Get tenant ID from request
 * Helper function to extract tenant ID safely
 */
export function getTenantId(request: FastifyRequest): string {
  if (!request.user || !(request as any).user.tenantId) {
    throw new Error('No tenant context found in request')
  }
  return (request as any).user.tenantId
}
