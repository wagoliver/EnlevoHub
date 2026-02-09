import { FastifyInstance } from 'fastify'
import { AuthService } from './auth.service'
import { JWTService } from './jwt.service'
import { createAuthMiddleware } from './auth.middleware'
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema
} from './auth.schemas'

export async function authRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authService = new AuthService(fastify.prisma, jwtService)
  const authMiddleware = createAuthMiddleware(jwtService)

  // Register
  fastify.post('/auth/register', {
    schema: {
      description: 'Register new user and tenant',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password', 'name', 'tenantName', 'tenantDocument'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', minLength: 2 },
          tenantName: { type: 'string', minLength: 2 },
          tenantDocument: { type: 'string', minLength: 11 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                tenantId: { type: 'string' }
              }
            },
            tenant: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                plan: { type: 'string' }
              }
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body)
      const result = await authService.register(body)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return (reply as any).status(400).send({
          error: 'Registration failed',
          message: error.message
        })
      }
      throw error
    }
  })

  // Login
  fastify.post('/auth/login', {
    schema: {
      description: 'Login user',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                tenantId: { type: 'string' }
              }
            },
            tenant: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                plan: { type: 'string' }
              }
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body)
      const result = await authService.login(body)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return (reply as any).status(401).send({
          error: 'Authentication failed',
          message: error.message
        })
      }
      throw error
    }
  })

  // Refresh token
  fastify.post('/auth/refresh', {
    schema: {
      description: 'Refresh access token',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const body = refreshTokenSchema.parse(request.body)
      const tokens = await authService.refreshToken(body.refreshToken)
      return reply.send(tokens)
    } catch (error) {
      if (error instanceof Error) {
        return (reply as any).status(401).send({
          error: 'Token refresh failed',
          message: error.message
        })
      }
      throw error
    }
  })

  // Get current user (protected route)
  fastify.get('/auth/me', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get current authenticated user',
      tags: ['auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            tenantId: { type: 'string' },
            createdAt: { type: 'string' },
            tenant: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                plan: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = await authService.getUserById((request as any).user.userId)
      return reply.send(user)
    } catch (error) {
      if (error instanceof Error) {
        return (reply as any).status(404).send({
          error: 'User not found',
          message: error.message
        })
      }
      throw error
    }
  })

  // Change password (protected route)
  fastify.post('/auth/change-password', {
    preHandler: authMiddleware,
    schema: {
      description: 'Change user password',
      tags: ['auth'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const body = changePasswordSchema.parse(request.body)
      await authService.changePassword(
        (request as any).user.userId,
        body.currentPassword,
        body.newPassword
      )
      return reply.send({ message: 'Password changed successfully' })
    } catch (error) {
      if (error instanceof Error) {
        return (reply as any).status(400).send({
          error: 'Password change failed',
          message: error.message
        })
      }
      throw error
    }
  })
}
