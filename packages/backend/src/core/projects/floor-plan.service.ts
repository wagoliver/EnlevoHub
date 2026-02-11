import { PrismaClient } from '@prisma/client'
import { CreateFloorPlanInput, UpdateFloorPlanInput } from './project.schemas'

function serializeFloorPlan(fp: any) {
  return {
    ...fp,
    area: Number(fp.area),
    defaultPrice: Number(fp.defaultPrice),
  }
}

export class FloorPlanService {
  constructor(private prisma: PrismaClient) {}

  async list(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const floorPlans = await this.prisma.floorPlan.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { units: true } },
      },
    })

    return floorPlans.map(serializeFloorPlan)
  }

  async create(tenantId: string, projectId: string, data: CreateFloorPlanInput) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    try {
      const floorPlan = await this.prisma.floorPlan.create({
        data: {
          projectId,
          name: data.name,
          description: data.description,
          type: data.type,
          area: data.area,
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          defaultPrice: data.defaultPrice,
          metadata: data.metadata || undefined,
        },
        include: {
          _count: { select: { units: true } },
        },
      })

      return serializeFloorPlan(floorPlan)
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Já existe uma planta com este nome neste projeto')
      }
      throw error
    }
  }

  async update(tenantId: string, projectId: string, floorPlanId: string, data: UpdateFloorPlanInput) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const existing = await this.prisma.floorPlan.findFirst({
      where: { id: floorPlanId, projectId },
    })

    if (!existing) {
      throw new Error('Planta não encontrada')
    }

    try {
      const floorPlan = await this.prisma.floorPlan.update({
        where: { id: floorPlanId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.area !== undefined && { area: data.area }),
          ...(data.bedrooms !== undefined && { bedrooms: data.bedrooms }),
          ...(data.bathrooms !== undefined && { bathrooms: data.bathrooms }),
          ...(data.defaultPrice !== undefined && { defaultPrice: data.defaultPrice }),
          ...(data.metadata !== undefined && { metadata: data.metadata }),
        },
        include: {
          _count: { select: { units: true } },
        },
      })

      return serializeFloorPlan(floorPlan)
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Já existe uma planta com este nome neste projeto')
      }
      throw error
    }
  }

  async delete(tenantId: string, projectId: string, floorPlanId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const existing = await this.prisma.floorPlan.findFirst({
      where: { id: floorPlanId, projectId },
    })

    if (!existing) {
      throw new Error('Planta não encontrada')
    }

    await this.prisma.floorPlan.delete({
      where: { id: floorPlanId },
    })

    return { message: 'Planta excluída com sucesso' }
  }
}
