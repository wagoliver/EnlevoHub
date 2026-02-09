import { FastifyRequest, FastifyReply } from 'fastify'
import { Permission, Role, hasPermission, hasAnyPermission, hasAllPermissions } from './permissions'

/**
 * Check if user has required permission
 */
export function requirePermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Check if user is authenticated
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }

    const userRole = (request as any).user.role as Role

    // Check permission
    if (!hasPermission(userRole, permission)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Missing required permission: ${permission}`
      })
    }
  }
}

/**
 * Check if user has any of the required permissions
 */
export function requireAnyPermission(permissions: Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Check if user is authenticated
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }

    const userRole = (request as any).user.role as Role

    // Check permissions
    if (!hasAnyPermission(userRole, permissions)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Missing required permissions. Need one of: ${permissions.join(', ')}`
      })
    }
  }
}

/**
 * Check if user has all of the required permissions
 */
export function requireAllPermissions(permissions: Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Check if user is authenticated
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }

    const userRole = (request as any).user.role as Role

    // Check permissions
    if (!hasAllPermissions(userRole, permissions)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Missing required permissions: ${permissions.join(', ')}`
      })
    }
  }
}

/**
 * Check if user has specific role
 */
export function requireRole(role: Role) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Check if user is authenticated
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }

    const userRole = (request as any).user.role

    // Check role
    if (userRole !== role) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Required role: ${role}`
      })
    }
  }
}

/**
 * Check if user has any of the specified roles
 */
export function requireAnyRole(roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Check if user is authenticated
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }

    const userRole = (request as any).user.role

    // Check roles
    if (!roles.includes(userRole as Role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Required roles: ${roles.join(', ')}`
      })
    }
  }
}

/**
 * Admin only access
 */
export function requireAdmin() {
  return requireRole('ADMIN')
}
