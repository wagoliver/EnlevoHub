import { PrismaClient } from '@prisma/client'

interface ReconciliationSuggestion {
  entityType: string
  entityId: string
  entityName: string
  confidence: number // 0-100
  reason: string
}

export class ReconciliationService {
  constructor(private prisma: PrismaClient) {}

  /** Remove pontuação de CNPJ/CPF para comparação normalizada */
  private normalizeCnpj(doc: string): string {
    return doc.replace(/[.\/-]/g, '')
  }

  async getImportedTransactions(tenantId: string, filter?: string) {
    const where: any = {
      user: { tenantId },
      importBatchId: { not: null },
    }

    if (filter === 'PENDING') {
      where.reconciliationStatus = 'PENDING'
    } else if (filter === 'MATCHED') {
      where.reconciliationStatus = { in: ['AUTO_MATCHED', 'MANUAL_MATCHED'] }
    } else if (filter === 'IGNORED') {
      where.reconciliationStatus = 'IGNORED'
    }
    // 'ALL' or undefined = no filter on reconciliationStatus

    const transactions = await this.prisma.financialTransaction.findMany({
      where,
      include: {
        bankAccount: { select: { bankName: true } },
      },
      orderBy: { date: 'desc' },
    })
    return transactions.map(tx => ({
      ...tx,
      amount: Number(tx.amount),
    }))
  }

  async getSuggestions(tenantId: string, transactionId: string): Promise<ReconciliationSuggestion[]> {
    const transaction = await this.prisma.financialTransaction.findFirst({
      where: { id: transactionId, user: { tenantId } },
    })
    if (!transaction) throw new Error('Transação não encontrada')

    const suggestions: ReconciliationSuggestion[] = []
    const description = (transaction.rawDescription || transaction.description).toUpperCase()
    const amount = Number(transaction.amount)

    // 1. Match by CNPJ in description
    const cnpjMatch = description.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/g)
    if (cnpjMatch) {
      for (const rawCnpj of cnpjMatch) {
        const cleanCnpj = this.normalizeCnpj(rawCnpj)

        // Check suppliers (busca tanto formato limpo quanto formatado)
        const suppliers = await this.prisma.supplier.findMany({
          where: {
            tenantId,
            OR: [
              { document: { contains: cleanCnpj } },
              { document: { contains: rawCnpj } },
            ],
          },
          select: { id: true, name: true, document: true },
        })
        for (const supplier of suppliers) {
          suggestions.push({
            entityType: 'supplier',
            entityId: supplier.id,
            entityName: supplier.name,
            confidence: 90,
            reason: `CNPJ ${supplier.document} encontrado na descrição`,
          })
        }

        // Check contractors (busca tanto formato limpo quanto formatado)
        const contractors = await this.prisma.contractor.findMany({
          where: {
            tenantId,
            OR: [
              { document: { contains: cleanCnpj } },
              { document: { contains: rawCnpj } },
            ],
          },
          select: { id: true, name: true, document: true },
        })
        for (const contractor of contractors) {
          suggestions.push({
            entityType: 'contractor',
            entityId: contractor.id,
            entityName: contractor.name,
            confidence: 90,
            reason: `CNPJ ${contractor.document} encontrado na descrição`,
          })
        }
      }
    }

    // 2. Match by value + date proximity (±3 days) against purchase orders
    if (transaction.type === 'EXPENSE') {
      const dateWindow = 3 * 24 * 60 * 60 * 1000 // 3 days in ms
      const dateLow = new Date(transaction.date.getTime() - dateWindow)
      const dateHigh = new Date(transaction.date.getTime() + dateWindow)

      const purchases = await this.prisma.purchaseOrder.findMany({
        where: {
          project: { tenantId },
          totalAmount: amount,
          orderDate: { gte: dateLow, lte: dateHigh },
          status: { in: ['APPROVED', 'ORDERED', 'DELIVERED'] },
        },
        include: {
          supplier: { select: { name: true } },
          project: { select: { name: true } },
        },
        take: 5,
      })

      for (const po of purchases) {
        // Avoid duplicate suggestions
        const alreadySuggested = suggestions.some(s => s.entityType === 'purchase' && s.entityId === po.id)
        if (!alreadySuggested) {
          suggestions.push({
            entityType: 'purchase',
            entityId: po.id,
            entityName: `OC ${po.orderNumber} - ${po.supplier.name} (${po.project.name})`,
            confidence: 70,
            reason: `Valor R$ ${amount.toFixed(2)} e data próxima`,
          })
        }
      }
    }

