import { PrismaClient } from '@prisma/client'
import { CreateUnitInput, UpdateUnitInput, ListUnitsQuery } from './project.schemas'

function serializeUnit(unit: any) {
  return {
    ...unit,
    area: Number(unit.area),
    price: Number(unit.price),
  }
}

export class UnitService {
  constructor(private prisma: PrismaClient) {}

  async list(tenantId: string, projectId: string, query: ListUnitsQuery) {
    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const where: any = { projectId }

    if (query.status) {
      where.status = query.status
    }

    if (query.type) {
      where.type = query.type
    }

    if (query.search) {
      where.code = { contains: query.search, mode: 'insensitive' }
    }

    const [data, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { code: 'asc' },
      }),
      this.prisma.unit.count({ where }),
    ])

    return {
      data: data.map(serializeUnit),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  }

  async getById(tenantId: string, projectId: string, unitId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, projectId },
    })

    if (!unit) {
      throw new Error('Unidade não encontrada')
    }

    return serializeUnit(unit)
  }

  async create(tenantId: string, projectId: string, data: CreateUnitInput) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    try {
      const unit = await this.prisma.unit.create({
        data: {
          projectId,
          code: data.code,
          type: data.type,
          floor: data.floor,
          area: data.area,
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          price: data.price,
          status: data.status || 'AVAILABLE',
          metadata: data.metadata || undefined,
        },
      })

      return serializeUnit(unit)
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Já existe uma unidade com este código neste projeto')
      }
      throw error
    }
  }

  async update(tenantId: string, projectId: string, unitId: string, data: UpdateUnitInput) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const existing = await this.prisma.unit.findFirst({
      where: { id: unitId, projectId },
    })

    if (!existing) {
      throw new Error('Unidade não encontrada')
    }

    try {
      const unit = await this.prisma.unit.update({
        where: { id: unitId },
        data: {
          ...(data.code !== undefined && { code: data.code }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.floor !== undefined && { floor: data.floor }),
          ...(data.area !== undefined && { area: data.area }),
          ...(data.bedrooms !== undefined && { bedrooms: data.bedrooms }),
          ...(data.bathrooms !== undefined && { bathrooms: data.bathrooms }),
          ...(data.price !== undefined && { price: data.price }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.metadata !== undefined && { metadata: data.metadata }),
        },
      })

      return serializeUnit(unit)
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Já existe uma unidade com este código neste projeto')
      }
      throw error
    }
  }

  async delete(tenantId: string, projectId: string, unitId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const existing = await this.prisma.unit.findFirst({
      where: { id: unitId, projectId },
    })

    if (!existing) {
      throw new Error('Unidade não encontrada')
    }

    await this.prisma.unit.delete({
      where: { id: unitId },
    })

    return { message: 'Unidade excluída com sucesso' }
  }
}
