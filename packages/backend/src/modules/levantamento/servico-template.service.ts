import { PrismaClient } from '@prisma/client'

interface CreateTemplateInput {
  nome: string
  sinapiCodigo?: string | null
  unidade: string
  areaTipo: 'PISO' | 'PAREDE_LIQ' | 'TETO' | 'PERIMETRO'
  aplicaEm: string[]
  padrao?: boolean
  etapa: string
  order?: number
}

interface UpdateTemplateInput {
  nome?: string
  sinapiCodigo?: string | null
  unidade?: string
  areaTipo?: 'PISO' | 'PAREDE_LIQ' | 'TETO' | 'PERIMETRO'
  aplicaEm?: string[]
  padrao?: boolean
  etapa?: string
  order?: number
  ativo?: boolean
}

// Default templates with common SINAPI composition codes
const DEFAULT_TEMPLATES: CreateTemplateInput[] = [
  // --- Alvenaria ---
  {
    nome: 'Alvenaria de vedação',
    sinapiCodigo: '87292',
    unidade: 'm²',
    areaTipo: 'PAREDE_LIQ',
    aplicaEm: [],
    padrao: true,
    etapa: 'Alvenaria',
    order: 10,
  },
  // --- Revestimento ---
  {
    nome: 'Chapisco interno',
    sinapiCodigo: '87894',
    unidade: 'm²',
    areaTipo: 'PAREDE_LIQ',
    aplicaEm: [],
    padrao: true,
    etapa: 'Revestimento',
    order: 20,
  },
  {
    nome: 'Emboço / massa única',
    sinapiCodigo: '87775',
    unidade: 'm²',
    areaTipo: 'PAREDE_LIQ',
    aplicaEm: [],
    padrao: true,
    etapa: 'Revestimento',
    order: 21,
  },
  {
    nome: 'Revestimento cerâmico (azulejo)',
    sinapiCodigo: '87262',
    unidade: 'm²',
    areaTipo: 'PAREDE_LIQ',
    aplicaEm: ['BANHEIRO', 'COZINHA', 'AREA_SERVICO'],
    padrao: true,
    etapa: 'Revestimento',
    order: 22,
  },
  // --- Pintura ---
  {
    nome: 'Pintura interna (paredes)',
    sinapiCodigo: '88485',
    unidade: 'm²',
    areaTipo: 'PAREDE_LIQ',
    aplicaEm: [],
    padrao: true,
    etapa: 'Pintura',
    order: 30,
  },
  {
    nome: 'Pintura de teto',
    sinapiCodigo: '88487',
    unidade: 'm²',
    areaTipo: 'TETO',
    aplicaEm: [],
    padrao: true,
    etapa: 'Pintura',
    order: 31,
  },
  // --- Piso ---
  {
    nome: 'Contrapiso',
    sinapiCodigo: '87258',
    unidade: 'm²',
    areaTipo: 'PISO',
    aplicaEm: [],
    padrao: true,
    etapa: 'Piso',
    order: 40,
  },
  {
    nome: 'Piso cerâmico / porcelanato',
    sinapiCodigo: '87261',
    unidade: 'm²',
    areaTipo: 'PISO',
    aplicaEm: [],
    padrao: true,
    etapa: 'Piso',
    order: 41,
  },
  {
    nome: 'Rodapé cerâmico',
    sinapiCodigo: '87246',
    unidade: 'm',
    areaTipo: 'PERIMETRO',
    aplicaEm: [],
    padrao: true,
    etapa: 'Piso',
    order: 42,
  },
  // --- Teto ---
  {
    nome: 'Forro de gesso',
    sinapiCodigo: '96112',
    unidade: 'm²',
    areaTipo: 'TETO',
    aplicaEm: [],
    padrao: false,
    etapa: 'Teto',
    order: 50,
  },
  // --- Impermeabilização ---
  {
    nome: 'Impermeabilização',
    sinapiCodigo: '98555',
    unidade: 'm²',
    areaTipo: 'PISO',
    aplicaEm: ['BANHEIRO', 'AREA_SERVICO', 'VARANDA'],
    padrao: true,
    etapa: 'Impermeabilização',
    order: 60,
  },
  // --- Instalações ---
  {
    nome: 'Ponto de instalação elétrica',
    sinapiCodigo: '91928',
    unidade: 'un',
    areaTipo: 'PISO',
    aplicaEm: [],
    padrao: false,
    etapa: 'Instalações',
    order: 70,
  },
  {
    nome: 'Ponto de instalação hidráulica',
    sinapiCodigo: '89449',
    unidade: 'un',
    areaTipo: 'PISO',
    aplicaEm: ['BANHEIRO', 'COZINHA', 'AREA_SERVICO'],
    padrao: false,
    etapa: 'Instalações',
    order: 71,
  },
]

export class ServicoTemplateService {
  constructor(private prisma: PrismaClient) {}

  async list(tenantId: string) {
    return this.prisma.servicoTemplate.findMany({
      where: { tenantId },
      orderBy: [{ order: 'asc' }, { etapa: 'asc' }, { nome: 'asc' }],
    })
  }

  async create(tenantId: string, input: CreateTemplateInput) {
    return this.prisma.servicoTemplate.create({
      data: {
        tenantId,
        nome: input.nome,
        sinapiCodigo: input.sinapiCodigo || null,
        unidade: input.unidade,
        areaTipo: input.areaTipo,
        aplicaEm: input.aplicaEm,
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
        ...(input.nome !== undefined && { nome: input.nome }),
        ...(input.sinapiCodigo !== undefined && { sinapiCodigo: input.sinapiCodigo }),
        ...(input.unidade !== undefined && { unidade: input.unidade }),
        ...(input.areaTipo !== undefined && { areaTipo: input.areaTipo }),
        ...(input.aplicaEm !== undefined && { aplicaEm: input.aplicaEm }),
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

  /**
   * Seeds default templates for a tenant if none exist.
   * Returns the count of created templates.
   */
  async seedDefaults(tenantId: string) {
    const existing = await this.prisma.servicoTemplate.count({
      where: { tenantId },
    })

    if (existing > 0) {
      return { seeded: false, count: existing, message: 'Templates já existem' }
    }

    const data = DEFAULT_TEMPLATES.map((t) => ({
      tenantId,
      nome: t.nome,
      sinapiCodigo: t.sinapiCodigo || null,
      unidade: t.unidade,
      areaTipo: t.areaTipo,
      aplicaEm: t.aplicaEm,
      padrao: t.padrao ?? true,
      etapa: t.etapa,
      order: t.order ?? 0,
    }))

    const result = await this.prisma.servicoTemplate.createMany({ data })
    return { seeded: true, count: result.count, message: `${result.count} templates criados` }
  }

  /**
   * Resets templates to defaults (deletes all and re-creates).
   */
  async resetDefaults(tenantId: string) {
    await this.prisma.servicoTemplate.deleteMany({ where: { tenantId } })

    const data = DEFAULT_TEMPLATES.map((t) => ({
      tenantId,
      nome: t.nome,
      sinapiCodigo: t.sinapiCodigo || null,
      unidade: t.unidade,
      areaTipo: t.areaTipo,
      aplicaEm: t.aplicaEm,
      padrao: t.padrao ?? true,
      etapa: t.etapa,
      order: t.order ?? 0,
    }))

    const result = await this.prisma.servicoTemplate.createMany({ data })
    return { count: result.count, message: `${result.count} templates restaurados` }
  }
}
