import { PrismaClient, Prisma } from '@prisma/client'
import {
  CreateSupplierInput,
  UpdateSupplierInput,
  ListSuppliersQuery,
  CreateMaterialInput,
  UpdateMaterialInput,
  ListMaterialsQuery,
  LinkMaterialInput,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderStatusInput,
  ListPurchaseOrdersQuery,
} from './supplier.schemas'

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['APPROVED', 'CANCELLED'],
  APPROVED: ['ORDERED', 'CANCELLED'],
  ORDERED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

export class SupplierService {
  constructor(private prisma: PrismaClient) {}

  // ==================== SUPPLIER CRUD ====================

  async listSuppliers(tenantId: string, query: ListSuppliersQuery) {
    const { page, limit, search, type, isActive } = query
    const skip = (page - 1) * limit

    const where: Prisma.SupplierWhereInput = {
      tenantId,
      ...(isActive !== undefined && { isActive }),
      ...(type && { type }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { document: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { purchaseOrders: true, materials: true } },
        },
      }),
      this.prisma.supplier.count({ where }),
    ])

    return {
      data: suppliers.map(s => this.serializeSupplier(s)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getSupplierById(tenantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { purchaseOrders: true, materials: true } },
      },
    })

    if (!supplier) {
      throw new Error('Fornecedor não encontrado')
    }

    return this.serializeSupplier(supplier)
  }

  async createSupplier(tenantId: string, data: CreateSupplierInput) {
    // Check document uniqueness within tenant
    const existing = await this.prisma.supplier.findFirst({
      where: { tenantId, document: data.document },
    })
    if (existing) {
      throw new Error('Já existe um fornecedor com este documento neste tenant')
    }

    const supplier = await this.prisma.supplier.create({
      data: {
        tenantId,
        name: data.name,
        document: data.document,
        type: data.type,
        contacts: data.contacts as any,
        rating: data.rating,
      },
      include: {
        _count: { select: { purchaseOrders: true, materials: true } },
      },
    })

    return this.serializeSupplier(supplier)
  }

  async updateSupplier(tenantId: string, id: string, data: UpdateSupplierInput) {
    const existing = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Fornecedor não encontrado')
    }

    // Check document uniqueness if changing
    if (data.document && data.document !== existing.document) {
      const duplicate = await this.prisma.supplier.findFirst({
        where: { tenantId, document: data.document, id: { not: id } },
      })
      if (duplicate) {
        throw new Error('Já existe um fornecedor com este documento neste tenant')
      }
    }

    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.document !== undefined && { document: data.document }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.contacts !== undefined && { contacts: data.contacts as any }),
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        _count: { select: { purchaseOrders: true, materials: true } },
      },
    })

    return this.serializeSupplier(supplier)
  }

  async deleteSupplier(tenantId: string, id: string) {
    const existing = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { purchaseOrders: true } } },
    })
    if (!existing) {
      throw new Error('Fornecedor não encontrado')
    }

    // Soft delete if has purchase orders, hard delete otherwise
    if (existing._count.purchaseOrders > 0) {
      await this.prisma.supplier.update({
        where: { id },
        data: { isActive: false },
      })
      return { message: 'Fornecedor desativado (possui pedidos de compra vinculados)' }
    }

    await this.prisma.supplier.delete({ where: { id } })
    return { message: 'Fornecedor excluído com sucesso' }
  }

  async getFinancialSummary(tenantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    })
    if (!supplier) {
      throw new Error('Fornecedor não encontrado')
    }

    const [totalGastoResult, pedidosPendentesResult, transacoesRecentes] = await Promise.all([
      this.prisma.financialTransaction.aggregate({
        where: {
          linkedEntityType: 'supplier',
          linkedEntityId: id,
        },
        _sum: { amount: true },
      }),
      this.prisma.purchaseOrder.aggregate({
        where: {
          supplierId: id,
          status: { in: ['PENDING', 'APPROVED', 'ORDERED'] },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.financialTransaction.findMany({
        where: {
          linkedEntityType: 'supplier',
          linkedEntityId: id,
        },
        orderBy: { date: 'desc' },
        take: 10,
        include: {
          project: { select: { id: true, name: true } },
        },
      }),
    ])

    return {
      totalGasto: Number(totalGastoResult._sum.amount || 0),
      pedidosPendentes: Number(pedidosPendentesResult._sum.totalAmount || 0),
      transacoesRecentes: transacoesRecentes.map(t => ({
        ...t,
        amount: Number(t.amount),
      })),
    }
  }

  // ==================== MATERIAL CRUD ====================

  async listMaterials(tenantId: string, query: ListMaterialsQuery) {
    const { page, limit, search, category } = query
    const skip = (page - 1) * limit

    const where: Prisma.MaterialWhereInput = {
      tenantId,
      ...(category && { category }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [materials, total] = await Promise.all([
      this.prisma.material.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { suppliers: true, purchaseOrderItems: true } },
        },
      }),
      this.prisma.material.count({ where }),
    ])

    return {
      data: materials.map(m => this.serializeMaterial(m)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getMaterialById(tenantId: string, id: string) {
    const material = await this.prisma.material.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { suppliers: true, purchaseOrderItems: true } },
      },
    })
    if (!material) {
      throw new Error('Material não encontrado')
    }
    return this.serializeMaterial(material)
  }

  async createMaterial(tenantId: string, data: CreateMaterialInput) {
    const material = await this.prisma.material.create({
      data: {
        tenantId,
        name: data.name,
        category: data.category,
        unit: data.unit,
        currentPrice: data.currentPrice,
        description: data.description,
      },
      include: {
        _count: { select: { suppliers: true, purchaseOrderItems: true } },
      },
    })
    return this.serializeMaterial(material)
  }

  async updateMaterial(tenantId: string, id: string, data: UpdateMaterialInput) {
    const existing = await this.prisma.material.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Material não encontrado')
    }

    const material = await this.prisma.material.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.currentPrice !== undefined && { currentPrice: data.currentPrice }),
        ...(data.description !== undefined && { description: data.description }),
      },
      include: {
        _count: { select: { suppliers: true, purchaseOrderItems: true } },
      },
    })
    return this.serializeMaterial(material)
  }

  async deleteMaterial(tenantId: string, id: string) {
    const existing = await this.prisma.material.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { purchaseOrderItems: true } } },
    })
    if (!existing) {
      throw new Error('Material não encontrado')
    }
    if (existing._count.purchaseOrderItems > 0) {
      throw new Error('Material não pode ser excluído pois está vinculado a itens de pedido de compra')
    }

    await this.prisma.material.delete({ where: { id } })
    return { message: 'Material excluído com sucesso' }
  }

  async getMaterialSuppliers(tenantId: string, materialId: string) {
    const material = await this.prisma.material.findFirst({
      where: { id: materialId, tenantId },
    })
    if (!material) {
      throw new Error('Material não encontrado')
    }

    const links = await this.prisma.supplierMaterial.findMany({
      where: { materialId },
      include: {
        supplier: {
          select: { id: true, name: true, document: true, type: true, isActive: true, rating: true },
        },
      },
      orderBy: { price: 'asc' },
    })

    return links.map(l => ({
      ...l,
      price: Number(l.price),
      supplier: {
        ...l.supplier,
        rating: l.supplier.rating ? Number(l.supplier.rating) : null,
      },
    }))
  }

  // ==================== SUPPLIER-MATERIAL LINK ====================

  async listSupplierMaterials(tenantId: string, supplierId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
    })
    if (!supplier) {
      throw new Error('Fornecedor não encontrado')
    }

    const links = await this.prisma.supplierMaterial.findMany({
      where: { supplierId },
      include: {
        material: {
          select: { id: true, name: true, category: true, unit: true, currentPrice: true },
        },
      },
      orderBy: { material: { name: 'asc' } },
    })

    return links.map(l => ({
      ...l,
      price: Number(l.price),
      material: {
        ...l.material,
        currentPrice: Number(l.material.currentPrice),
      },
    }))
  }

  async linkMaterial(tenantId: string, supplierId: string, data: LinkMaterialInput) {
    const [supplier, material] = await Promise.all([
      this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId } }),
      this.prisma.material.findFirst({ where: { id: data.materialId, tenantId } }),
    ])
    if (!supplier) throw new Error('Fornecedor não encontrado')
    if (!material) throw new Error('Material não encontrado')

    // Check if already linked
    const existing = await this.prisma.supplierMaterial.findUnique({
      where: { supplierId_materialId: { supplierId, materialId: data.materialId } },
    })
    if (existing) {
      // Update price
      const updated = await this.prisma.supplierMaterial.update({
        where: { id: existing.id },
        data: { price: data.price },
        include: {
          material: {
            select: { id: true, name: true, category: true, unit: true, currentPrice: true },
          },
        },
      })
      return {
        ...updated,
        price: Number(updated.price),
        material: { ...updated.material, currentPrice: Number(updated.material.currentPrice) },
      }
    }

    const link = await this.prisma.supplierMaterial.create({
      data: {
        supplierId,
        materialId: data.materialId,
        price: data.price,
      },
      include: {
        material: {
          select: { id: true, name: true, category: true, unit: true, currentPrice: true },
        },
      },
    })

    return {
      ...link,
      price: Number(link.price),
      material: { ...link.material, currentPrice: Number(link.material.currentPrice) },
    }
  }

  async unlinkMaterial(tenantId: string, supplierId: string, materialId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
    })
    if (!supplier) throw new Error('Fornecedor não encontrado')

    const link = await this.prisma.supplierMaterial.findUnique({
      where: { supplierId_materialId: { supplierId, materialId } },
    })
    if (!link) throw new Error('Vínculo não encontrado')

    await this.prisma.supplierMaterial.delete({ where: { id: link.id } })
    return { message: 'Material desvinculado com sucesso' }
  }

  // ==================== PURCHASE ORDER ====================

  async listPurchaseOrders(tenantId: string, query: ListPurchaseOrdersQuery) {
    const { page, limit, search, status, projectId, supplierId } = query
    const skip = (page - 1) * limit

    const where: Prisma.PurchaseOrderWhereInput = {
      supplier: { tenantId },
      ...(status && { status }),
      ...(projectId && { projectId }),
      ...(supplierId && { supplierId }),
      ...(search && {
        orderNumber: { contains: search, mode: 'insensitive' as const },
      }),
    }

    const [orders, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true, document: true } },
          project: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ])

    return {
      data: orders.map(o => this.serializePurchaseOrder(o)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getPurchaseOrderById(tenantId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, supplier: { tenantId } },
      include: {
        supplier: { select: { id: true, name: true, document: true } },
        project: { select: { id: true, name: true } },
        items: {
          include: {
            material: { select: { id: true, name: true, category: true, unit: true } },
          },
        },
      },
    })
    if (!order) {
      throw new Error('Pedido de compra não encontrado')
    }
    return this.serializePurchaseOrder(order)
  }

  async createPurchaseOrder(tenantId: string, userId: string, data: CreatePurchaseOrderInput) {
    // Validate project and supplier belong to tenant
    const [project, supplier] = await Promise.all([
      this.prisma.project.findFirst({ where: { id: data.projectId, tenantId } }),
      this.prisma.supplier.findFirst({ where: { id: data.supplierId, tenantId, isActive: true } }),
    ])
    if (!project) throw new Error('Projeto não encontrado')
    if (!supplier) throw new Error('Fornecedor não encontrado ou inativo')

    // Generate order number: OC-001, OC-002... sequential per project
    const lastOrder = await this.prisma.purchaseOrder.findFirst({
      where: { projectId: data.projectId },
      orderBy: { orderNumber: 'desc' },
    })
    const nextNum = lastOrder
      ? parseInt(lastOrder.orderNumber.replace('OC-', '')) + 1
      : 1
    const orderNumber = `OC-${String(nextNum).padStart(3, '0')}`

    // Calculate totals
    const items = data.items.map(item => ({
      materialId: item.materialId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
    }))
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0)

    const order = await this.prisma.purchaseOrder.create({
      data: {
        projectId: data.projectId,
        supplierId: data.supplierId,
        orderNumber,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        notes: data.notes,
        totalAmount,
        items: {
          create: items,
        },
      },
      include: {
        supplier: { select: { id: true, name: true, document: true } },
        project: { select: { id: true, name: true } },
        items: {
          include: {
            material: { select: { id: true, name: true, category: true, unit: true } },
          },
        },
      },
    })

    return this.serializePurchaseOrder(order)
  }

  async updatePurchaseOrderStatus(
    tenantId: string,
    userId: string,
    id: string,
    data: UpdatePurchaseOrderStatusInput,
    userRole: string
  ) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, supplier: { tenantId } },
      include: {
        supplier: { select: { id: true, name: true, document: true } },
        project: { select: { id: true, name: true } },
      },
    })
    if (!order) throw new Error('Pedido de compra não encontrado')

    // Validate status transition
    const validTransitions = VALID_STATUS_TRANSITIONS[order.status]
    if (!validTransitions || !validTransitions.includes(data.status)) {
      throw new Error(`Transição de status inválida: ${order.status} → ${data.status}`)
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Update PO status
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: { status: data.status },
        include: {
          supplier: { select: { id: true, name: true, document: true } },
          project: { select: { id: true, name: true } },
          items: {
            include: {
              material: { select: { id: true, name: true, category: true, unit: true } },
            },
          },
        },
      })

      // If DELIVERED and createExpense is true, create financial transaction
      if (data.status === 'DELIVERED' && data.createExpense) {
        await tx.financialTransaction.create({
          data: {
            projectId: order.projectId,
            bankAccountId: data.bankAccountId || null,
            type: 'EXPENSE',
            category: 'Material de Construção',
            amount: order.totalAmount,
            description: `OC ${order.orderNumber} - ${order.supplier.name}`,
            status: 'COMPLETED',
            reconciliationStatus: 'MANUAL_MATCHED',
            linkedEntityType: 'supplier',
            linkedEntityId: order.supplierId,
            linkedEntityName: order.supplier.name,
            createdBy: userId,
          },
        })
      }

      return updated
    })

    return this.serializePurchaseOrder(result)
  }

  async deletePurchaseOrder(tenantId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, supplier: { tenantId } },
    })
    if (!order) throw new Error('Pedido de compra não encontrado')
    if (order.status !== 'PENDING') {
      throw new Error('Apenas pedidos com status PENDENTE podem ser excluídos')
    }

    await this.prisma.purchaseOrder.delete({ where: { id } })
    return { message: 'Pedido de compra excluído com sucesso' }
  }

  // ==================== SERIALIZERS ====================

  private serializeSupplier(supplier: any) {
    return {
      ...supplier,
      rating: supplier.rating ? Number(supplier.rating) : null,
    }
  }

  private serializeMaterial(material: any) {
    return {
      ...material,
      currentPrice: Number(material.currentPrice),
    }
  }

  private serializePurchaseOrder(order: any) {
    return {
      ...order,
      totalAmount: Number(order.totalAmount),
      items: order.items?.map((item: any) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    }
  }
}
