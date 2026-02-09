import { PrismaClient, Prisma } from '@prisma/client'
import {
  CreateBankAccountInput,
  UpdateBankAccountInput,
  CreateTransactionInput,
  UpdateTransactionInput,
  ListTransactionsQuery,
} from './financial.schemas'

export class FinancialService {
  constructor(private prisma: PrismaClient) {}

  // ==================== Bank Accounts ====================

  async listAccounts(tenantId: string) {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { tenantId },
      include: {
        _count: { select: { transactions: true, importBatches: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return accounts.map(this.serializeAccount)
  }

  async createAccount(tenantId: string, data: CreateBankAccountInput) {
    const account = await this.prisma.bankAccount.create({
      data: {
        tenantId,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        bankCode: data.bankCode,
        agency: data.agency,
        accountType: data.accountType,
        balance: data.balance,
      },
    })
    return this.serializeAccount(account)
  }

  async updateAccount(tenantId: string, id: string, data: UpdateBankAccountInput) {
    const existing = await this.prisma.bankAccount.findFirst({
      where: { id, tenantId },
    })
    if (!existing) throw new Error('Conta bancária não encontrada')

    const account = await this.prisma.bankAccount.update({
      where: { id },
      data: {
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber }),
        ...(data.bankCode !== undefined && { bankCode: data.bankCode }),
        ...(data.agency !== undefined && { agency: data.agency }),
        ...(data.accountType !== undefined && { accountType: data.accountType }),
        ...(data.balance !== undefined && { balance: data.balance }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })
    return this.serializeAccount(account)
  }

  async deleteAccount(tenantId: string, id: string) {
    const existing = await this.prisma.bankAccount.findFirst({
      where: { id, tenantId },
    })
    if (!existing) throw new Error('Conta bancária não encontrada')

    await this.prisma.bankAccount.delete({ where: { id } })
    return { message: 'Conta bancária removida com sucesso' }
  }

  // ==================== Transactions ====================

  async listTransactions(tenantId: string, query: ListTransactionsQuery) {
    const { page, limit, search, type, category, status, bankAccountId, projectId, reconciliationStatus, dateFrom, dateTo } = query

    const where: Prisma.FinancialTransactionWhereInput = {
      bankAccount: bankAccountId ? { id: bankAccountId, tenantId } : undefined,
      user: { tenantId },
      ...(type && { type }),
      ...(category && { category }),
      ...(status && { status }),
      ...(projectId && { projectId }),
      ...(reconciliationStatus && { reconciliationStatus }),
      ...(search && {
        OR: [
          { description: { contains: search, mode: 'insensitive' as const } },
          { rawDescription: { contains: search, mode: 'insensitive' as const } },
          { category: { contains: search, mode: 'insensitive' as const } },
          { linkedEntityName: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...((dateFrom || dateTo) && {
        date: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') }),
        },
      }),
    }

    // If no bankAccountId filter, ensure tenant scope via user relation
    if (!bankAccountId) {
      where.user = { tenantId }
    }

    const [transactions, total] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where,
        include: {
          bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
          project: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.financialTransaction.count({ where }),
    ])

    return {
      data: transactions.map(this.serializeTransaction),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async createTransaction(tenantId: string, userId: string, data: CreateTransactionInput) {
    // Validate bankAccountId belongs to tenant if provided
    if (data.bankAccountId) {
      const account = await this.prisma.bankAccount.findFirst({
        where: { id: data.bankAccountId, tenantId },
      })
      if (!account) throw new Error('Conta bancária não encontrada')
    }

    const transaction = await this.prisma.financialTransaction.create({
      data: {
        bankAccountId: data.bankAccountId,
        projectId: data.projectId,
        type: data.type,
        category: data.category,
        amount: data.amount,
        date: new Date(data.date),
        paymentMethod: data.paymentMethod,
        description: data.description,
        status: data.status || 'COMPLETED',
        reconciliationStatus: 'MANUAL_MATCHED',
        createdBy: userId,
      },
      include: {
        bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
        project: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    })
    return this.serializeTransaction(transaction)
  }

  async updateTransaction(tenantId: string, id: string, data: UpdateTransactionInput) {
    const existing = await this.prisma.financialTransaction.findFirst({
      where: { id, user: { tenantId } },
    })
    if (!existing) throw new Error('Transação não encontrada')

    const transaction = await this.prisma.financialTransaction.update({
      where: { id },
      data: {
        ...(data.bankAccountId !== undefined && { bankAccountId: data.bankAccountId }),
        ...(data.projectId !== undefined && { projectId: data.projectId }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: {
        bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
        project: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    })
    return this.serializeTransaction(transaction)
  }

  async deleteTransaction(tenantId: string, id: string) {
    const existing = await this.prisma.financialTransaction.findFirst({
      where: { id, user: { tenantId } },
    })
    if (!existing) throw new Error('Transação não encontrada')

    await this.prisma.financialTransaction.delete({ where: { id } })
    return { message: 'Transação removida com sucesso' }
  }

  // ==================== Dashboard ====================

  async getDashboard(tenantId: string) {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const [
      accounts,
      monthlyIncome,
      monthlyExpense,
      pendingReconciliation,
      recentTransactions,
    ] = await Promise.all([
      this.prisma.bankAccount.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, bankName: true, balance: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: {
          user: { tenantId },
          type: 'INCOME',
          status: 'COMPLETED',
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: {
          user: { tenantId },
          type: 'EXPENSE',
          status: 'COMPLETED',
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.financialTransaction.count({
        where: {
          user: { tenantId },
          reconciliationStatus: 'PENDING',
          importBatchId: { not: null },
        },
      }),
      this.prisma.financialTransaction.findMany({
        where: { user: { tenantId } },
        include: {
          bankAccount: { select: { bankName: true } },
          project: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        take: 10,
      }),
    ])

    const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0)

    return {
      totalBalance,
      monthlyIncome: Number(monthlyIncome._sum.amount || 0),
      monthlyExpense: Number(monthlyExpense._sum.amount || 0),
      pendingReconciliation,
      accounts: accounts.map(a => ({
        ...a,
        balance: Number(a.balance),
      })),
      recentTransactions: recentTransactions.map(this.serializeTransaction),
    }
  }

  // ==================== Import Batches ====================

  async listImports(tenantId: string) {
    const batches = await this.prisma.importBatch.findMany({
      where: { tenantId },
      include: {
        bankAccount: { select: { bankName: true, accountNumber: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return batches
  }

  // ==================== Serialization ====================

  private serializeAccount(account: any) {
    return {
      ...account,
      balance: Number(account.balance),
      _count: account._count || undefined,
    }
  }

  private serializeTransaction(tx: any) {
    return {
      ...tx,
      amount: Number(tx.amount),
    }
  }
}
