import { PrismaClient } from '@prisma/client'
import { CreateFloorPlanInput, UpdateFloorPlanInput } from './project.schemas'

function serializeFloorPlan(fp: any) {
  return {
    ...fp,
    area: Number(fp.area),
    defaultPrice: fp.defaultPrice != null ? Number(fp.defaultPrice) : null,
    rooms: (fp.rooms || []).map((r: any) => ({
      ...r,
      comprimento: Number(r.comprimento),
      largura: Number(r.largura),
      peDireito: Number(r.peDireito),
    })),
  }
}

const ROOMS_INCLUDE = {
  rooms: { orderBy: { order: 'asc' as const } },
  _count: { select: { units: true } },
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
      include: ROOMS_INCLUDE,
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

    const { rooms, ...floorPlanData } = data
    const hasRooms = rooms && rooms.length > 0

    try {
      const floorPlan = await this.prisma.floorPlan.create({
        data: {
          projectId,
          name: floorPlanData.name,
          description: floorPlanData.description,
          type: floorPlanData.type,
          area: floorPlanData.area,
          bedrooms: floorPlanData.bedrooms,
          bathrooms: floorPlanData.bathrooms,
          ...(floorPlanData.defaultPrice !== undefined && { defaultPrice: floorPlanData.defaultPrice }),
          detalhado: !!hasRooms,
          metadata: floorPlanData.metadata || undefined,
          ...(hasRooms && {
            rooms: {
              create: rooms.map((r, i) => ({
                nome: r.nome,
                presetKey: r.presetKey,
                tags: r.tags,
                comprimento: r.comprimento,
                largura: r.largura,
                peDireito: r.peDireito,
                qtdPortas: r.qtdPortas,
                qtdJanelas: r.qtdJanelas,
                order: i,
              })),
            },
          }),
        },
        include: ROOMS_INCLUDE,
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

    const { rooms, ...floorPlanData } = data
    const roomsProvided = rooms !== undefined

    try {
      // If rooms are provided, delete existing and recreate
      if (roomsProvided) {
        await this.prisma.floorPlanRoom.deleteMany({
          where: { floorPlanId },
        })
      }

      const hasRooms = roomsProvided && rooms && rooms.length > 0

      const floorPlan = await this.prisma.floorPlan.update({
        where: { id: floorPlanId },
        data: {
          ...(floorPlanData.name !== undefined && { name: floorPlanData.name }),
          ...(floorPlanData.description !== undefined && { description: floorPlanData.description }),
          ...(floorPlanData.type !== undefined && { type: floorPlanData.type }),
          ...(floorPlanData.area !== undefined && { area: floorPlanData.area }),
          ...(floorPlanData.bedrooms !== undefined && { bedrooms: floorPlanData.bedrooms }),
          ...(floorPlanData.bathrooms !== undefined && { bathrooms: floorPlanData.bathrooms }),
          ...(floorPlanData.defaultPrice !== undefined && { defaultPrice: floorPlanData.defaultPrice }),
          ...(floorPlanData.metadata !== undefined && { metadata: floorPlanData.metadata }),
          ...(roomsProvided && { detalhado: !!hasRooms }),
          ...(hasRooms && {
            rooms: {
              create: rooms!.map((r, i) => ({
                nome: r.nome,
                presetKey: r.presetKey,
                tags: r.tags,
                comprimento: r.comprimento,
                largura: r.largura,
                peDireito: r.peDireito,
                qtdPortas: r.qtdPortas,
                qtdJanelas: r.qtdJanelas,
                order: i,
              })),
            },
          }),
        },
        include: ROOMS_INCLUDE,
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
