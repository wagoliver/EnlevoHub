import { PrismaClient } from '@prisma/client'
import { CreateEvolutionInput, UpdateEvolutionInput } from './project.schemas'

export class EvolutionService {
  constructor(private prisma: PrismaClient) {}

  async listByProject(tenantId: string, projectId: string) {
    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const evolutions = await this.prisma.projectEvolution.findMany({
      where: { projectId },
      orderBy: { date: 'desc' },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    return evolutions.map(e => ({
      ...e,
      percentage: Number(e.percentage),
    }))
  }

  async create(tenantId: string, projectId: string, userId: string, data: CreateEvolutionInput) {
    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const evolution = await this.prisma.projectEvolution.create({
      data: {
        projectId,
        date: data.date ? new Date(data.date) : new Date(),
        percentage: data.percentage,
        phase: data.phase,
        notes: data.notes,
        photos: data.photos || [],
        reportedBy: userId,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    return {
      ...evolution,
      percentage: Number(evolution.percentage),
    }
  }

  async update(tenantId: string, projectId: string, evolutionId: string, data: UpdateEvolutionInput) {
    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const existing = await this.prisma.projectEvolution.findFirst({
      where: { id: evolutionId, projectId },
    })

    if (!existing) {
      throw new Error('Evolução não encontrada')
    }

    const evolution = await this.prisma.projectEvolution.update({
      where: { id: evolutionId },
      data: {
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.percentage !== undefined && { percentage: data.percentage }),
        ...(data.phase !== undefined && { phase: data.phase }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.photos !== undefined && { photos: data.photos }),
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    return {
      ...evolution,
      percentage: Number(evolution.percentage),
    }
  }

  async delete(tenantId: string, projectId: string, evolutionId: string) {
    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const existing = await this.prisma.projectEvolution.findFirst({
      where: { id: evolutionId, projectId },
    })

    if (!existing) {
      throw new Error('Evolução não encontrada')
    }

    await this.prisma.projectEvolution.delete({
      where: { id: evolutionId },
    })

    return { message: 'Evolução excluída com sucesso' }
  }
}
