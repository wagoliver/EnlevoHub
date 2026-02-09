import { z } from 'zod'

// ==================== Bank Accounts ====================

export const createBankAccountSchema = z.object({
  bankName: z.string().min(2).max(200),
  accountNumber: z.string().min(1).max(50),
  bankCode: z.string().max(10).optional(),
  agency: z.string().max(20).optional(),
  accountType: z.enum(['CHECKING', 'SAVINGS']).optional(),
  balance: z.number().default(0),
})

export const updateBankAccountSchema = z.object({
  bankName: z.string().min(2).max(200).optional(),
  accountNumber: z.string().min(1).max(50).optional(),
  bankCode: z.string().max(10).optional().nullable(),
  agency: z.string().max(20).optional().nullable(),
  accountType: z.enum(['CHECKING', 'SAVINGS']).optional().nullable(),
  balance: z.number().optional(),
  isActive: z.boolean().optional(),
})

// ==================== Transactions ====================

export const createTransactionSchema = z.object({
  bankAccountId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().min(1).max(100),
  amount: z.number().positive(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Data inválida'),
  paymentMethod: z.string().max(50).optional(),
  description: z.string().min(1),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
})

export const updateTransactionSchema = z.object({
  bankAccountId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Data inválida').optional(),
  paymentMethod: z.string().max(50).optional().nullable(),
  description: z.string().min(1).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
})

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z.string().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
  bankAccountId: z.string().optional(),
  projectId: z.string().optional(),
  reconciliationStatus: z.enum(['PENDING', 'AUTO_MATCHED', 'MANUAL_MATCHED', 'IGNORED']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

// ==================== Reconciliation ====================

export const matchTransactionSchema = z.object({
  transactionId: z.string().uuid(),
  linkedEntityType: z.string().min(1),
  linkedEntityId: z.string().uuid(),
  linkedEntityName: z.string().min(1),
})

// ==================== Types ====================

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>
export type MatchTransactionInput = z.infer<typeof matchTransactionSchema>
