import { FastifyInstance } from 'fastify'
import { createAuthMiddleware } from '../../core/auth/auth.middleware'
import { JWTService } from '../../core/auth/jwt.service'
import { hasPermission } from '../../core/rbac/permissions'
import { FinancialService } from './financial.service'
import { ImportService } from './import.service'
import { ReconciliationService } from './reconciliation.service'
import {
  createBankAccountSchema,
  updateBankAccountSchema,
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
  matchTransactionSchema,
} from './financial.schemas'

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

export async function financialRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authMiddleware = createAuthMiddleware(jwtService)
  const service = new FinancialService(fastify.prisma)
  const importService = new ImportService(fastify.prisma)
  const reconciliationService = new ReconciliationService(fastify.prisma)

  const getTenantId = (request: any): string => request.user.tenantId
  const getUserId = (request: any): string => request.user.userId

  // ==================== Dashboard ====================

  fastify.get('/dashboard', {
    preHandler: [authMiddleware, requirePermission('financial:view')],
    schema: {
      description: 'Get financial dashboard summary',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const result = await service.getDashboard(getTenantId(request))
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // ==================== Bank Accounts ====================

  fastify.get('/accounts', {
    preHandler: [authMiddleware, requirePermission('financial:view')],
    schema: {
      description: 'List bank accounts',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const accounts = await service.listAccounts(getTenantId(request))
      return reply.send(accounts)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.post('/accounts', {
    preHandler: [authMiddleware, requirePermission('financial:create')],
    schema: {
      description: 'Create a bank account',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const body = createBankAccountSchema.parse(request.body)
      const account = await service.createAccount(getTenantId(request), body)
      return reply.status(201).send(account)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.patch('/accounts/:id', {
    preHandler: [authMiddleware, requirePermission('financial:edit')],
    schema: {
      description: 'Update a bank account',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = updateBankAccountSchema.parse(request.body)
      const account = await service.updateAccount(getTenantId(request), id, body)
      return reply.send(account)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.delete('/accounts/:id', {
    preHandler: [authMiddleware, requirePermission('financial:delete')],
    schema: {
      description: 'Delete a bank account',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await service.deleteAccount(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // ==================== Transactions ====================

  fastify.get('/transactions', {
    preHandler: [authMiddleware, requirePermission('financial:view')],
    schema: {
      description: 'List financial transactions with filters',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          search: { type: 'string' },
          type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
          category: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'CANCELLED'] },
          bankAccountId: { type: 'string' },
          projectId: { type: 'string' },
          reconciliationStatus: { type: 'string', enum: ['PENDING', 'AUTO_MATCHED', 'MANUAL_MATCHED', 'IGNORED'] },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const query = listTransactionsQuerySchema.parse(request.query)
      const result = await service.listTransactions(getTenantId(request), query)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.post('/transactions', {
    preHandler: [authMiddleware, requirePermission('financial:create')],
    schema: {
      description: 'Create a manual financial transaction',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const body = createTransactionSchema.parse(request.body)
      const transaction = await service.createTransaction(getTenantId(request), getUserId(request), body)
      return reply.status(201).send(transaction)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.patch('/transactions/:id', {
    preHandler: [authMiddleware, requirePermission('financial:edit')],
    schema: {
      description: 'Update a financial transaction',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = updateTransactionSchema.parse(request.body)
      const transaction = await service.updateTransaction(getTenantId(request), id, body)
      return reply.send(transaction)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.delete('/transactions/:id', {
    preHandler: [authMiddleware, requirePermission('financial:delete')],
    schema: {
      description: 'Delete a financial transaction',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await service.deleteTransaction(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // ==================== Import ====================

  fastify.post('/import', {
    preHandler: [authMiddleware, requirePermission('financial:create')],
    schema: {
      description: 'Import bank statement file (OFX, CSV, XLSX)',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
      querystring: {
        type: 'object',
        required: ['bankAccountId'],
        properties: {
          bankAccountId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { bankAccountId } = request.query as { bankAccountId: string }
      if (!bankAccountId) {
        return reply.status(400).send({ error: 'Bad Request', message: 'bankAccountId é obrigatório' })
      }

      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Nenhum arquivo enviado' })
      }

      const buffer = await data.toBuffer()
      const result = await importService.importFile(
        getTenantId(request),
        getUserId(request),
        bankAccountId,
        data.filename,
        buffer,
      )

      // Run auto-reconciliation in background
      reconciliationService.autoReconcile(getTenantId(request), result.batchId).catch(() => {})

      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.get('/imports', {
    preHandler: [authMiddleware, requirePermission('financial:view')],
    schema: {
      description: 'List import batches',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const batches = await service.listImports(getTenantId(request))
      return reply.send(batches)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.delete('/imports/:id', {
    preHandler: [authMiddleware, requirePermission('financial:delete')],
    schema: {
      description: 'Delete an import batch and all its transactions',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await service.deleteImportBatch(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // ==================== Reconciliation ====================

  fastify.get('/reconciliation/pending', {
    preHandler: [authMiddleware, requirePermission('financial:view')],
    schema: {
      description: 'List imported transactions for reconciliation',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          filter: { type: 'string', enum: ['ALL', 'PENDING', 'MATCHED', 'IGNORED'] },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { filter } = request.query as { filter?: string }
      const transactions = await reconciliationService.getImportedTransactions(getTenantId(request), filter)
      return reply.send(transactions)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.get('/reconciliation/suggestions/:id', {
    preHandler: [authMiddleware, requirePermission('financial:view')],
    schema: {
      description: 'Get reconciliation suggestions for a transaction',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const suggestions = await reconciliationService.getSuggestions(getTenantId(request), id)
      return reply.send(suggestions)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.post('/reconciliation/match', {
    preHandler: [authMiddleware, requirePermission('financial:edit')],
    schema: {
      description: 'Manually match a transaction with an entity',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const body = matchTransactionSchema.parse(request.body)
      const result = await reconciliationService.matchTransaction(
        getTenantId(request),
        body.transactionId,
        body.linkedEntityType,
        body.linkedEntityId,
        body.linkedEntityName,
      )
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.get('/reconciliation/search-entities', {
    preHandler: [authMiddleware, requirePermission('financial:view')],
    schema: {
      description: 'Search suppliers and contractors for manual reconciliation',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { search } = request.query as { search?: string }
      const results = await reconciliationService.searchEntities(getTenantId(request), search || '')
      return reply.send(results)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.post('/reconciliation/rerun', {
    preHandler: [authMiddleware, requirePermission('financial:edit')],
    schema: {
      description: 'Re-run auto reconciliation on all pending transactions',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const matched = await reconciliationService.rerunAutoReconcile(getTenantId(request))
      return reply.send({ matched, message: `${matched} transação(ões) conciliada(s) automaticamente` })
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.post('/reconciliation/unlink/:id', {
    preHandler: [authMiddleware, requirePermission('financial:edit')],
    schema: {
      description: 'Unlink a reconciled transaction (set back to PENDING)',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await reconciliationService.unlinkTransaction(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  fastify.post('/reconciliation/ignore/:id', {
    preHandler: [authMiddleware, requirePermission('financial:edit')],
    schema: {
      description: 'Ignore a transaction from reconciliation',
      tags: ['financial'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await reconciliationService.ignoreTransaction(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })
}
