import { FastifyInstance } from 'fastify'
import { createAuthMiddleware } from '../../core/auth/auth.middleware'
import { JWTService } from '../../core/auth/jwt.service'
import { hasPermission } from '../../core/rbac/permissions'
import { SupplierService } from './supplier.service'
import {
  createSupplierSchema,
  updateSupplierSchema,
  listSuppliersQuerySchema,
  createMaterialSchema,
  updateMaterialSchema,
  listMaterialsQuerySchema,
  linkMaterialSchema,
  createPurchaseOrderSchema,
  updatePurchaseOrderStatusSchema,
  listPurchaseOrdersQuerySchema,
} from './supplier.schemas'

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

export async function supplierRoutes(fastify: FastifyInstance) {
  const jwtService = new JWTService(fastify)
  const authMiddleware = createAuthMiddleware(jwtService)
  const service = new SupplierService(fastify.prisma)

  const getTenantId = (request: any): string => request.user.tenantId
  const getUserId = (request: any): string => request.user.userId
  const getUserRole = (request: any): string => request.user.role

  // ==================== MATERIAL ROUTES ====================
  // (registered before /:id to avoid route conflicts)

  // List materials catalog
  fastify.get('/materials', {
    preHandler: [authMiddleware, requirePermission('suppliers:view')],
    schema: {
      description: 'List materials catalog',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const query = listMaterialsQuerySchema.parse(request.query)
      const result = await service.listMaterials(getTenantId(request), query)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Get material by ID
  fastify.get('/materials/:id', {
    preHandler: [authMiddleware, requirePermission('suppliers:view')],
    schema: {
      description: 'Get material details',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const material = await service.getMaterialById(getTenantId(request), id)
      return reply.send(material)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Create material
  fastify.post('/materials', {
    preHandler: [authMiddleware, requirePermission('suppliers:create')],
    schema: {
      description: 'Create a new material',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const body = createMaterialSchema.parse(request.body)
      const material = await service.createMaterial(getTenantId(request), body)
      return reply.status(201).send(material)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Update material
  fastify.patch('/materials/:id', {
    preHandler: [authMiddleware, requirePermission('suppliers:edit')],
    schema: {
      description: 'Update a material',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = updateMaterialSchema.parse(request.body)
      const material = await service.updateMaterial(getTenantId(request), id, body)
      return reply.send(material)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Delete material
  fastify.delete('/materials/:id', {
    preHandler: [authMiddleware, requirePermission('suppliers:delete')],
    schema: {
      description: 'Delete a material',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await service.deleteMaterial(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Get suppliers for a specific material
  fastify.get('/materials/:id/suppliers', {
    preHandler: [authMiddleware, requirePermission('suppliers:view')],
    schema: {
      description: 'Get suppliers that provide a specific material',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await service.getMaterialSuppliers(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // ==================== PURCHASE ORDER ROUTES ====================
  // (registered before /:id to avoid route conflicts)

  // List purchase orders
  fastify.get('/purchase-orders', {
    preHandler: [authMiddleware, requirePermission('purchases:view')],
    schema: {
      description: 'List all purchase orders',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const query = listPurchaseOrdersQuerySchema.parse(request.query)
      const result = await service.listPurchaseOrders(getTenantId(request), query)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Get purchase order by ID
  fastify.get('/purchase-orders/:id', {
    preHandler: [authMiddleware, requirePermission('purchases:view')],
    schema: {
      description: 'Get purchase order details',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const order = await service.getPurchaseOrderById(getTenantId(request), id)
      return reply.send(order)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Create purchase order
  fastify.post('/purchase-orders', {
    preHandler: [authMiddleware, requirePermission('purchases:create')],
    schema: {
      description: 'Create a new purchase order',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const body = createPurchaseOrderSchema.parse(request.body)
      const order = await service.createPurchaseOrder(getTenantId(request), getUserId(request), body)
      return reply.status(201).send(order)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Update purchase order status
  fastify.patch('/purchase-orders/:id/status', {
    preHandler: [authMiddleware, requirePermission('purchases:edit')],
    schema: {
      description: 'Update purchase order status',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = updatePurchaseOrderStatusSchema.parse(request.body)

      // Check purchases:approve permission for APPROVED status
      if (body.status === 'APPROVED') {
        const userRole = getUserRole(request) as any
        if (!hasPermission(userRole, 'purchases:approve' as any)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Você não tem permissão para aprovar pedidos de compra',
          })
        }
      }

      const order = await service.updatePurchaseOrderStatus(
        getTenantId(request),
        getUserId(request),
        id,
        body,
        getUserRole(request)
      )
      return reply.send(order)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Delete purchase order
  fastify.delete('/purchase-orders/:id', {
    preHandler: [authMiddleware, requirePermission('purchases:delete')],
    schema: {
      description: 'Delete a purchase order (PENDING only)',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await service.deletePurchaseOrder(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // ==================== SUPPLIER CRUD ROUTES ====================

  // List suppliers
  fastify.get('/', {
    preHandler: [authMiddleware, requirePermission('suppliers:view')],
    schema: {
      description: 'List suppliers with pagination and filters',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const query = listSuppliersQuerySchema.parse(request.query)
      const result = await service.listSuppliers(getTenantId(request), query)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Get supplier by ID
  fastify.get('/:id', {
    preHandler: [authMiddleware, requirePermission('suppliers:view')],
    schema: {
      description: 'Get supplier details',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const supplier = await service.getSupplierById(getTenantId(request), id)
      return reply.send(supplier)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Create supplier
  fastify.post('/', {
    preHandler: [authMiddleware, requirePermission('suppliers:create')],
    schema: {
      description: 'Create a new supplier',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const body = createSupplierSchema.parse(request.body)
      const supplier = await service.createSupplier(getTenantId(request), body)
      return reply.status(201).send(supplier)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Update supplier
  fastify.patch('/:id', {
    preHandler: [authMiddleware, requirePermission('suppliers:edit')],
    schema: {
      description: 'Update a supplier',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = updateSupplierSchema.parse(request.body)
      const supplier = await service.updateSupplier(getTenantId(request), id, body)
      return reply.send(supplier)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Delete supplier
  fastify.delete('/:id', {
    preHandler: [authMiddleware, requirePermission('suppliers:delete')],
    schema: {
      description: 'Delete a supplier',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await service.deleteSupplier(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Get supplier financial summary
  fastify.get('/:id/financial-summary', {
    preHandler: [authMiddleware, requirePermission('suppliers:view')],
    schema: {
      description: 'Get supplier financial summary',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await service.getFinancialSummary(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // ==================== SUPPLIER-MATERIAL LINK ROUTES ====================

  // List supplier materials
  fastify.get('/:id/materials', {
    preHandler: [authMiddleware, requirePermission('suppliers:view')],
    schema: {
      description: 'List materials linked to a supplier',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await service.listSupplierMaterials(getTenantId(request), id)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })

  // Link material to supplier
  fastify.post('/:id/materials', {
    preHandler: [authMiddleware, requirePermission('suppliers:edit')],
    schema: {
      description: 'Link a material to a supplier with price',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = linkMaterialSchema.parse(request.body)
      const result = await service.linkMaterial(getTenantId(request), id, body)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message })
      }
      throw error
    }
  })

  // Unlink material from supplier
  fastify.delete('/:id/materials/:materialId', {
    preHandler: [authMiddleware, requirePermission('suppliers:edit')],
    schema: {
      description: 'Unlink a material from a supplier',
      tags: ['suppliers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { id, materialId } = request.params as { id: string; materialId: string }
      const result = await service.unlinkMaterial(getTenantId(request), id, materialId)
      return reply.send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ error: 'Not Found', message: error.message })
      }
      throw error
    }
  })
}
