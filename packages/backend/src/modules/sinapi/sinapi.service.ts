import { PrismaClient, Prisma } from '@prisma/client'
import type { SearchInsumosQuery, SearchComposicoesQuery, CalculateComposicaoQuery } from './sinapi.schemas'

function buildSearchFilter(search: string) {
  const words = search.trim().split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0) return undefined

  if (words.length === 1) {
    return {
      OR: [
        { codigo: { contains: words[0], mode: 'insensitive' as const } },
        { descricao: { contains: words[0], mode: 'insensitive' as const } },
      ],
    }
  }

  return {
    OR: [
      { codigo: { contains: search.trim(), mode: 'insensitive' as const } },
      {
        AND: words.map(word => ({
          descricao: { contains: word, mode: 'insensitive' as const },
        })),
      },
    ],
  }
}

export class SinapiService {
  constructor(private prisma: PrismaClient) {}

  async getMesesDisponiveis() {
    const rows = await this.prisma.$queryRaw<{ mesReferencia: string }[]>`
      SELECT DISTINCT "mesReferencia" FROM sinapi_precos ORDER BY "mesReferencia" DESC
    `
    return rows.map((r) => r.mesReferencia)
  }

  async getStats() {
    const [insumos, composicoes, precos, meses] = await Promise.all([
      this.prisma.sinapiInsumo.count(),
      this.prisma.sinapiComposicao.count(),
      this.prisma.sinapiPreco.count(),
      this.prisma.$queryRaw<{ mesReferencia: string }[]>`
        SELECT DISTINCT "mesReferencia" FROM sinapi_precos ORDER BY "mesReferencia" DESC
      `,
    ])

    return {
      insumos,
      composicoes,
      precos,
      meses: meses.map((r) => r.mesReferencia),
    }
  }

