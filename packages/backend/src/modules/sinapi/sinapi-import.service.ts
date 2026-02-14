import { PrismaClient, SinapiTipoInsumo } from '@prisma/client'

interface ImportResult {
  totalRecords: number
  importedCount: number
  errorCount: number
  errors: string[]
}

export class SinapiImportService {
  constructor(private prisma: PrismaClient) {}

  async importInsumos(
    userId: string,
    fileName: string,
    buffer: Buffer,
  ): Promise<ImportResult> {
    const text = this.decodeBuffer(buffer)
    const lines = this.parseCSV(text)

    if (lines.length < 2) {
      throw new Error('Arquivo vazio ou formato inválido')
    }

    const header = lines[0].map((h) => h.toLowerCase().trim())
    const codigoIdx = this.findColumn(header, ['codigo', 'código', 'cod'])
    const descricaoIdx = this.findColumn(header, ['descricao', 'descrição', 'desc'])
    const unidadeIdx = this.findColumn(header, ['unidade', 'un', 'und'])
    const tipoIdx = this.findColumn(header, ['tipo', 'classificacao', 'classificação'])

    if (codigoIdx === -1 || descricaoIdx === -1 || unidadeIdx === -1) {
      throw new Error('Colunas obrigatórias não encontradas: codigo, descricao, unidade')
    }

    const errors: string[] = []
    let importedCount = 0
    const dataRows = lines.slice(1).filter((row) => row.length > Math.max(codigoIdx, descricaoIdx, unidadeIdx))

    // Process in batches of 500
    const batchSize = 500
    for (let i = 0; i < dataRows.length; i += batchSize) {
      const batch = dataRows.slice(i, i + batchSize)
      const upserts = batch
        .map((row, rowIdx) => {
          try {
            const codigo = row[codigoIdx].trim()
            const descricao = row[descricaoIdx].trim()
            const unidade = row[unidadeIdx].trim()
            const tipoRaw = tipoIdx >= 0 ? row[tipoIdx]?.trim().toUpperCase() : ''
            const tipo = this.parseTipoInsumo(tipoRaw)

            if (!codigo || !descricao) return null

            return { codigo, descricao, unidade, tipo }
          } catch (err: any) {
            errors.push(`Linha ${i + rowIdx + 2}: ${err.message}`)
            return null
          }
        })
        .filter(Boolean) as { codigo: string; descricao: string; unidade: string; tipo: SinapiTipoInsumo }[]

      await this.prisma.$transaction(
        upserts.map((data) =>
          this.prisma.sinapiInsumo.upsert({
            where: { codigo: data.codigo },
            create: data,
            update: { descricao: data.descricao, unidade: data.unidade, tipo: data.tipo },
          })
        )
      )

      importedCount += upserts.length
    }

    await this.prisma.sinapiImportLog.create({
      data: {
        tipo: 'INSUMOS',
        fileName,
        totalRecords: dataRows.length,
        importedCount,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors.slice(0, 100) : undefined,
        importedBy: userId,
      },
    })

    return { totalRecords: dataRows.length, importedCount, errorCount: errors.length, errors: errors.slice(0, 20) }
  }

