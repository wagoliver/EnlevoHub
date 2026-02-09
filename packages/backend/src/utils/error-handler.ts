import { FastifyError, FastifyReply, FastifyRequest } from 'fastify'

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error)

  // Validation error
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation,
    })
  }

  // JWT error
  if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Missing or invalid authentication token',
    })
  }

  if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid authentication token',
    })
  }

  // Generic error
  const statusCode = error.statusCode || 500

  return reply.status(statusCode).send({
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
  })
}
