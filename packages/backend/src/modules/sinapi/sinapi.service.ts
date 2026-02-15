import { PrismaClient, Prisma } from '@prisma/client'
import type { SearchInsumosQuery, SearchComposicoesQuery, CalculateComposicaoQuery } from './sinapi.schemas'

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
      ...(search && {
        OR: [
          { codigo: { contains: search, mode: 'insensitive' as const } },
          { descricao: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
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
    const { search, page, limit } = query
    const skip = (page - 1) * limit

    const where: Prisma.SinapiComposicaoWhereInput = {
      ...(search && {
        OR: [
          { codigo: { contains: search, mode: 'insensitive' as const } },
          { descricao: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
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

  async calculateComposicao(id: string, query: CalculateComposicaoQuery) {
    const { uf, mesReferencia, quantidade, desonerado } = query

    const composicao = await this.prisma.sinapiComposicao.findUnique({
      where: { id },
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
      },
    })

    if (!composicao) throw new Error('Composição SINAPI não encontrada')

    const itensCalculados = composicao.itens.map((item) => {
      const preco = item.insumo.precos[0]
      const precoUnitario = preco
        ? Number(desonerado ? preco.precoDesonerado : preco.precoNaoDesonerado)
        : 0
      const coeficiente = Number(item.coeficiente)
      const custoUnitario = precoUnitario * coeficiente

      return {
        insumoId: item.insumoId,
        codigo: item.insumo.codigo,
        descricao: item.insumo.descricao,
        unidade: item.insumo.unidade,
        tipo: item.insumo.tipo,
        coeficiente,
        precoUnitario,
        custoUnitario,
        temPreco: !!preco,
      }
    })

    const custoUnitarioTotal = itensCalculados.reduce((sum, i) => sum + i.custoUnitario, 0)
    const custoTotal = custoUnitarioTotal * quantidade

    return {
      composicao: {
        id: composicao.id,
        codigo: composicao.codigo,
        descricao: composicao.descricao,
        unidade: composicao.unidade,
      },
      parametros: { uf, mesReferencia, quantidade, desonerado },
      itens: itensCalculados,
      custoUnitarioTotal: Math.round(custoUnitarioTotal * 100) / 100,
      custoTotal: Math.round(custoTotal * 100) / 100,
      itensSemPreco: itensCalculados.filter((i) => !i.temPreco).length,
    }
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
