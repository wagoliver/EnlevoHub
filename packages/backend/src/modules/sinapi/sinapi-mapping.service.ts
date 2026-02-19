import { PrismaClient, Prisma } from '@prisma/client'

export interface CreateMappingInput {
  fase: string
  etapa: string
  atividade: string
  sinapiCodigo?: string | null
  unidade?: string | null
  grupoSinapi?: string | null
  order?: number
}

export interface UpdateMappingInput {
  fase?: string
  etapa?: string
  atividade?: string
  sinapiCodigo?: string | null
  unidade?: string | null
  grupoSinapi?: string | null
  order?: number
}

export class SinapiMappingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Lista mapeamentos do tenant.
   * Se o tenant não tiver nenhum, retorna os do sistema (tenantId=null).
   */
  async list(tenantId: string, filters?: { fase?: string; search?: string; page?: number; limit?: number }) {
    const page = filters?.page || 1
    const limit = filters?.limit || 100

    // Check if tenant has own mappings
    const tenantCount = await this.prisma.etapaSinapiMapping.count({
      where: { tenantId },
    })

    const isSystem = tenantCount === 0
    const effectiveTenantId = isSystem ? null : tenantId

    const where: Prisma.EtapaSinapiMappingWhereInput = {
      tenantId: effectiveTenantId,
      ...(filters?.fase && { fase: filters.fase }),
      ...(filters?.search && {
        OR: [
          { fase: { contains: filters.search, mode: 'insensitive' } },
          { etapa: { contains: filters.search, mode: 'insensitive' } },
          { atividade: { contains: filters.search, mode: 'insensitive' } },
          { sinapiCodigo: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    }

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      this.prisma.etapaSinapiMapping.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ fase: 'asc' }, { etapa: 'asc' }, { order: 'asc' }],
      }),
      this.prisma.etapaSinapiMapping.count({ where }),
    ])

    return {
      data,
      isSystem,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async create(tenantId: string, data: CreateMappingInput) {
    return this.prisma.etapaSinapiMapping.create({
      data: {
        tenantId,
        fase: data.fase,
        etapa: data.etapa,
        atividade: data.atividade,
        sinapiCodigo: data.sinapiCodigo || null,
        unidade: data.unidade || null,
        grupoSinapi: data.grupoSinapi || null,
        order: data.order || 0,
      },
    })
  }

  async update(tenantId: string, id: string, data: UpdateMappingInput) {
    const mapping = await this.prisma.etapaSinapiMapping.findFirst({
      where: { id, tenantId },
    })
    if (!mapping) throw new Error('Mapeamento não encontrado')

    return this.prisma.etapaSinapiMapping.update({
      where: { id },
      data,
    })
  }

  async delete(tenantId: string, id: string) {
    const mapping = await this.prisma.etapaSinapiMapping.findFirst({
      where: { id, tenantId },
    })
    if (!mapping) throw new Error('Mapeamento não encontrado')

    return this.prisma.etapaSinapiMapping.delete({ where: { id } })
  }

  /**
   * Copia mapeamentos do sistema (tenantId=null) para o tenant.
   */
  async copySystemToTenant(tenantId: string): Promise<number> {
    // Check if tenant already has mappings
    const existing = await this.prisma.etapaSinapiMapping.count({
      where: { tenantId },
    })
    if (existing > 0) {
      throw new Error('Tenant já possui mapeamentos personalizados')
    }

    const systemMappings = await this.prisma.etapaSinapiMapping.findMany({
      where: { tenantId: null },
    })

    if (systemMappings.length === 0) {
      throw new Error('Nenhum mapeamento de sistema encontrado')
    }

    await this.prisma.etapaSinapiMapping.createMany({
      data: systemMappings.map((m) => ({
        tenantId,
        fase: m.fase,
        etapa: m.etapa,
        atividade: m.atividade,
        sinapiCodigo: m.sinapiCodigo,
        unidade: m.unidade,
        grupoSinapi: m.grupoSinapi,
        order: m.order,
      })),
    })

    return systemMappings.length
  }

  async listFases(tenantId: string): Promise<string[]> {
    const tenantCount = await this.prisma.etapaSinapiMapping.count({
      where: { tenantId },
    })
    const effectiveTenantId = tenantCount === 0 ? null : tenantId

    const rows = await this.prisma.etapaSinapiMapping.findMany({
      where: { tenantId: effectiveTenantId },
      select: { fase: true },
      distinct: ['fase'],
      orderBy: { fase: 'asc' },
    })

    return rows.map((r) => r.fase)
  }

  async findByFaseEtapa(tenantId: string, fase: string, etapa: string) {
    const tenantCount = await this.prisma.etapaSinapiMapping.count({
      where: { tenantId },
    })
    const effectiveTenantId = tenantCount === 0 ? null : tenantId

    return this.prisma.etapaSinapiMapping.findMany({
      where: {
        tenantId: effectiveTenantId,
        fase: { equals: fase, mode: 'insensitive' },
        etapa: { equals: etapa, mode: 'insensitive' },
      },
      orderBy: { order: 'asc' },
    })
  }

  // ---- System (ROOT only, tenantId=null) ----

  async createSystem(data: CreateMappingInput) {
    return this.prisma.etapaSinapiMapping.create({
      data: {
        tenantId: null,
        fase: data.fase,
        etapa: data.etapa,
        atividade: data.atividade,
        sinapiCodigo: data.sinapiCodigo || null,
        unidade: data.unidade || null,
        grupoSinapi: data.grupoSinapi || null,
        order: data.order || 0,
      },
    })
  }

  async updateSystem(id: string, data: UpdateMappingInput) {
    const mapping = await this.prisma.etapaSinapiMapping.findFirst({
      where: { id, tenantId: null },
    })
    if (!mapping) throw new Error('Mapeamento de sistema não encontrado')

    return this.prisma.etapaSinapiMapping.update({
      where: { id },
      data,
    })
  }

  async deleteSystem(id: string) {
    const mapping = await this.prisma.etapaSinapiMapping.findFirst({
      where: { id, tenantId: null },
    })
    if (!mapping) throw new Error('Mapeamento de sistema não encontrado')

    return this.prisma.etapaSinapiMapping.delete({ where: { id } })
  }
}
