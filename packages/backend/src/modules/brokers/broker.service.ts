import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcrypt'
import {
  CreateBrokerInput,
  UpdateBrokerInput,
  ListBrokersQuery,
} from './broker.schemas'

const SALT_ROUNDS = 10

export class BrokerService {
  constructor(private prisma: PrismaClient) {}

  async list(tenantId: string, query: ListBrokersQuery) {
    const { page, limit, search, isActive } = query
    const skip = (page - 1) * limit

    const where: Prisma.BrokerWhereInput = {
      tenantId,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { document: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [brokers, total] = await Promise.all([
      this.prisma.broker.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { sales: true } },
        },
      }),
      this.prisma.broker.count({ where }),
    ])

    return {
      data: brokers.map(b => this.serialize(b)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getById(tenantId: string, id: string) {
    const broker = await this.prisma.broker.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { sales: true } },
      },
    })

    if (!broker) {
      throw new Error('Corretor não encontrado')
    }

    return this.serialize(broker)
  }

  async create(tenantId: string, data: CreateBrokerInput) {
    // If login credentials provided, validate email uniqueness
    if (data.loginEmail) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.loginEmail },
      })
      if (existingUser) {
        throw new Error('Já existe um usuário com este e-mail')
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const broker = await tx.broker.create({
        data: {
          tenantId,
          name: data.name,
          document: data.document,
          creci: data.creci || null,
          commissionRate: data.commissionRate,
          contacts: data.contacts as any,
        },
        include: {
          _count: { select: { sales: true } },
        },
      })

      // Create user account if login credentials provided
      if (data.loginEmail && data.loginPassword) {
        const hashedPassword = await bcrypt.hash(data.loginPassword, SALT_ROUNDS)
        await tx.user.create({
          data: {
            email: data.loginEmail,
            password: hashedPassword,
            name: data.name,
            role: 'BROKER',
            tenantId,
            brokerId: broker.id,
            isApproved: true,
            permissions: {},
          },
        })
      }

      return broker
    })

    return this.serialize(result)
  }

  async update(tenantId: string, id: string, data: UpdateBrokerInput) {
    const existing = await this.prisma.broker.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error('Corretor não encontrado')
    }

    const broker = await this.prisma.broker.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.document !== undefined && { document: data.document }),
        ...(data.creci !== undefined && { creci: data.creci }),
        ...(data.commissionRate !== undefined && { commissionRate: data.commissionRate }),
        ...(data.contacts !== undefined && { contacts: data.contacts as any }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        _count: { select: { sales: true } },
      },
    })

    return this.serialize(broker)
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.broker.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { sales: true } } },
    })

    if (!existing) {
      throw new Error('Corretor não encontrado')
    }

    // If has sales, soft delete (deactivate)
    if (existing._count.sales > 0) {
      await this.prisma.broker.update({
        where: { id },
        data: { isActive: false },
      })
      return { message: 'Corretor desativado (possui vendas vinculadas)' }
    }

    // No sales: hard delete (also delete linked user if exists)
    await this.prisma.$transaction(async (tx) => {
      await tx.user.deleteMany({ where: { brokerId: id } })
      await tx.broker.delete({ where: { id } })
    })

    return { message: 'Corretor excluído com sucesso' }
  }

  private serialize(broker: any) {
    return {
      ...broker,
      commissionRate: broker.commissionRate ? Number(broker.commissionRate) : 0,
    }
  }
}
