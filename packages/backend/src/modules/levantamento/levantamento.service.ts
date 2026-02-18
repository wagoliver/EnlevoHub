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

  /**
   * Load floor plan measurements (or rooms as fallback) for a project
   * and return as Ambiente-ready data.
   */
  private async loadMeasurementsForProject(projectId: string) {
    const floorPlans = await this.prisma.floorPlan.findMany({
      where: { projectId },
      include: {
        measurements: { orderBy: { order: 'asc' } },
        rooms: { orderBy: { order: 'asc' } },
      },
      orderBy: { name: 'asc' },
    })

    const result: any[] = []

    for (const fp of floorPlans) {
      // Prefer measurements if available
      if (fp.measurements.length > 0) {
        for (const m of fp.measurements) {
          result.push({
            nome: m.label,
            tags: [],
            comprimento: 0,
            largura: 0,
            peDireito: 0,
            qtdPortas: 0,
            qtdJanelas: 0,
            valorDireto: m.value,
            tipoMedicao: m.measurementType,
            areaTipo: m.areaTipo,
            order: m.order,
          })
        }
      } else if (fp.rooms.length > 0) {
        // Fallback to rooms for backward compat
        for (const r of fp.rooms) {
          result.push({
            nome: r.nome,
            tags: r.tags,
            comprimento: r.comprimento,
            largura: r.largura,
            peDireito: r.peDireito,
            qtdPortas: r.qtdPortas,
            qtdJanelas: r.qtdJanelas,
            order: r.order,
          })
        }
      }
    }

    return result
  }

  /**
   * If an existing levantamento has 0 ambientes, try to import from FloorPlan measurements/rooms.
   * Returns the refreshed levantamento with ambientes.
   */
  private async autoImportIfEmpty(levantamento: any, projectId: string) {
    if (levantamento.ambientes.length > 0) return levantamento

    const ambientesData = await this.loadMeasurementsForProject(projectId)
    if (ambientesData.length === 0) return levantamento

    await this.prisma.ambiente.createMany({
      data: ambientesData.map((r) => ({ levantamentoId: levantamento.id, ...r })),
    })

    // Re-fetch with populated ambientes
    return this.prisma.projetoLevantamento.findFirst({
      where: { id: levantamento.id },
      include: {
        itens: { orderBy: [{ etapa: 'asc' }, { createdAt: 'asc' }] },
        ambientes: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      },
    })
  }

  async getOrCreateForFloorPlan(tenantId: string, projectId: string, floorPlanId: string) {
    const existing = await this.prisma.projetoLevantamento.findFirst({
      where: { projectId, floorPlanId, tenantId },
      include: {
        itens: { orderBy: [{ etapa: 'asc' }, { createdAt: 'asc' }] },
        ambientes: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      },
    })
    if (existing) return this.autoImportIfEmpty(existing, projectId)

    const floorPlan = await this.prisma.floorPlan.findFirst({
      where: { id: floorPlanId, project: { id: projectId, tenantId } },
      include: {
        measurements: { orderBy: { order: 'asc' } },
        rooms: { orderBy: { order: 'asc' } },
      },
    })
    if (!floorPlan) throw new Error('Planta não encontrada')

    // Build ambientes from measurements or rooms (fallback)
    const ambientesData: any[] = []
    if (floorPlan.measurements.length > 0) {
      for (const m of floorPlan.measurements) {
        ambientesData.push({
          nome: m.label,
          tags: [],
          comprimento: 0,
          largura: 0,
          peDireito: 0,
          qtdPortas: 0,
          qtdJanelas: 0,
          valorDireto: m.value,
          tipoMedicao: m.measurementType,
          areaTipo: m.areaTipo,
          order: m.order,
        })
      }
    } else if (floorPlan.rooms.length > 0) {
      for (const r of floorPlan.rooms) {
        ambientesData.push({
          nome: r.nome,
          tags: r.tags,
          comprimento: r.comprimento,
          largura: r.largura,
          peDireito: r.peDireito,
          qtdPortas: r.qtdPortas,
          qtdJanelas: r.qtdJanelas,
          order: r.order,
        })
      }
    }

    return this.prisma.projetoLevantamento.create({
      data: {
        tenantId,
        projectId,
        floorPlanId,
        nome: floorPlan.name,
        ...(ambientesData.length > 0 && {
          ambientes: { create: ambientesData },
        }),
      },
      include: {
        itens: { orderBy: [{ etapa: 'asc' }, { createdAt: 'asc' }] },
        ambientes: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      },
    })
  }

  async getOrCreateForProject(tenantId: string, projectId: string) {
    const existing = await this.prisma.projetoLevantamento.findFirst({
      where: { projectId, tenantId, floorPlanId: null },
      include: {
        itens: { orderBy: [{ etapa: 'asc' }, { createdAt: 'asc' }] },
        ambientes: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      },
    })
    if (existing) return this.autoImportIfEmpty(existing, projectId)

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })
    if (!project) throw new Error('Projeto não encontrado')

    const allAmbientes = await this.loadMeasurementsForProject(projectId)

    return this.prisma.projetoLevantamento.create({
      data: {
        tenantId,
        projectId,
        floorPlanId: null,
        nome: project.name,
        ...(allAmbientes.length > 0 && {
          ambientes: { create: allAmbientes },
        }),
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
        projectActivityId: input.projectActivityId || null,
      }
    })

    await this.prisma.levantamentoItem.createMany({ data: itensToCreate })

    return {
      addedCount: itensToCreate.length,
      composicao: { codigo: composicao.codigo, descricao: composicao.descricao },
    }
  }

  // --- Report ---

  async getReportData(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })
    if (!project) throw new Error('Projeto não encontrado')

    const levantamento = await this.prisma.projetoLevantamento.findFirst({
      where: { projectId, tenantId, floorPlanId: null },
      include: {
        itens: {
          orderBy: [{ etapa: 'asc' }, { createdAt: 'asc' }],
          include: { ambiente: { select: { id: true, nome: true } } },
        },
        ambientes: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      },
    })

    if (!levantamento) {
      return {
        project: { id: project.id, name: project.name },
        levantamento: null,
        stats: { totalItens: 0, totalGeral: 0, totalAmbientes: 0, qtdEtapas: 0 },
        byEtapa: [],
        byAmbiente: [],
        items: [],
      }
    }

    const items = levantamento.itens.map((item) => {
      const quantidade = Number(item.quantidade)
      const precoUnitario = Number(item.precoUnitario)
      return {
        id: item.id,
        nome: item.nome,
        unidade: item.unidade,
        quantidade,
        precoUnitario,
        total: Math.round(quantidade * precoUnitario * 100) / 100,
        etapa: item.etapa || null,
        ambienteNome: item.ambiente?.nome || null,
      }
    })

    // Group by etapa
    const etapaMap = new Map<string, { itemCount: number; total: number }>()
    for (const item of items) {
      const key = item.etapa || '__sem_etapa__'
      const entry = etapaMap.get(key) || { itemCount: 0, total: 0 }
      entry.itemCount++
      entry.total += item.total
      etapaMap.set(key, entry)
    }
    const byEtapa = Array.from(etapaMap.entries()).map(([etapa, data]) => ({
      etapa: etapa === '__sem_etapa__' ? null : etapa,
      itemCount: data.itemCount,
      total: Math.round(data.total * 100) / 100,
    }))

    // Group by ambiente
    const ambienteMap = new Map<string, { id: string; nome: string; itemCount: number; total: number }>()
    for (const amb of levantamento.ambientes) {
      ambienteMap.set(amb.id, { id: amb.id, nome: amb.nome, itemCount: 0, total: 0 })
    }
    let semAmbiente = { itemCount: 0, total: 0 }
    for (const item of items) {
      const ambId = levantamento.itens.find((i) => i.id === item.id)?.ambienteId
      if (ambId && ambienteMap.has(ambId)) {
        const a = ambienteMap.get(ambId)!
        a.itemCount++
        a.total += item.total
      } else {
        semAmbiente.itemCount++
        semAmbiente.total += item.total
      }
    }
    const byAmbiente = Array.from(ambienteMap.values()).map((a) => ({
      id: a.id,
      nome: a.nome,
      itemCount: a.itemCount,
      total: Math.round(a.total * 100) / 100,
    }))
    if (semAmbiente.itemCount > 0) {
      byAmbiente.push({ id: '', nome: 'Sem ambiente', itemCount: semAmbiente.itemCount, total: Math.round(semAmbiente.total * 100) / 100 })
    }

    const totalGeral = items.reduce((sum, i) => sum + i.total, 0)
    const etapasSet = new Set(items.map((i) => i.etapa || '__sem_etapa__'))

    return {
      project: { id: project.id, name: project.name },
      levantamento: { id: levantamento.id, nome: levantamento.nome },
      stats: {
        totalItens: items.length,
        totalGeral: Math.round(totalGeral * 100) / 100,
        totalAmbientes: levantamento.ambientes.length,
        qtdEtapas: etapasSet.size,
      },
      byEtapa,
      byAmbiente,
      items,
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
