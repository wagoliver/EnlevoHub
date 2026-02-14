import { PrismaClient, Prisma } from '@prisma/client'
import type {
  CreateLevantamentoInput,
  UpdateLevantamentoInput,
  CreateItemInput,
  UpdateItemInput,
  FromComposicaoInput,
} from './levantamento.schemas'

export class LevantamentoService {
  constructor(private prisma: PrismaClient) {}

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
          _count: { select: { itens: true } },
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
      },
    })

    if (!levantamento) throw new Error('Levantamento não encontrado')
    return levantamento
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
      include: { itens: true },
    })
    if (!lev) throw new Error('Levantamento não encontrado')

    const etapas = new Map<string, { count: number; total: number }>()
    let totalGeral = 0

    for (const item of lev.itens) {
      const etapa = item.etapa || 'Sem etapa'
      const itemTotal = Number(item.quantidade) * Number(item.precoUnitario)
      totalGeral += itemTotal

      if (!etapas.has(etapa)) {
        etapas.set(etapa, { count: 0, total: 0 })
      }
      const e = etapas.get(etapa)!
      e.count++
      e.total += itemTotal
    }

    return {
      levantamento: {
        id: lev.id,
        nome: lev.nome,
        tipo: lev.tipo,
      },
      totalItens: lev.itens.length,
      totalGeral: Math.round(totalGeral * 100) / 100,
      etapas: Array.from(etapas.entries()).map(([nome, dados]) => ({
        nome,
        itens: dados.count,
        total: Math.round(dados.total * 100) / 100,
      })),
    }
  }
}