  async searchInsumos(query: SearchInsumosQuery) {
    const { search, tipo, page, limit } = query
    const skip = (page - 1) * limit

    const where: Prisma.SinapiInsumoWhereInput = {
      ...(tipo && { tipo }),
      ...(search && buildSearchFilter(search)),
    }

    const [data, total] = await Promise.all([
      this.prisma.sinapiInsumo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { codigo: 'asc' },
      }),
      this.prisma.sinapiInsumo.count({ where }),
    ])

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async getInsumo(id: string) {
    const insumo = await this.prisma.sinapiInsumo.findUnique({
      where: { id },
      include: {
        precos: {
          orderBy: [{ mesReferencia: 'desc' }, { uf: 'asc' }],
          take: 54, // 27 UFs x 2 meses recentes
        },
      },
    })

    if (!insumo) throw new Error('Insumo SINAPI não encontrado')
    return insumo
  }

  async searchComposicoes(query: SearchComposicoesQuery) {
    const { search, grupo, page, limit } = query
    const skip = (page - 1) * limit

    const where: Prisma.SinapiComposicaoWhereInput = {
      ...(search && buildSearchFilter(search)),
      ...(grupo && { grupo: { contains: grupo, mode: 'insensitive' as const } }),
    }

    const [data, total] = await Promise.all([
      this.prisma.sinapiComposicao.findMany({
        where,
        skip,
        take: limit,
        orderBy: { codigo: 'asc' },
      }),
      this.prisma.sinapiComposicao.count({ where }),
    ])

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async listGrupos() {
    const rows = await this.prisma.$queryRaw<{ grupo: string }[]>`
      SELECT DISTINCT grupo FROM sinapi_composicoes WHERE grupo IS NOT NULL ORDER BY grupo
    `
    return rows.map((r) => r.grupo)
  }

  async getComposicao(id: string) {
    const composicao = await this.prisma.sinapiComposicao.findUnique({
      where: { id },
      include: {
        itens: {
          include: {
            insumo: true,
          },
          orderBy: { insumo: { tipo: 'asc' } },
        },
      },
    })

    if (!composicao) throw new Error('Composição SINAPI não encontrada')
    return composicao
  }

  /**
   * Recursively calculate the unit cost of a composition, including sub-compositions.
   * Returns { custoUnitario, itensSemPreco, itensCalculados }.
   */
  private async resolveComposicaoCost(
    composicaoId: string,
    uf: string,
    mesReferencia: string,
    desonerado: boolean,
    visited = new Set<string>(),
    depth = 0,
  ): Promise<{ custoUnitario: number; itensSemPreco: number; itensCalculados: any[] }> {
    if (depth > 5 || visited.has(composicaoId)) {
      return { custoUnitario: 0, itensSemPreco: 0, itensCalculados: [] }
    }
    visited.add(composicaoId)

    const comp = await this.prisma.sinapiComposicao.findUnique({
      where: { id: composicaoId },
      include: {
        itens: {
          include: {
            insumo: {
              include: {
                precos: {
                  where: { uf, mesReferencia },
                  take: 1,
                },
              },
            },
          },
        },
        filhos: {
          include: { filho: true },
        },
      },
    })

    if (!comp) return { custoUnitario: 0, itensSemPreco: 0, itensCalculados: [] }

    let custoTotal = 0
    let semPreco = 0
    const itensCalculados: any[] = []

    // Direct insumos
    for (const item of comp.itens) {
      const preco = item.insumo.precos[0]
      const precoUnitario = preco
        ? Number(desonerado ? preco.precoDesonerado : preco.precoNaoDesonerado)
        : 0
      const coeficiente = Number(item.coeficiente)
      const custoUnitario = precoUnitario * coeficiente
      if (!preco) semPreco++
      custoTotal += custoUnitario

      itensCalculados.push({
        insumoId: item.insumoId,
        codigo: item.insumo.codigo,
        descricao: item.insumo.descricao,
        unidade: item.insumo.unidade,
        tipo: item.insumo.tipo,
        coeficiente,
        precoUnitario,
        custoUnitario,
        temPreco: !!preco,
      })
    }

    // Sub-compositions (recursive)
    for (const filho of comp.filhos) {
      const coef = Number(filho.coeficiente)
      const sub = await this.resolveComposicaoCost(
        filho.filhoId, uf, mesReferencia, desonerado, visited, depth + 1,
      )
      custoTotal += sub.custoUnitario * coef
      semPreco += sub.itensSemPreco
    }

    return { custoUnitario: custoTotal, itensSemPreco: semPreco, itensCalculados }
  }

  async calculateComposicao(id: string, query: CalculateComposicaoQuery) {
    const { uf, mesReferencia, quantidade, desonerado } = query

    const composicao = await this.prisma.sinapiComposicao.findUnique({
      where: { id },
      select: { id: true, codigo: true, descricao: true, unidade: true },
    })

    if (!composicao) throw new Error('Composição SINAPI não encontrada')

    const { custoUnitario, itensSemPreco, itensCalculados } = await this.resolveComposicaoCost(
      id, uf, mesReferencia, desonerado,
    )

    const custoTotal = custoUnitario * quantidade

    return {
      composicao: {
        id: composicao.id,
        codigo: composicao.codigo,
        descricao: composicao.descricao,
        unidade: composicao.unidade,
      },
      parametros: { uf, mesReferencia, quantidade, desonerado },
      itens: itensCalculados,
      custoUnitarioTotal: Math.round(custoUnitario * 100) / 100,
      custoTotal: Math.round(custoTotal * 100) / 100,
      itensSemPreco,
    }
  }

  /**
   * Batch-resolve: given an array of SINAPI codes, look up each by exact code match,
   * recursively calculate the unit cost (including sub-compositions),
   * and return a map { codigo: { id, descricao, unidade, custoUnitarioTotal } }.
   */
  async batchResolve(
    codigos: string[],
    uf: string,
    mesReferencia: string,
    desonerado: boolean,
  ) {
    if (codigos.length === 0) return {}

    // Exact match lookup — one query for all codes
    const composicoes = await this.prisma.sinapiComposicao.findMany({
      where: { codigo: { in: codigos } },
      select: { id: true, codigo: true, descricao: true, unidade: true },
    })

    const result: Record<string, {
      id: string
      codigo: string
      descricao: string
      unidade: string
      custoUnitarioTotal: number
      itensSemPreco: number
    }> = {}

    for (const comp of composicoes) {
      const { custoUnitario, itensSemPreco } = await this.resolveComposicaoCost(
        comp.id, uf, mesReferencia, desonerado,
      )

      result[comp.codigo] = {
        id: comp.id,
        codigo: comp.codigo,
        descricao: comp.descricao,
        unidade: comp.unidade,
        custoUnitarioTotal: Math.round(custoUnitario * 100) / 100,
        itensSemPreco,
      }
    }

    return result
  }

  /**
   * Returns the full composition tree (insumos + sub-compositions recursively) with prices.
   */
  async getComposicaoTree(id: string, query: CalculateComposicaoQuery) {
    const { uf, mesReferencia, desonerado } = query
    const visited = new Set<string>()
    const tree = await this.buildTree(id, uf, mesReferencia, desonerado, 1, visited)
    if (!tree) throw new Error('Composição SINAPI não encontrada')
    return tree
  }

  private async buildTree(
    composicaoId: string,
    uf: string,
    mesReferencia: string,
    desonerado: boolean,
    coeficiente: number,
    visited: Set<string>,
    depth = 0,
  ): Promise<any | null> {
    if (depth > 5 || visited.has(composicaoId)) return null
    visited.add(composicaoId)

    const comp = await this.prisma.sinapiComposicao.findUnique({
      where: { id: composicaoId },
      include: {
        itens: {
          include: {
            insumo: {
              include: {
                precos: {
                  where: { uf, mesReferencia },
                  take: 1,
                },
              },
            },
          },
        },
        filhos: {
          include: {
            filho: true,
          },
        },
      },
    })

    if (!comp) return null

    const children: any[] = []

    // Add direct insumos
    for (const item of comp.itens) {
      const preco = item.insumo.precos[0]
      const precoUnitario = preco
        ? Number(desonerado ? preco.precoDesonerado : preco.precoNaoDesonerado)
        : 0
      const coef = Number(item.coeficiente)
      children.push({
        type: 'insumo',
        codigo: item.insumo.codigo,
        descricao: item.insumo.descricao,
        unidade: item.insumo.unidade,
        tipo: item.insumo.tipo,
        coeficiente: coef,
        precoUnitario,
        custoUnitario: Math.round(precoUnitario * coef * 100) / 100,
        temPreco: !!preco,
      })
    }

    // Add sub-compositions recursively
    for (const filho of comp.filhos) {
      const coef = Number(filho.coeficiente)
      const subTree = await this.buildTree(
        filho.filhoId, uf, mesReferencia, desonerado, coef, visited, depth + 1,
      )
      if (subTree) {
        children.push(subTree)
      }
    }

    const custoUnitario = children.reduce((sum, c) => {
      if (c.type === 'insumo') return sum + c.custoUnitario
      return sum + (c.custoUnitario || 0)
    }, 0)

    return {
      type: 'composicao',
      codigo: comp.codigo,
      descricao: comp.descricao,
      unidade: comp.unidade,
      coeficiente,
      custoUnitario: Math.round(custoUnitario * 100) / 100,
      children,
    }
  }
}
