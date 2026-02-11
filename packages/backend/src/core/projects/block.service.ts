import { PrismaClient } from '@prisma/client'
import { CreateBlockInput, UpdateBlockInput } from './project.schemas'

export class BlockService {
  constructor(private prisma: PrismaClient) {}

  async list(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const blocks = await this.prisma.block.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { units: true } },
      },
    })

    return blocks
  }

  async create(tenantId: string, projectId: string, data: CreateBlockInput) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    try {
      const block = await this.prisma.block.create({
        data: {
          projectId,
          name: data.name,
          floors: data.floors,
          metadata: data.metadata || undefined,
        },
        include: {
          _count: { select: { units: true } },
        },
      })

      return block
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Já existe um bloco com este nome neste projeto')
      }
      throw error
    }
  }

  async update(tenantId: string, projectId: string, blockId: string, data: UpdateBlockInput) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const existing = await this.prisma.block.findFirst({
      where: { id: blockId, projectId },
    })

    if (!existing) {
      throw new Error('Bloco não encontrado')
    }

    try {
      const block = await this.prisma.block.update({
        where: { id: blockId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.floors !== undefined && { floors: data.floors }),
          ...(data.metadata !== undefined && { metadata: data.metadata }),
        },
        include: {
          _count: { select: { units: true } },
        },
      })

      return block
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Já existe um bloco com este nome neste projeto')
      }
      throw error
    }
  }

  async delete(tenantId: string, projectId: string, blockId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const existing = await this.prisma.block.findFirst({
      where: { id: blockId, projectId },
    })

    if (!existing) {
      throw new Error('Bloco não encontrado')
    }

    await this.prisma.block.delete({
      where: { id: blockId },
    })

    return { message: 'Bloco excluído com sucesso' }
  }
}