  async importComposicoes(
    userId: string,
    fileName: string,
    buffer: Buffer,
  ): Promise<ImportResult> {
    const text = this.decodeBuffer(buffer)
    const lines = this.parseCSV(text)

    if (lines.length < 2) {
      throw new Error('Arquivo vazio ou formato inválido')
    }

    const header = lines[0].map((h) => h.toLowerCase().trim())
    const compCodigoIdx = this.findColumn(header, ['composicao_codigo', 'comp_codigo', 'codigo_composicao', 'codigo'])
    const compDescIdx = this.findColumn(header, ['composicao_descricao', 'comp_descricao', 'descricao_composicao', 'descricao'])
    const compUnidadeIdx = this.findColumn(header, ['composicao_unidade', 'comp_unidade', 'unidade_composicao', 'unidade'])
    const insumoCodigoIdx = this.findColumn(header, ['insumo_codigo', 'codigo_insumo', 'cod_insumo'])
    const coeficienteIdx = this.findColumn(header, ['coeficiente', 'coef', 'quantidade'])

    if (compCodigoIdx === -1 || compDescIdx === -1) {
      throw new Error('Colunas obrigatórias não encontradas: composicao_codigo, composicao_descricao')
    }

    const errors: string[] = []
    let importedCount = 0
    const dataRows = lines.slice(1).filter((row) => row.length > compCodigoIdx)

    // Group rows by composicao
    const composicaoMap = new Map<string, { descricao: string; unidade: string; itens: { insumoCodigo: string; coeficiente: number }[] }>()

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      try {
        const codigo = row[compCodigoIdx].trim()
        const descricao = row[compDescIdx]?.trim() || ''
        const unidade = compUnidadeIdx >= 0 ? (row[compUnidadeIdx]?.trim() || 'UN') : 'UN'

        if (!codigo) continue

        if (!composicaoMap.has(codigo)) {
          composicaoMap.set(codigo, { descricao, unidade, itens: [] })
        }

        if (insumoCodigoIdx >= 0 && coeficienteIdx >= 0) {
          const insumoCodigo = row[insumoCodigoIdx]?.trim()
          const coefStr = row[coeficienteIdx]?.trim().replace(',', '.')
          const coeficiente = parseFloat(coefStr)

          if (insumoCodigo && !isNaN(coeficiente)) {
            composicaoMap.get(codigo)!.itens.push({ insumoCodigo, coeficiente })
          }
        }
      } catch (err: any) {
        errors.push(`Linha ${i + 2}: ${err.message}`)
      }
    }

    // Upsert composicoes with their items
    for (const [codigo, data] of composicaoMap) {
      try {
        const composicao = await this.prisma.sinapiComposicao.upsert({
          where: { codigo },
          create: { codigo, descricao: data.descricao, unidade: data.unidade },
          update: { descricao: data.descricao, unidade: data.unidade },
        })

        if (data.itens.length > 0) {
          // Delete existing items and recreate
          await this.prisma.sinapiComposicaoInsumo.deleteMany({
            where: { composicaoId: composicao.id },
          })

          const insumoCodigos = data.itens.map((i) => i.insumoCodigo)
          const insumos = await this.prisma.sinapiInsumo.findMany({
            where: { codigo: { in: insumoCodigos } },
          })
          const insumoMap = new Map(insumos.map((i) => [i.codigo, i.id]))

          const validItens = data.itens
            .filter((i) => insumoMap.has(i.insumoCodigo))
            .map((i) => ({
              composicaoId: composicao.id,
              insumoId: insumoMap.get(i.insumoCodigo)!,
              coeficiente: i.coeficiente,
            }))

          if (validItens.length > 0) {
            await this.prisma.sinapiComposicaoInsumo.createMany({ data: validItens })
          }

          const missing = data.itens.filter((i) => !insumoMap.has(i.insumoCodigo))
          if (missing.length > 0) {
            errors.push(`Composição ${codigo}: ${missing.length} insumo(s) não encontrado(s)`)
          }
        }

        importedCount++
      } catch (err: any) {
        errors.push(`Composição ${codigo}: ${err.message}`)
      }
    }

    await this.prisma.sinapiImportLog.create({
      data: {
        tipo: 'COMPOSICOES',
        fileName,
        totalRecords: composicaoMap.size,
        importedCount,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors.slice(0, 100) : undefined,
        importedBy: userId,
      },
    })

