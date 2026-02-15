import { PrismaClient } from '@prisma/client'

interface CreateTemplateInput {
  sinapiCodigo?: string | null
  nomeCustom?: string | null
  areaTipo: 'PISO' | 'PAREDE_LIQ' | 'PAREDE_BRUTA' | 'TETO' | 'PERIMETRO' | 'MANUAL'
  tags: string[]
  padrao?: boolean
  etapa: string
  order?: number
}

interface UpdateTemplateInput {
  sinapiCodigo?: string | null
  nomeCustom?: string | null
  areaTipo?: 'PISO' | 'PAREDE_LIQ' | 'PAREDE_BRUTA' | 'TETO' | 'PERIMETRO' | 'MANUAL'
  tags?: string[]
  padrao?: boolean
  etapa?: string
  order?: number
  ativo?: boolean
}

// Default templates: sinapiCodigo is the identity. Name/unit come from SINAPI at query time.
// Templates with tags=[] apply to ALL rooms. Templates with tags=['AREA_MOLHADA'] only for wet areas.
const DEFAULT_TEMPLATES: CreateTemplateInput[] = [
  // --- Base services (all rooms) ---
  { sinapiCodigo: '103324', areaTipo: 'PAREDE_LIQ', tags: [], padrao: true, etapa: 'Alvenaria', order: 10 },
  { sinapiCodigo: '87879', areaTipo: 'PAREDE_LIQ', tags: [], padrao: true, etapa: 'Revestimento', order: 20 },
  { sinapiCodigo: '87535', areaTipo: 'PAREDE_LIQ', tags: [], padrao: true, etapa: 'Revestimento', order: 21 },
  { sinapiCodigo: '87620', areaTipo: 'PISO', tags: [], padrao: true, etapa: 'Piso', order: 40 },
  { sinapiCodigo: '87263', areaTipo: 'PISO', tags: [], padrao: true, etapa: 'Piso', order: 41 },
  { sinapiCodigo: '88648', areaTipo: 'PERIMETRO', tags: [], padrao: true, etapa: 'Piso', order: 42 },
  { sinapiCodigo: '88489', areaTipo: 'PAREDE_LIQ', tags: [], padrao: true, etapa: 'Pintura', order: 50 },
  { sinapiCodigo: '88488', areaTipo: 'TETO', tags: [], padrao: true, etapa: 'Pintura', order: 51 },
  { sinapiCodigo: '91947', areaTipo: 'MANUAL', tags: [], padrao: false, etapa: 'Instalações', order: 70 },

  // --- Área Molhada (banheiro, cozinha, etc.) ---
  { sinapiCodigo: '98555', areaTipo: 'PISO', tags: ['AREA_MOLHADA'], padrao: true, etapa: 'Impermeabilização', order: 30 },
  { sinapiCodigo: '87265', areaTipo: 'PAREDE_LIQ', tags: ['AREA_MOLHADA'], padrao: true, etapa: 'Revestimento', order: 22 },
  { nomeCustom: 'Ponto de instalação hidráulica', areaTipo: 'MANUAL', tags: ['AREA_MOLHADA'], padrao: false, etapa: 'Instalações', order: 71 },

  // --- Área Externa (varanda, terraço, etc.) ---
  { sinapiCodigo: '98555', areaTipo: 'PISO', tags: ['AREA_EXTERNA'], padrao: true, etapa: 'Impermeabilização', order: 31 },

  // --- Opcional (não padrão) ---
  { sinapiCodigo: '96109', areaTipo: 'TETO', tags: [], padrao: false, etapa: 'Teto', order: 60 },
]

// Default tags for room characteristics
const DEFAULT_TAGS = [
  {
    nome: 'Área Molhada',
    slug: 'AREA_MOLHADA',
    descricao: 'Ambientes com piso molhado: banheiros, cozinhas, áreas de serviço',
    cor: '#3b82f6',
    order: 1,
  },
  {
    nome: 'Área Externa',
    slug: 'AREA_EXTERNA',
    descricao: 'Ambientes expostos ao tempo: varandas, terraços, áreas descobertas',
    cor: '#f59e0b',
    order: 2,
  },
  {
    nome: 'Tráfego Pesado',
    slug: 'TRAFEGO_PESADO',
    descricao: 'Ambientes com tráfego intenso: garagens, depósitos, galpões',
    cor: '#ef4444',
    order: 3,
  },
  {
    nome: 'Área Técnica',
    slug: 'AREA_TECNICA',
    descricao: 'Ambientes técnicos: CPD, casa de máquinas, subestação',
    cor: '#8b5cf6',
    order: 4,
  },
]

export class ServicoTemplateService {
  constructor(private prisma: PrismaClient) {}

  async list(tenantId: string) {
    const templates = await this.prisma.servicoTemplate.findMany({
      where: { tenantId },
      orderBy: [{ order: 'asc' }, { etapa: 'asc' }],
    })

    // Enrich with SINAPI composition data
    const codigos = templates
      .map((t) => t.sinapiCodigo)
      .filter((c): c is string => !!c)

    const composicoes = codigos.length > 0
      ? await this.prisma.sinapiComposicao.findMany({
          where: { codigo: { in: codigos } },
          select: { codigo: true, descricao: true, unidade: true },
        })
      : []

    const compMap = new Map(composicoes.map((c) => [c.codigo, c]))

    return templates.map((t) => {
      const comp = t.sinapiCodigo ? compMap.get(t.sinapiCodigo) : null
      return {
        ...t,
        nome: comp?.descricao || t.nomeCustom || '(sem nome)',
        unidade: comp?.unidade || 'UN',
        sinapiDescricao: comp?.descricao || null,
      }
    })
  }

