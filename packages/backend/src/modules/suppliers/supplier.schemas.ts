import { z } from 'zod'

// ==================== SUPPLIER ====================

export const createSupplierSchema = z.object({
  name: z.string().min(2).max(200),
  document: z.string().regex(/^\d{11}$|^\d{14}$/, 'Documento deve ser CPF (11 dígitos) ou CNPJ (14 dígitos)'),
  type: z.enum(['MATERIALS', 'SERVICES', 'BOTH']),
  contacts: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
    contactPerson: z.string().optional(),
  }),
  rating: z.number().min(0).max(5).optional(),
})

export const updateSupplierSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  document: z.string().regex(/^\d{11}$|^\d{14}$/, 'Documento deve ser CPF (11 dígitos) ou CNPJ (14 dígitos)').optional(),
  type: z.enum(['MATERIALS', 'SERVICES', 'BOTH']).optional(),
  contacts: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
    contactPerson: z.string().optional(),
  }).optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  isActive: z.boolean().optional(),
})

export const listSuppliersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  type: z.enum(['MATERIALS', 'SERVICES', 'BOTH']).optional(),
  isActive: z.coerce.boolean().optional(),
})

// ==================== MATERIAL ====================

export const createMaterialSchema = z.object({
  name: z.string().min(2).max(200),
  category: z.string().min(1),
  unit: z.string().min(1),
  currentPrice: z.number().positive(),
  description: z.string().optional(),
})

export const updateMaterialSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  category: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  currentPrice: z.number().positive().optional(),
  description: z.string().nullable().optional(),
})

export const listMaterialsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  category: z.string().optional(),
})

// ==================== SUPPLIER-MATERIAL LINK ====================

export const linkMaterialSchema = z.object({
  materialId: z.string().uuid(),
  price: z.number().positive(),
})

// ==================== PURCHASE ORDER ====================

export const createPurchaseOrderSchema = z.object({
  projectId: z.string().uuid(),
  supplierId: z.string().uuid(),
  deliveryDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    materialId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })).min(1, 'Pedido deve ter pelo menos 1 item'),
})

export const updatePurchaseOrderStatusSchema = z.object({
  status: z.enum(['APPROVED', 'ORDERED', 'DELIVERED', 'CANCELLED']),
  createExpense: z.boolean().optional(),
  bankAccountId: z.string().uuid().optional(),
})

export const listPurchaseOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'ORDERED', 'DELIVERED', 'CANCELLED']).optional(),
  projectId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
})

// ==================== TYPE EXPORTS ====================

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>
export type ListMaterialsQuery = z.infer<typeof listMaterialsQuerySchema>
export type LinkMaterialInput = z.infer<typeof linkMaterialSchema>
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>
export type UpdatePurchaseOrderStatusInput = z.infer<typeof updatePurchaseOrderStatusSchema>
export type ListPurchaseOrdersQuery = z.infer<typeof listPurchaseOrdersQuerySchema>
