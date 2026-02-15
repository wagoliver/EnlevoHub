import { PrismaClient, Prisma } from '@prisma/client'
import type {
  CreateLevantamentoInput,
  UpdateLevantamentoInput,
  CreateAmbienteInput,
  UpdateAmbienteInput,
  CreateItemInput,
  UpdateItemInput,
  FromComposicaoInput,
  BatchCreateItemsInput,
} from './levantamento.schemas'

export class LevantamentoService {
  constructor(private prisma: PrismaClient) {}

  /** Count total levantamento items for a tenant (used for workflow status) */
  async countItemsForTenant(tenantId: string): Promise<number> {
    return this.prisma.levantamentoItem.count({
      where: { levantamento: { tenantId } },
    })
  }

  async list(tenantId: string, projectId: string, page: number, limit: number) {
    const skip = (page - 1) * limit
    const where: Prisma.ProjetoLevantamentoWhereInput = { tenantId, projectId }

    const [data, total] = await Promise.all([
      this.prisma.projetoLevantamento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { itens: true, ambientes: true } },
        },
      }),
      this.prisma.projetoLevantamento.count({ where }),
    ])

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async getById(tenantId: string, projectId: string, id: string) {
    const levantamento = await this.prisma.projetoLevantamento.findFirst({
      where: { id, tenantId, projectId },
      include: {
        itens: { orderBy: [{ etapa: 'asc' }, { createdAt: 'asc' }] },
        ambientes: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      },
    })

    if (!levantamento) throw new Error('Levantamento não encontrado')
    return levantamento
  }

  async getOrCreateForFloorPlan(tenantId: string, projectId: string, floorPlanId: string) {
    // Check if levantamento already exists for this floorPlan
    const existing = await this.prisma.projetoLevantamento.findFirst({
      where: { projectId, floorPlanId, tenantId },
      include: {
        itens: { orderBy: [{ etapa: 'asc' }, { createdAt: 'asc' }] },
        ambientes: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      },
    })
    if (existing) return existing

    // Verify floorPlan belongs to project/tenant
    const floorPlan = await this.prisma.floorPlan.findFirst({
      where: { id: floorPlanId, project: { id: projectId, tenantId } },
    })
    if (!floorPlan) throw new Error('Planta não encontrada')

    // Auto-create
    return this.prisma.projetoLevantamento.create({
      data: {
        tenantId,
        projectId,
        floorPlanId,
        nome: floorPlan.name,
      },
      include: {
        itens: { orderBy: [{ etapa: 'asc' }, { createdAt: 'asc' }] },
        ambientes: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      },
    })
  }

  async create(tenantId: string, projectId: string, data: CreateLevantamentoInput) {
    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })
    if (!project) throw new Error('Projeto não encontrado')

    return this.prisma.projetoLevantamento.create({
      data: {
        tenantId,
        projectId,
        ...data,
      },
      include: {
        _count: { select: { itens: true } },
      },
    })
  }

  async update(tenantId: string, projectId: string, id: string, data: UpdateLevantamentoInput) {
    const existing = await this.prisma.projetoLevantamento.findFirst({
      where: { id, tenantId, projectId },
    })
    if (!existing) throw new Error('Levantamento não encontrado')

    return this.prisma.projetoLevantamento.update({
      where: { id },
      data,
      include: {
        _count: { select: { itens: true } },
      },
    })
  }

  async delete(tenantId: string, projectId: string, id: string) {
    const existing = await this.prisma.projetoLevantamento.findFirst({
      where: { id, tenantId, projectId },
    })
    if (!existing) throw new Error('Levantamento não encontrado')

    await this.prisma.projetoLevantamento.delete({ where: { id } })
    return { success: true }
  }

  // --- Ambientes ---

  async listAmbientes(tenantId: string, projectId: string, levantamentoId: string) {
    const lev = await this.prisma.projetoLevantamento.findFirst({
      where: { id: levantamentoId, tenantId, projectId },
    })
    if (!lev) throw new Error('Levantamento não encontrado')

    return this.prisma.ambiente.findMany({
      where: { levantamentoId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { itens: true } } },
    })
  }

  async createAmbiente(tenantId: string, projectId: string, levantamentoId: string, data: CreateAmbienteInput) {
    const lev = await this.prisma.projetoLevantamento.findFirst({
      where: { id: levantamentoId, tenantId, projectId },
    })
    if (!lev) throw new Error('Levantamento não encontrado')

    return this.prisma.ambiente.create({
      data: {
        levantamentoId,
        ...data,
      },
      include: { _count: { select: { itens: true } } },
    })
  }

  async updateAmbiente(tenantId: string, projectId: string, levantamentoId: string, ambienteId: string, data: UpdateAmbienteInput) {
    const lev = await this.prisma.projetoLevantamento.findFirst({
      where: { id: levantamentoId, tenantId, projectId },
    })
    if (!lev) throw new Error('Levantamento não encontrado')

    const ambiente = await this.prisma.ambiente.findFirst({
      where: { id: ambienteId, levantamentoId },
    })
    if (!ambiente) throw new Error('Ambiente não encontrado')

    return this.prisma.ambiente.update({
      where: { id: ambienteId },
      data,
      include: { _count: { select: { itens: true } } },
    })
  }

  async deleteAmbiente(tenantId: string, projectId: string, levantamentoId: string, ambienteId: string) {
    const lev = await this.prisma.projetoLevantamento.findFirst({
      where: { id: levantamentoId, tenantId, projectId },
    })
    if (!lev) throw new Error('Levantamento não encontrado')

    const ambiente = await this.prisma.ambiente.findFirst({
      where: { id: ambienteId, levantamentoId },
    })
    if (!ambiente) throw new Error('Ambiente não encontrado')

    // Delete items belonging to this ambiente before deleting
    await this.prisma.levantamentoItem.deleteMany({
      where: { ambienteId },
    })

    await this.prisma.ambiente.delete({ where: { id: ambienteId } })
    return { success: true }
  }

  // --- Items ---

  async addItem(tenantId: string, projectId: string, levantamentoId: string, data: CreateItemInput) {
    const lev = await this.prisma.projetoLevantamento.findFirst({
      where: { id: levantamentoId, tenantId, projectId },
    })
    if (!lev) throw new Error('Levantamento não encontrado')

    return this.prisma.levantamentoItem.create({
      data: {
        levantamentoId,
        ...data,
      },
    })
  }

  async updateItem(tenantId: string, projectId: string, levantamentoId: string, itemId: string, data: UpdateItemInput) {
    const lev = await this.prisma.projetoLevantamento.findFirst({
      where: { id: levantamentoId, tenantId, projectId },
    })
    if (!lev) throw new Error('Levantamento não encontrado')

    const item = await this.prisma.levantamentoItem.findFirst({
      where: { id: itemId, levantamentoId },
    })
    if (!item) throw new Error('Item não encontrado')

    return this.prisma.levantamentoItem.update({
      where: { id: itemId },
      data,
    })
  }

  async deleteItem(tenantId: string, projectId: string, levantamentoId: string, itemId: string) {
    const lev = await this.prisma.projetoLevantamento.findFirst({
      where: { id: levantamentoId, tenantId, projectId },
    })
    if (!lev) throw new Error('Levantamento não encontrado')

    await this.prisma.levantamentoItem.delete({ where: { id: itemId } })
    return { success: true }
  }

  async batchCreateItems(tenantId: string, projectId: string, levantamentoId: string, input: BatchCreateItemsInput) {
    const lev = await this.prisma.projetoLevantamento.findFirst({
      where: { id: levantamentoId, tenantId, projectId },
    })
    if (!lev) throw new Error('Levantamento não encontrado')

    const data = input.itens.map((item) => ({
      levantamentoId,
      nome: item.nome,
      unidade: item.unidade,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
      etapa: item.etapa || null,
      ambienteId: item.ambienteId || null,
      sinapiComposicaoId: item.sinapiComposicaoId || null,
      projectActivityId: item.projectActivityId || null,
      observacoes: item.observacoes || null,
    }))

    const result = await this.prisma.levantamentoItem.createMany({ data })
    return { addedCount: result.count }
  }

  // --- SINAPI Integration ---

  async addFromComposicao(
    tenantId: string,
    projectId: string,
    levantamentoId: string,
    input: FromComposicaoInput,
  ) {
    const lev = await this.prisma.projetoLevantamento.findFirst({
      where: { id: levantamentoId, tenantId, projectId },
    })
    if (!lev) throw new Error('Levantamento não encontrado')

    const composicao = await this.prisma.sinapiComposicao.findUnique({
      where: { id: input.composicaoId },
      include: {
        itens: {
          include: {
            insumo: {
              include: {
                precos: {
                  where: { uf: input.uf, mesReferencia: input.mesReferencia },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })

    if (!composicao) throw new Error('Composição SINAPI não encontrada')

    const itensToCreate = composicao.itens.map((item) => {
      const preco = item.insumo.precos[0]
      const precoUnitario = preco
        ? Number(input.desonerado ? preco.precoDesonerado : preco.precoNaoDesonerado)
        : 0
      const coeficiente = Number(item.coeficiente)

      return {
        levantamentoId,
        ambienteId: input.ambienteId || null,
        nome: item.insumo.descricao,
        unidade: item.insumo.unidade,
        quantidade: coeficiente * input.quantidade,
        precoUnitario,
        etapa: input.etapa || composicao.descricao,
        sinapiInsumoId: item.insumoId,
        sinapiComposicaoId: composicao.id,
      }
    })

    await this.prisma.levantamentoItem.createMany({ data: itensToCreate })

    return {
      addedCount: itensToCreate.length,
      composicao: { codigo: composicao.codigo, descricao: composicao.descricao },
    }
  }

  // --- Summary ---

  async getResumo(tenantId: string, projectId: string, levantamentoId: string) {
    const lev = await this.prisma.projetoLevantamento.findFirst({
      where: { id: levantamentoId, tenantId, projectId },
      include: {
        itens: true,
        ambientes: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      },
    })
    if (!lev) throw new Error('Levantamento não encontrado')

    const ambienteMap = new Map<string, { id: string; nome: string; count: number; total: number }>()
    let semAmbiente = { count: 0, total: 0 }
    let totalGeral = 0

    // Pre-populate with all ambientes (even empty ones)
    for (const amb of lev.ambientes) {
      ambienteMap.set(amb.id, { id: amb.id, nome: amb.nome, count: 0, total: 0 })
    }

    for (const item of lev.itens) {
      const itemTotal = Number(item.quantidade) * Number(item.precoUnitario)
      totalGeral += itemTotal

      if (item.ambienteId && ambienteMap.has(item.ambienteId)) {
        const a = ambienteMap.get(item.ambienteId)!
        a.count++
        a.total += itemTotal
      } else {
        semAmbiente.count++
        semAmbiente.total += itemTotal
      }
    }

    const ambientes = Array.from(ambienteMap.values()).map((a) => ({
      id: a.id,
      nome: a.nome,
      itens: a.count,
      total: Math.round(a.total * 100) / 100,
    }))

    if (semAmbiente.count > 0) {
      ambientes.push({
        id: '',
        nome: 'Sem ambiente',
        itens: semAmbiente.count,
        total: Math.round(semAmbiente.total * 100) / 100,
      })
    }

    return {
      levantamento: {
        id: lev.id,
        nome: lev.nome,
        tipo: lev.tipo,
      },
      totalItens: lev.itens.length,
      totalAmbientes: lev.ambientes.length,
      totalGeral: Math.round(totalGeral * 100) / 100,
      ambientes,
    }
  }
}