  async create(tenantId: string, input: CreateTemplateInput) {
    return this.prisma.servicoTemplate.create({
      data: {
        tenantId,
        sinapiCodigo: input.sinapiCodigo || null,
        nomeCustom: input.nomeCustom || null,
        areaTipo: input.areaTipo,
        tags: input.tags,
        padrao: input.padrao ?? true,
        etapa: input.etapa,
        order: input.order ?? 0,
      },
    })
  }

  async update(tenantId: string, id: string, input: UpdateTemplateInput) {
    const template = await this.prisma.servicoTemplate.findFirst({
      where: { id, tenantId },
    })
    if (!template) throw new Error('Template não encontrado')

    return this.prisma.servicoTemplate.update({
      where: { id },
      data: {
        ...(input.sinapiCodigo !== undefined && { sinapiCodigo: input.sinapiCodigo }),
        ...(input.nomeCustom !== undefined && { nomeCustom: input.nomeCustom }),
        ...(input.areaTipo !== undefined && { areaTipo: input.areaTipo }),
        ...(input.tags !== undefined && { tags: input.tags }),
        ...(input.padrao !== undefined && { padrao: input.padrao }),
        ...(input.etapa !== undefined && { etapa: input.etapa }),
        ...(input.order !== undefined && { order: input.order }),
        ...(input.ativo !== undefined && { ativo: input.ativo }),
      },
    })
  }

  async delete(tenantId: string, id: string) {
    const template = await this.prisma.servicoTemplate.findFirst({
      where: { id, tenantId },
    })
    if (!template) throw new Error('Template não encontrado')

    await this.prisma.servicoTemplate.delete({ where: { id } })
    return { deleted: true }
  }

  async seedDefaults(tenantId: string) {
    const existing = await this.prisma.servicoTemplate.count({
      where: { tenantId },
    })

    if (existing > 0) {
      return { seeded: false, count: existing, message: 'Templates já existem' }
    }

    // Seed tags first
    await this.seedTags(tenantId)

    const data = DEFAULT_TEMPLATES.map((t) => ({
      tenantId,
      sinapiCodigo: t.sinapiCodigo || null,
      nomeCustom: t.nomeCustom || null,
      areaTipo: t.areaTipo,
      tags: t.tags,
      padrao: t.padrao ?? true,
      etapa: t.etapa,
      order: t.order ?? 0,
    }))

    const result = await this.prisma.servicoTemplate.createMany({ data })
    return { seeded: true, count: result.count, message: `${result.count} templates criados` }
  }

  async resetDefaults(tenantId: string) {
    await this.prisma.servicoTemplate.deleteMany({ where: { tenantId } })

    // Re-seed tags
    await this.seedTags(tenantId)

    const data = DEFAULT_TEMPLATES.map((t) => ({
      tenantId,
      sinapiCodigo: t.sinapiCodigo || null,
      nomeCustom: t.nomeCustom || null,
      areaTipo: t.areaTipo,
      tags: t.tags,
      padrao: t.padrao ?? true,
      etapa: t.etapa,
      order: t.order ?? 0,
    }))

    const result = await this.prisma.servicoTemplate.createMany({ data })
    return { count: result.count, message: `${result.count} templates restaurados` }
  }

  // --- Ambiente Tags ---

  async listTags(tenantId: string) {
    return this.prisma.ambienteTag.findMany({
      where: { tenantId },
      orderBy: [{ order: 'asc' }, { nome: 'asc' }],
    })
  }

  async createTag(tenantId: string, input: { nome: string; slug: string; descricao?: string; cor?: string; order?: number }) {
    return this.prisma.ambienteTag.create({
      data: {
        tenantId,
        nome: input.nome,
        slug: input.slug,
        descricao: input.descricao || null,
        cor: input.cor || '#3b82f6',
        order: input.order ?? 0,
      },
    })
  }

  async updateTag(tenantId: string, id: string, input: { nome?: string; descricao?: string | null; cor?: string; order?: number; ativo?: boolean }) {
    const tag = await this.prisma.ambienteTag.findFirst({
      where: { id, tenantId },
    })
    if (!tag) throw new Error('Tag não encontrada')

    return this.prisma.ambienteTag.update({
      where: { id },
      data: {
        ...(input.nome !== undefined && { nome: input.nome }),
        ...(input.descricao !== undefined && { descricao: input.descricao }),
        ...(input.cor !== undefined && { cor: input.cor }),
        ...(input.order !== undefined && { order: input.order }),
        ...(input.ativo !== undefined && { ativo: input.ativo }),
      },
    })
  }

  async deleteTag(tenantId: string, id: string) {
    const tag = await this.prisma.ambienteTag.findFirst({
      where: { id, tenantId },
    })
    if (!tag) throw new Error('Tag não encontrada')

    await this.prisma.ambienteTag.delete({ where: { id } })
    return { deleted: true }
  }

  async seedTags(tenantId: string) {
    const existing = await this.prisma.ambienteTag.count({
      where: { tenantId },
    })
    if (existing > 0) return { seeded: false, count: existing }

    const data = DEFAULT_TAGS.map((t) => ({ tenantId, ...t }))
    const result = await this.prisma.ambienteTag.createMany({ data })
    return { seeded: true, count: result.count }
  }
}
