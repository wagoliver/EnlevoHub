import bcrypt from 'bcrypt'
import { PrismaClient, Prisma } from '@prisma/client'

const SALT_ROUNDS = 12

export interface CreateUserInput {
  email: string
  password: string
  name: string
  role: 'ROOT' | 'ENGINEER' | 'ADMIN_STAFF' | 'VIEWER'
}

export interface UpdateUserInput {
  name?: string
  role?: 'ROOT' | 'ENGINEER' | 'ADMIN_STAFF' | 'VIEWER'
  isActive?: boolean
}

export class UserService {
  constructor(private prisma: PrismaClient) {}

  async list(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isApproved: true,
        contractorId: true,
        createdAt: true,
        contractor: {
          select: { id: true, name: true, document: true, specialty: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return users
  }

  async create(tenantId: string, data: CreateUserInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existing) {
      throw new Error('Já existe um usuário com este email')
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS)

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role,
        tenantId,
        isApproved: true,
        permissions: {}
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isApproved: true,
        createdAt: true
      }
    })

    return user
  }

  async update(tenantId: string, userId: string, data: UpdateUserInput) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId }
    })

    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isApproved: true,
        contractorId: true,
        createdAt: true
      }
    })

    return updated
  }

  async approve(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId }
    })

    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    if (user.isApproved) {
      throw new Error('Usuário já está aprovado')
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isApproved: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isApproved: true,
        contractorId: true,
        createdAt: true
      }
    })

    return updated
  }

  async reject(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId }
    })

    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    // Deactivate user and remove approval
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isApproved: false, isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isApproved: true,
        contractorId: true,
        createdAt: true
      }
    })

    return updated
  }
}