    // 3. Match by name in description
    const [suppliers, contractors] = await Promise.all([
      this.prisma.supplier.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true },
      }),
      this.prisma.contractor.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true },
      }),
    ])

    for (const supplier of suppliers) {
      const nameWords = supplier.name.toUpperCase().split(/\s+/).filter(w => w.length > 3)
      const matchCount = nameWords.filter(w => description.includes(w)).length
      if (matchCount >= 2 || (nameWords.length === 1 && matchCount === 1 && nameWords[0].length > 5)) {
        const alreadySuggested = suggestions.some(s => s.entityId === supplier.id)
        if (!alreadySuggested) {
          suggestions.push({
            entityType: 'supplier',
            entityId: supplier.id,
            entityName: supplier.name,
            confidence: 50,
            reason: `Nome "${supplier.name}" encontrado na descrição`,
          })
        }
      }
    }

    for (const contractor of contractors) {
      const nameWords = contractor.name.toUpperCase().split(/\s+/).filter(w => w.length > 3)
      const matchCount = nameWords.filter(w => description.includes(w)).length
      if (matchCount >= 2 || (nameWords.length === 1 && matchCount === 1 && nameWords[0].length > 5)) {
        const alreadySuggested = suggestions.some(s => s.entityId === contractor.id)
        if (!alreadySuggested) {
          suggestions.push({
            entityType: 'contractor',
            entityId: contractor.id,
            entityName: contractor.name,
            confidence: 50,
            reason: `Nome "${contractor.name}" encontrado na descrição`,
          })
        }
      }
    }

    // Sort by confidence descending
    suggestions.sort((a, b) => b.confidence - a.confidence)
    return suggestions
  }

  async matchTransaction(tenantId: string, transactionId: string, entityType: string, entityId: string, entityName: string) {
    const transaction = await this.prisma.financialTransaction.findFirst({
      where: { id: transactionId, user: { tenantId } },
    })
    if (!transaction) throw new Error('Transação não encontrada')

    const updated = await this.prisma.financialTransaction.update({
      where: { id: transactionId },
      data: {
        reconciliationStatus: 'MANUAL_MATCHED',
        linkedEntityType: entityType,
        linkedEntityId: entityId,
        linkedEntityName: entityName,
      },
    })
    return { ...updated, amount: Number(updated.amount) }
  }

  async unlinkTransaction(tenantId: string, transactionId: string) {
    const transaction = await this.prisma.financialTransaction.findFirst({
      where: { id: transactionId, user: { tenantId } },
    })
    if (!transaction) throw new Error('Transação não encontrada')

    const updated = await this.prisma.financialTransaction.update({
      where: { id: transactionId },
      data: {
        reconciliationStatus: 'PENDING',
        linkedEntityType: null,
        linkedEntityId: null,
        linkedEntityName: null,
      },
    })
    return { ...updated, amount: Number(updated.amount) }
  }

  async ignoreTransaction(tenantId: string, transactionId: string) {
    const transaction = await this.prisma.financialTransaction.findFirst({
      where: { id: transactionId, user: { tenantId } },
    })
    if (!transaction) throw new Error('Transação não encontrada')

    const updated = await this.prisma.financialTransaction.update({
      where: { id: transactionId },
      data: { reconciliationStatus: 'IGNORED' },
    })
    return { ...updated, amount: Number(updated.amount) }
  }

  async searchEntities(tenantId: string, search: string) {
    const results: Array<{ entityType: string; entityId: string; entityName: string; document?: string }> = []

    if (!search || search.length < 2) return results

    const [suppliers, contractors] = await Promise.all([
      this.prisma.supplier.findMany({
        where: {
          tenantId,
          isActive: true,
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { document: { contains: search } },
          ],
        },
        select: { id: true, name: true, document: true },
        take: 10,
      }),
      this.prisma.contractor.findMany({
        where: {
          tenantId,
          isActive: true,
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { document: { contains: search } },
          ],
        },
        select: { id: true, name: true, document: true },
        take: 10,
      }),
    ])

    for (const s of suppliers) {
      results.push({ entityType: 'supplier', entityId: s.id, entityName: s.name, document: s.document })
    }
    for (const c of contractors) {
      results.push({ entityType: 'contractor', entityId: c.id, entityName: c.name, document: c.document })
    }

    return results
  }

  async autoReconcile(tenantId: string, batchId: string): Promise<number> {
    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        importBatchId: batchId,
        reconciliationStatus: 'PENDING',
      },
    })

    return this.reconcileTransactions(tenantId, transactions)
  }

  /** Re-executa conciliação automática em TODAS as transações pendentes do tenant */
  async rerunAutoReconcile(tenantId: string): Promise<number> {
    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        user: { tenantId },
        importBatchId: { not: null },
        reconciliationStatus: 'PENDING',
      },
    })

    return this.reconcileTransactions(tenantId, transactions)
  }

  private async reconcileTransactions(tenantId: string, transactions: any[]): Promise<number> {
    let matched = 0

    for (const tx of transactions) {
      const description = (tx.rawDescription || tx.description).toUpperCase()

      // Try CNPJ match
      const cnpjMatch = description.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/g)
      if (cnpjMatch) {
        let found = false
        for (const rawCnpj of cnpjMatch) {
          const cleanCnpj = this.normalizeCnpj(rawCnpj)

          const supplier = await this.prisma.supplier.findFirst({
            where: {
              tenantId,
              OR: [
                { document: { contains: cleanCnpj } },
                { document: { contains: rawCnpj } },
              ],
            },
            select: { id: true, name: true },
          })

          if (supplier) {
            await this.prisma.financialTransaction.update({
              where: { id: tx.id },
              data: {
                reconciliationStatus: 'AUTO_MATCHED',
                linkedEntityType: 'supplier',
                linkedEntityId: supplier.id,
                linkedEntityName: supplier.name,
              },
            })
            matched++
            found = true
            break
          }

          const contractor = await this.prisma.contractor.findFirst({
            where: {
              tenantId,
              OR: [
                { document: { contains: cleanCnpj } },
                { document: { contains: rawCnpj } },
              ],
            },
            select: { id: true, name: true },
          })

          if (contractor) {
            await this.prisma.financialTransaction.update({
              where: { id: tx.id },
              data: {
                reconciliationStatus: 'AUTO_MATCHED',
                linkedEntityType: 'contractor',
                linkedEntityId: contractor.id,
                linkedEntityName: contractor.name,
              },
            })
            matched++
            found = true
            break
          }
        }
        if (found) continue
      }

      // Try name match (same logic as getSuggestions, strategy 3)
      const [suppliers, contractors] = await Promise.all([
        this.prisma.supplier.findMany({
          where: { tenantId, isActive: true },
          select: { id: true, name: true },
        }),
        this.prisma.contractor.findMany({
          where: { tenantId, isActive: true },
          select: { id: true, name: true },
        }),
      ])

      let nameMatched = false

      for (const supplier of suppliers) {
        const nameWords = supplier.name.toUpperCase().split(/\s+/).filter(w => w.length > 3)
        const matchCount = nameWords.filter(w => description.includes(w)).length
        if (matchCount >= 2 || (nameWords.length === 1 && matchCount === 1 && nameWords[0].length > 5)) {
          await this.prisma.financialTransaction.update({
            where: { id: tx.id },
            data: {
              reconciliationStatus: 'AUTO_MATCHED',
              linkedEntityType: 'supplier',
              linkedEntityId: supplier.id,
              linkedEntityName: supplier.name,
            },
          })
          matched++
          nameMatched = true
          break
        }
      }

      if (nameMatched) continue

      for (const contractor of contractors) {
        const nameWords = contractor.name.toUpperCase().split(/\s+/).filter(w => w.length > 3)
        const matchCount = nameWords.filter(w => description.includes(w)).length
        if (matchCount >= 2 || (nameWords.length === 1 && matchCount === 1 && nameWords[0].length > 5)) {
          await this.prisma.financialTransaction.update({
            where: { id: tx.id },
            data: {
              reconciliationStatus: 'AUTO_MATCHED',
              linkedEntityType: 'contractor',
              linkedEntityId: contractor.id,
              linkedEntityName: contractor.name,
            },
          })
          matched++
          break
        }
      }
    }

    return matched
  }
}
