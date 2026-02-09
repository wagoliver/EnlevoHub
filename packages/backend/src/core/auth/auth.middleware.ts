import { FastifyRequest, FastifyReply } from 'fastify'
import { JWTService, JWTPayload } from './jwt.service'

// Helper type for authenticated requests
export interface AuthenticatedRequest extends FastifyRequest {
  user: JWTPayload
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export function createAuthMiddleware(jwtService: JWTService) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Extract token from header
      const token = jwtService.extractTokenFromHeader(request)

      if (!token) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing authentication token'
        })
      }

      // Verify token
      const payload = await jwtService.verifyAccessToken(token)

      // Attach user to request (cast to any to avoid type conflict with @fastify/jwt)
      ;(request as any).user = payload

    } catch (error) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: error instanceof Error ? error.message : 'Invalid token'
      })
    }
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't fail if missing
 */
export function createOptionalAuthMiddleware(jwtService: JWTService) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = jwtService.extractTokenFromHeader(request)

      if (token) {
        const payload = await jwtService.verifyAccessToken(token)
        ;(request as any).user = payload
      }
    } catch (error) {
      // Silently fail for optional auth
      ;(request as any).user = undefined
    }
  }
}