    return { totalRecords: composicaoMap.size, importedCount, errorCount: errors.length, errors: errors.slice(0, 20) }
  }

  async importPrecos(
    userId: string,
    fileName: string,
    buffer: Buffer,
  ): Promise<ImportResult> {
    const text = this.decodeBuffer(buffer)
    const lines = this.parseCSV(text)

    if (lines.length < 2) {
      throw new Error('Arquivo vazio ou formato inválido')
    }

    const header = lines[0].map((h) => h.toLowerCase().trim())
    const codigoIdx = this.findColumn(header, ['codigo', 'código', 'cod', 'codigo_insumo'])
    const ufIdx = this.findColumn(header, ['uf', 'estado'])
    const mesIdx = this.findColumn(header, ['mes_referencia', 'mes', 'referencia', 'mês'])
    const desoIdx = this.findColumn(header, ['preco_desonerado', 'desonerado', 'preco_des'])
    const naoDesoIdx = this.findColumn(header, ['preco_nao_desonerado', 'nao_desonerado', 'preco_nao_des'])

    if (codigoIdx === -1 || ufIdx === -1 || mesIdx === -1) {
      throw new Error('Colunas obrigatórias não encontradas: codigo, uf, mes_referencia')
    }

    const errors: string[] = []
    let importedCount = 0
    const dataRows = lines.slice(1).filter((row) => row.length > Math.max(codigoIdx, ufIdx, mesIdx))

    // Collect all unique insumo codes to fetch their IDs
    const insumoCodigos = [...new Set(dataRows.map((row) => row[codigoIdx].trim()).filter(Boolean))]
    const insumos = await this.prisma.sinapiInsumo.findMany({
      where: { codigo: { in: insumoCodigos } },
      select: { id: true, codigo: true },
    })
    const insumoMap = new Map(insumos.map((i) => [i.codigo, i.id]))

    const batchSize = 500
    for (let i = 0; i < dataRows.length; i += batchSize) {
      const batch = dataRows.slice(i, i + batchSize)
      const upserts: any[] = []

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j]
        try {
          const codigo = row[codigoIdx].trim()
          const uf = row[ufIdx].trim().toUpperCase()
          const mesReferencia = row[mesIdx].trim()
          const precoDesonerado = this.parseNumber(row[desoIdx >= 0 ? desoIdx : -1])
          const precoNaoDesonerado = this.parseNumber(row[naoDesoIdx >= 0 ? naoDesoIdx : -1])

          const insumoId = insumoMap.get(codigo)
          if (!insumoId) {
            errors.push(`Linha ${i + j + 2}: Insumo ${codigo} não encontrado`)
            continue
          }

          if (uf.length !== 2 || !mesReferencia.match(/^\d{4}-\d{2}$/)) {
            errors.push(`Linha ${i + j + 2}: UF ou mês inválido`)
            continue
          }

          upserts.push({
            insumoId,
            uf,
            mesReferencia,
            precoDesonerado: precoDesonerado || 0,
            precoNaoDesonerado: precoNaoDesonerado || 0,
          })
        } catch (err: any) {
          errors.push(`Linha ${i + j + 2}: ${err.message}`)
        }
      }

      if (upserts.length > 0) {
        await this.prisma.$transaction(
          upserts.map((data) =>
            this.prisma.sinapiPreco.upsert({
              where: {
                insumoId_uf_mesReferencia: {
                  insumoId: data.insumoId,
                  uf: data.uf,
                  mesReferencia: data.mesReferencia,
                },
              },
              create: data,
              update: {
                precoDesonerado: data.precoDesonerado,
                precoNaoDesonerado: data.precoNaoDesonerado,
              },
            })
          )
        )
        importedCount += upserts.length
      }
    }

    await this.prisma.sinapiImportLog.create({
      data: {
        tipo: 'PRECOS',
        fileName,
        totalRecords: dataRows.length,
        importedCount,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors.slice(0, 100) : undefined,
        importedBy: userId,
      },
    })

    return { totalRecords: dataRows.length, importedCount, errorCount: errors.length, errors: errors.slice(0, 20) }
  }

  // --- Helpers ---

  private decodeBuffer(buffer: Buffer): string {
    const utf8 = buffer.toString('utf8')
    // Check for common Latin1/Windows-1252 artifacts
    if (utf8.includes('\ufffd') || utf8.includes('�')) {
      // Try iconv-lite if available, else fallback to latin1
      return buffer.toString('latin1')
    }
    return utf8
  }

  private parseCSV(text: string): string[][] {
    // Detect delimiter: semicolon is standard in Brazilian CSV
    const firstLine = text.split('\n')[0] || ''
    const delimiter = firstLine.includes(';') ? ';' : ','

    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split(delimiter).map((cell) => cell.replace(/^["']|["']$/g, '').trim()))
  }

  private findColumn(header: string[], candidates: string[]): number {
    for (const candidate of candidates) {
      const idx = header.indexOf(candidate)
      if (idx >= 0) return idx
    }
    return -1
  }

  private parseTipoInsumo(raw: string): SinapiTipoInsumo {
    const normalized = raw.replace(/[^A-Z_]/g, '')
    if (normalized.includes('MAO') || normalized.includes('OBRA')) return 'MAO_DE_OBRA'
    if (normalized.includes('EQUIP')) return 'EQUIPAMENTO'
    if (normalized.includes('SERV')) return 'SERVICO'
    return 'MATERIAL'
  }

  private parseNumber(val: string | undefined): number {
    if (!val) return 0
    const cleaned = val.trim().replace(/\./g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }
}
