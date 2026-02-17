import { PrismaClient } from '@prisma/client'
import { CreateUnitInput, UpdateUnitInput, ListUnitsQuery, BulkGenerateInput, BulkDeleteUnitsInput } from './project.schemas'

function serializeUnit(unit: any) {
  return {
    ...unit,
    area: Number(unit.area),
    price: unit.price != null ? Number(unit.price) : null,
    unitActivities: unit.unitActivities?.map((ua: any) => ({
      ...ua,
      progress: Number(ua.progress),
    })),
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

    if (query.blockId) {
      where.blockId = query.blockId
    }

    if (query.floorPlanId) {
      where.floorPlanId = query.floorPlanId
    }

    const [data, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { code: 'asc' },
        include: {
          block: { select: { id: true, name: true } },
          floorPlan: { select: { id: true, name: true } },
          unitActivities: {
            select: {
              id: true,
              status: true,
              progress: true,
              activity: {
                select: { id: true, name: true, level: true },
              },
            },
          },
        },
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
      include: {
        block: { select: { id: true, name: true } },
        floorPlan: { select: { id: true, name: true } },
      },
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
          blockId: data.blockId || undefined,
          floorPlanId: data.floorPlanId || undefined,
          metadata: data.metadata || undefined,
        },
        include: {
          block: { select: { id: true, name: true } },
          floorPlan: { select: { id: true, name: true } },
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
          ...(data.blockId !== undefined && { blockId: data.blockId }),
          ...(data.floorPlanId !== undefined && { floorPlanId: data.floorPlanId }),
          ...(data.metadata !== undefined && { metadata: data.metadata }),
        },
        include: {
          block: { select: { id: true, name: true } },
          floorPlan: { select: { id: true, name: true } },
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

  async bulkDelete(tenantId: string, projectId: string, data: BulkDeleteUnitsInput) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.unit.findMany({
        where: { id: { in: data.unitIds }, projectId },
        select: { id: true },
      })

      if (existing.length === 0) {
        throw new Error('Nenhuma unidade encontrada')
      }

      const existingIds = existing.map(u => u.id)

      const deleted = await tx.unit.deleteMany({
        where: { id: { in: existingIds }, projectId },
      })

      return deleted
    })

    return {
      message: `${result.count} unidade(s) excluída(s) com sucesso`,
      count: result.count,
    }
  }

  generateCodes(input: BulkGenerateInput, blocks: { id: string; name: string }[], floorPlans: { id: string; name: string; type: string; area: number; bedrooms: number | null; bathrooms: number | null; defaultPrice: number }[]) {
    const units: {
      code: string
      type: string
      floor: number
      area: number
      bedrooms: number | null
      bathrooms: number | null
      price: number
      blockId: string | null
      blockName: string | null
      floorPlanId: string
      floorPlanName: string
    }[] = []

    const blockList = input.blockIds && input.blockIds.length > 0
      ? blocks.filter(b => input.blockIds!.includes(b.id))
      : [null]

    for (const block of blockList) {
      for (let floor = input.startFloor; floor < input.startFloor + input.floors; floor++) {
        let seq = 1
        for (const item of input.items) {
          const fp = floorPlans.find(f => f.id === item.floorPlanId)
          if (!fp) continue

          for (let u = 0; u < item.unitsPerFloor; u++) {
            let code: string

            switch (input.codePattern) {
              case 'BLOCO_ANDAR_SEQ':
                code = block
                  ? `${block.name}-${floor}${String(seq).padStart(2, '0')}`
                  : `${floor}${String(seq).padStart(2, '0')}`
                break
              case 'SEQUENCIAL': {
                const prefix = input.codePrefix || 'UN'
                const globalSeq = units.length + 1
                code = `${prefix}-${String(globalSeq).padStart(3, '0')}`
                break
              }
              case 'PERSONALIZADO': {
                const prefix = input.codePrefix || 'UN'
                code = block
                  ? `${prefix}${block.name}-${floor}${String(seq).padStart(2, '0')}`
                  : `${prefix}-${floor}${String(seq).padStart(2, '0')}`
                break
              }
              default:
                code = `${floor}${String(seq).padStart(2, '0')}`
            }

            units.push({
              code,
              type: fp.type,
              floor,
              area: fp.area,
              bedrooms: fp.bedrooms,
              bathrooms: fp.bathrooms,
              price: fp.defaultPrice,
              blockId: block?.id || null,
              blockName: block?.name || null,
              floorPlanId: fp.id,
              floorPlanName: fp.name,
            })

            seq++
          }
        }
      }
    }

    return units
  }

  async previewGenerate(tenantId: string, projectId: string, input: BulkGenerateInput) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const [blocks, floorPlans] = await Promise.all([
      input.blockIds && input.blockIds.length > 0
        ? this.prisma.block.findMany({
            where: { id: { in: input.blockIds }, projectId },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      this.prisma.floorPlan.findMany({
        where: { id: { in: input.items.map(i => i.floorPlanId) }, projectId },
      }),
    ])

    const serializedFps = floorPlans.map(fp => ({
      id: fp.id,
      name: fp.name,
      type: fp.type,
      area: Number(fp.area),
      bedrooms: fp.bedrooms,
      bathrooms: fp.bathrooms,
      defaultPrice: Number(fp.defaultPrice),
    }))

    const units = this.generateCodes(input, blocks, serializedFps)

    // Check for duplicates against existing units
    const existingCodes = await this.prisma.unit.findMany({
      where: { projectId, code: { in: units.map(u => u.code) } },
      select: { code: true },
    })

    const existingSet = new Set(existingCodes.map(u => u.code))
    const conflicts = units.filter(u => existingSet.has(u.code)).map(u => u.code)

    return {
      units,
      total: units.length,
      conflicts,
      hasConflicts: conflicts.length > 0,
    }
  }

  async bulkGenerate(tenantId: string, projectId: string, input: BulkGenerateInput) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const [blocks, floorPlans] = await Promise.all([
      input.blockIds && input.blockIds.length > 0
        ? this.prisma.block.findMany({
            where: { id: { in: input.blockIds }, projectId },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      this.prisma.floorPlan.findMany({
        where: { id: { in: input.items.map(i => i.floorPlanId) }, projectId },
      }),
    ])

    const serializedFps = floorPlans.map(fp => ({
      id: fp.id,
      name: fp.name,
      type: fp.type,
      area: Number(fp.area),
      bedrooms: fp.bedrooms,
      bathrooms: fp.bathrooms,
      defaultPrice: Number(fp.defaultPrice),
    }))

    const units = this.generateCodes(input, blocks, serializedFps)

    // Atomic transaction
    const created = await this.prisma.$transaction(async (tx) => {
      // Check for conflicts inside transaction
      const existingCodes = await tx.unit.findMany({
        where: { projectId, code: { in: units.map(u => u.code) } },
        select: { code: true },
      })

      if (existingCodes.length > 0) {
        throw new Error(
          `Códigos já existem neste projeto: ${existingCodes.map(u => u.code).join(', ')}`
        )
      }

      const result = await tx.unit.createMany({
        data: units.map(u => ({
          projectId,
          code: u.code,
          type: u.type as any,
          floor: u.floor,
          area: u.area,
          bedrooms: u.bedrooms,
          bathrooms: u.bathrooms,
          price: u.price,
          status: 'AVAILABLE' as const,
          blockId: u.blockId,
          floorPlanId: u.floorPlanId,
        })),
      })

      return result
    })

    return {
      message: `${created.count} unidades criadas com sucesso`,
      count: created.count,
    }
  }
}
