import { PrismaClient, SinapiTipoInsumo } from '@prisma/client'
import ExcelJS from 'exceljs'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as unzipper from 'unzipper'

const DOWNLOAD_URL_PATTERN =
  'https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-{YYYY}-{MM}-formato-xlsx.zip'

/** UFs na ordem que aparecem nas colunas do XLSX (col index 5..31 para ISD/ICD) */
const UF_ORDER_INSUMOS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR',
  'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
]

/**
 * UFs na ordem que aparecem no CSD/CCD.
 * Colunas vêm em pares: Custo | %AS para cada UF.
 * Col 4 = primeiro par (AC). Passo = 2.
 */
const UF_ORDER_COMPOSICOES = UF_ORDER_INSUMOS

interface CollectResult {
  mesReferencia: string
  insumos: { total: number; imported: number }
  precos: { total: number; imported: number }
  composicoes: { total: number; imported: number }
  analitico: { total: number; imported: number }
  errors: string[]
}

export class SinapiCollectorService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Download, extract, parse and import SINAPI data for a given month.
   */
  async collect(
    year: number,
    month: number,
    userId: string,
    onProgress?: (msg: string) => void,
  ): Promise<CollectResult> {
    const mm = String(month).padStart(2, '0')
    const mesRef = `${year}-${mm}`
    const url = DOWNLOAD_URL_PATTERN
      .replace('{YYYY}', String(year))
      .replace('{MM}', mm)

    const log = (msg: string) => onProgress?.(msg)
    const errors: string[] = []

    // 1. Download ZIP
    log('Baixando ZIP da Caixa...')
    const tmpDir = path.join(os.tmpdir(), `sinapi-${year}-${mm}-${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })

    const zipPath = path.join(tmpDir, 'sinapi.zip')
    try {
      await this.downloadFile(url, zipPath)
    } catch (err: any) {
      throw new Error(`Falha ao baixar: ${err.message}. URL: ${url}`)
    }

    // 2. Extract ZIP
    log('Extraindo ZIP...')
    await this.extractZip(zipPath, tmpDir)

    // 3. Find the Referência XLSX
    const files = fs.readdirSync(tmpDir)
    const refFile = files.find(
      (f) => f.toLowerCase().includes('refer') && f.endsWith('.xlsx'),
    )
    if (!refFile) {
      throw new Error(
        'Arquivo de referência não encontrado no ZIP. Arquivos: ' +
          files.join(', '),
      )
    }

    const xlsxPath = path.join(tmpDir, refFile)
    log(`Processando ${refFile}...`)

    // 4. Open workbook
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(xlsxPath)

    // 5. Parse insumos from ISD (sem desoneração)
    log('Importando insumos e preços sem desoneração...')
    const isdResult = await this.parseInsumosSheet(
      workbook,
      'ISD',
      mesRef,
      false,
      errors,
      log,
    )

    // 6. Parse precos from ICD (com desoneração)
    log('Importando preços com desoneração...')
    const icdResult = await this.parsePrecosDesonerados(
      workbook,
      'ICD',
      mesRef,
      errors,
      log,
    )

    // 7. Parse composições analíticas
    log('Importando composições analíticas (coeficientes)...')
    const analiticoResult = await this.parseAnalitico(
      workbook,
      errors,
      log,
    )

    // 8. Parse custos de composições from CSD
    log('Importando custos de composições sem desoneração...')
    // CSD gives us the total cost per UF — we store this info if needed
    // For now, the system calculates costs from insumo prices + coeficientes

    // 9. Cleanup
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }

    // 10. Log import
    await this.prisma.sinapiImportLog.create({
      data: {
        tipo: 'COLETA_AUTOMATICA',
        fileName: `SINAPI-${year}-${mm}`,
        totalRecords:
          isdResult.totalInsumos +
          isdResult.totalPrecos +
          analiticoResult.totalComposicoes +
          analiticoResult.totalItens,
        importedCount:
          isdResult.importedInsumos +
          isdResult.importedPrecos +
          icdResult.imported +
          analiticoResult.importedComposicoes +
          analiticoResult.importedItens,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors.slice(0, 100) : undefined,
        importedBy: userId,
      },
    })

    log('Coleta finalizada!')

    return {
      mesReferencia: mesRef,
      insumos: { total: isdResult.totalInsumos, imported: isdResult.importedInsumos },
      precos: {
        total: isdResult.totalPrecos + icdResult.total,
        imported: isdResult.importedPrecos + icdResult.imported,
      },
      composicoes: {
        total: analiticoResult.totalComposicoes,
        imported: analiticoResult.importedComposicoes,
      },
      analitico: {
        total: analiticoResult.totalItens,
        imported: analiticoResult.importedItens,
      },
      errors: errors.slice(0, 50),
    }
  }

  // ---- Insumos + Preços Sem Desoneração (ISD) ----

  private async parseInsumosSheet(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    mesRef: string,
    desonerado: boolean,
    errors: string[],
    log: (msg: string) => void,
  ) {
    const ws = workbook.getWorksheet(sheetName)
    if (!ws) throw new Error(`Sheet ${sheetName} não encontrada`)

    let totalInsumos = 0
    let importedInsumos = 0
    let totalPrecos = 0
    let importedPrecos = 0

    // Find header row (contains "Código do")
    let headerRow = 0
    ws.eachRow((row, rowNum) => {
      const val = String(row.getCell(2).value || '')
      if (val.includes('Código') && val.includes('Insumo')) {
        headerRow = rowNum
      }
    })

    if (!headerRow) {
      // Fallback: row 10 (1-based index)
      headerRow = 10
    }

    // Data starts after header
    const dataStartRow = headerRow + 1
    const rowCount = ws.rowCount

    log(`  ${sheetName}: ${rowCount - dataStartRow} linhas de dados`)

    // Process in batches
    const batchSize = 300
    let batch: {
      codigo: string
      descricao: string
      unidade: string
      tipo: SinapiTipoInsumo
      precos: { uf: string; preco: number }[]
    }[] = []

    for (let r = dataStartRow; r <= rowCount; r++) {
      const row = ws.getRow(r)
      const classificacao = String(row.getCell(1).value || '').trim()
      const codigoRaw = row.getCell(2).value
      const descricao = String(row.getCell(3).value || '').trim()
      const unidade = String(row.getCell(4).value || '').trim()

      if (!codigoRaw || !descricao) continue

      const codigo = String(codigoRaw).trim()
      const tipo = this.classificacaoToTipo(classificacao)

      const precos: { uf: string; preco: number }[] = []
      for (let c = 0; c < UF_ORDER_INSUMOS.length; c++) {
        const cellVal = row.getCell(6 + c).value // col 6 is AC (1-based = col F)
        const preco = this.toNumber(cellVal)
        if (preco > 0) {
          precos.push({ uf: UF_ORDER_INSUMOS[c], preco })
        }
      }

      batch.push({ codigo, descricao, unidade, tipo, precos })
      totalInsumos++
      totalPrecos += precos.length

      if (batch.length >= batchSize) {
        const result = await this.upsertInsumosBatch(batch, mesRef, desonerado, errors)
        importedInsumos += result.insumos
        importedPrecos += result.precos
        batch = []

        if (totalInsumos % 1000 === 0) {
          log(`  ${sheetName}: ${totalInsumos} insumos processados...`)
        }
      }
    }

    // Flush remaining
    if (batch.length > 0) {
      const result = await this.upsertInsumosBatch(batch, mesRef, desonerado, errors)
      importedInsumos += result.insumos
      importedPrecos += result.precos
    }

    return { totalInsumos, importedInsumos, totalPrecos, importedPrecos }
  }

  private async upsertInsumosBatch(
    batch: {
      codigo: string
      descricao: string
      unidade: string
      tipo: SinapiTipoInsumo
      precos: { uf: string; preco: number }[]
    }[],
    mesRef: string,
    desonerado: boolean,
    errors: string[],
  ) {
    let insumosCount = 0
    let precosCount = 0

    // Upsert insumos
    const insumoOps = batch.map((item) =>
      this.prisma.sinapiInsumo.upsert({
        where: { codigo: item.codigo },
        create: {
          codigo: item.codigo,
          descricao: item.descricao,
          unidade: item.unidade,
          tipo: item.tipo,
        },
        update: {
          descricao: item.descricao,
          unidade: item.unidade,
          tipo: item.tipo,
        },
      }),
    )

    try {
      const insumos = await this.prisma.$transaction(insumoOps)
      insumosCount = insumos.length

      // Now upsert precos
      const precoOps: any[] = []
      for (let i = 0; i < batch.length; i++) {
        const insumo = insumos[i]
        for (const p of batch[i].precos) {
          precoOps.push(
            this.prisma.sinapiPreco.upsert({
              where: {
                insumoId_uf_mesReferencia: {
                  insumoId: insumo.id,
                  uf: p.uf,
                  mesReferencia: mesRef,
                },
              },
              create: {
                insumoId: insumo.id,
                uf: p.uf,
                mesReferencia: mesRef,
                precoDesonerado: desonerado ? p.preco : 0,
                precoNaoDesonerado: desonerado ? 0 : p.preco,
              },
              update: desonerado
                ? { precoDesonerado: p.preco }
                : { precoNaoDesonerado: p.preco },
            }),
          )
        }
      }

      // Execute preco upserts in sub-batches
      const precoBatchSize = 200
      for (let i = 0; i < precoOps.length; i += precoBatchSize) {
        const subBatch = precoOps.slice(i, i + precoBatchSize)
        await this.prisma.$transaction(subBatch)
        precosCount += subBatch.length
      }
    } catch (err: any) {
      errors.push(`Batch insumos: ${err.message}`)
    }

    return { insumos: insumosCount, precos: precosCount }
  }

  // ---- Preços Com Desoneração (ICD) ----

  private async parsePrecosDesonerados(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    mesRef: string,
    errors: string[],
    log: (msg: string) => void,
  ) {
    const ws = workbook.getWorksheet(sheetName)
    if (!ws) throw new Error(`Sheet ${sheetName} não encontrada`)

    let total = 0
    let imported = 0

    // Find header row
    let headerRow = 0
    ws.eachRow((row, rowNum) => {
      const val = String(row.getCell(2).value || '')
      if (val.includes('Código') && val.includes('Insumo')) {
        headerRow = rowNum
      }
    })
    if (!headerRow) headerRow = 10

    const dataStartRow = headerRow + 1
    const rowCount = ws.rowCount

    // Collect all codigos to look up IDs
    const codigoPrecosMap = new Map<
      string,
      { uf: string; preco: number }[]
    >()

    for (let r = dataStartRow; r <= rowCount; r++) {
      const row = ws.getRow(r)
      const codigoRaw = row.getCell(2).value
      if (!codigoRaw) continue

      const codigo = String(codigoRaw).trim()
      const precos: { uf: string; preco: number }[] = []

      for (let c = 0; c < UF_ORDER_INSUMOS.length; c++) {
        const cellVal = row.getCell(6 + c).value
        const preco = this.toNumber(cellVal)
        if (preco > 0) {
          precos.push({ uf: UF_ORDER_INSUMOS[c], preco })
          total++
        }
      }

      if (precos.length > 0) {
        codigoPrecosMap.set(codigo, precos)
      }
    }

    log(`  ${sheetName}: ${codigoPrecosMap.size} insumos com preço desonerado`)

    // Fetch insumo IDs by codigo
    const codigos = [...codigoPrecosMap.keys()]
    const batchSize = 500
    for (let i = 0; i < codigos.length; i += batchSize) {
      const codigoBatch = codigos.slice(i, i + batchSize)
      const insumos = await this.prisma.sinapiInsumo.findMany({
        where: { codigo: { in: codigoBatch } },
        select: { id: true, codigo: true },
      })
      const idMap = new Map(insumos.map((ins) => [ins.codigo, ins.id]))

      const ops: any[] = []
      for (const cod of codigoBatch) {
        const insumoId = idMap.get(cod)
        if (!insumoId) continue
        const precos = codigoPrecosMap.get(cod)!
        for (const p of precos) {
          ops.push(
            this.prisma.sinapiPreco.upsert({
              where: {
                insumoId_uf_mesReferencia: {
                  insumoId,
                  uf: p.uf,
                  mesReferencia: mesRef,
                },
              },
              create: {
                insumoId,
                uf: p.uf,
                mesReferencia: mesRef,
                precoDesonerado: p.preco,
                precoNaoDesonerado: 0,
              },
              update: { precoDesonerado: p.preco },
            }),
          )
        }
      }

      // Sub-batch the operations
      const subBatchSize = 200
      for (let j = 0; j < ops.length; j += subBatchSize) {
        try {
          const sub = ops.slice(j, j + subBatchSize)
          await this.prisma.$transaction(sub)
          imported += sub.length
        } catch (err: any) {
          errors.push(`Batch precos desonerados: ${err.message}`)
        }
      }
    }

    return { total, imported }
  }

  // ---- Composições Analíticas ----

  private async parseAnalitico(
    workbook: ExcelJS.Workbook,
    errors: string[],
    log: (msg: string) => void,
  ) {
    const ws = workbook.getWorksheet('Analítico')
    if (!ws) throw new Error('Sheet Analítico não encontrada')

    // Row 10 (1-based) = header:
    // Grupo | Código Composição | Tipo Item | Código Item | Descrição | Unidade | Coeficiente | Situação

    // Find header row
    let headerRow = 0
    ws.eachRow((row, rowNum) => {
      const val = String(row.getCell(2).value || '')
      if (val.includes('Código') && val.includes('Composi')) {
        headerRow = rowNum
      }
    })
    if (!headerRow) headerRow = 10

    const dataStartRow = headerRow + 1
    const rowCount = ws.rowCount

    log(`  Analítico: ~${rowCount - dataStartRow} linhas`)

    // Group data by composição
    const composicaoMap = new Map<
      string,
      {
        descricao: string
        unidade: string
        itens: { tipo: string; codigo: string; coeficiente: number }[]
      }
    >()

    let totalItens = 0

    for (let r = dataStartRow; r <= rowCount; r++) {
      const row = ws.getRow(r)
      const compCodigoRaw = row.getCell(2).value
      if (!compCodigoRaw) continue

      const compCodigo = String(compCodigoRaw).trim()
      const tipoItem = String(row.getCell(3).value || '').trim()
      const itemCodigoRaw = row.getCell(4).value
      const descricao = String(row.getCell(5).value || '').trim()
      const unidade = String(row.getCell(6).value || '').trim()
      const coeficiente = this.toNumber(row.getCell(7).value)

      if (!tipoItem && !itemCodigoRaw) {
        // Header line of a composição
        if (!composicaoMap.has(compCodigo)) {
          composicaoMap.set(compCodigo, { descricao, unidade, itens: [] })
        }
      } else if (tipoItem && itemCodigoRaw) {
        // Item of a composição
        const itemCodigo = String(itemCodigoRaw).trim()
        if (!composicaoMap.has(compCodigo)) {
          composicaoMap.set(compCodigo, { descricao: '', unidade: '', itens: [] })
        }
        composicaoMap.get(compCodigo)!.itens.push({
          tipo: tipoItem,
          codigo: itemCodigo,
          coeficiente,
        })
        totalItens++
      }
    }

    const totalComposicoes = composicaoMap.size
    log(`  Analítico: ${totalComposicoes} composições, ${totalItens} itens`)

    // Upsert composições and their items
    let importedComposicoes = 0
    let importedItens = 0

    const entries = [...composicaoMap.entries()]
    const batchSize = 50

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)

      for (const [codigo, data] of batch) {
        try {
          // Upsert composição
          const composicao = await this.prisma.sinapiComposicao.upsert({
            where: { codigo },
            create: {
              codigo,
              descricao: data.descricao,
              unidade: data.unidade,
            },
            update: {
              descricao: data.descricao || undefined,
              unidade: data.unidade || undefined,
            },
          })
          importedComposicoes++

          if (data.itens.length > 0) {
            // Get all referenced item codes (both INSUMO and COMPOSICAO types)
            const insumoCodigos = data.itens
              .filter((it) => it.tipo === 'INSUMO')
              .map((it) => it.codigo)
            const compCodigos = data.itens
              .filter((it) => it.tipo === 'COMPOSICAO')
              .map((it) => it.codigo)

            // For COMPOSICAO type items, they reference other compositions
            // but in our model they are stored as insumos in the junction table.
            // We need to find their insumo equivalent or create a virtual insumo.
            // For now, we only import INSUMO type items to the junction table.

            if (insumoCodigos.length > 0) {
              const insumos = await this.prisma.sinapiInsumo.findMany({
                where: { codigo: { in: insumoCodigos } },
                select: { id: true, codigo: true },
              })
              const insumoIdMap = new Map(
                insumos.map((ins) => [ins.codigo, ins.id]),
              )

              // Delete existing and recreate
              await this.prisma.sinapiComposicaoInsumo.deleteMany({
                where: { composicaoId: composicao.id },
              })

              const validItens = data.itens
                .filter(
                  (it) =>
                    it.tipo === 'INSUMO' && insumoIdMap.has(it.codigo),
                )
                .map((it) => ({
                  composicaoId: composicao.id,
                  insumoId: insumoIdMap.get(it.codigo)!,
                  coeficiente: it.coeficiente,
                }))

              if (validItens.length > 0) {
                await this.prisma.sinapiComposicaoInsumo.createMany({
                  data: validItens,
                })
                importedItens += validItens.length
              }
            }
          }
        } catch (err: any) {
          errors.push(`Composição ${codigo}: ${err.message}`)
        }
      }

      if (i % 500 === 0 && i > 0) {
        log(`  Analítico: ${i}/${totalComposicoes} composições processadas...`)
      }
    }

    return { totalComposicoes, importedComposicoes, totalItens, importedItens }
  }

  // ---- Helpers ----

  private async downloadFile(url: string, dest: string): Promise<void> {
    // Use dynamic import for fetch (Node 18+)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(dest, buffer)
  }

  private async extractZip(zipPath: string, destDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: destDir }))
        .on('close', resolve)
        .on('error', reject)
    })
  }

  private classificacaoToTipo(classificacao: string): SinapiTipoInsumo {
    const upper = classificacao.toUpperCase()
    if (upper.includes('MÃO') || upper.includes('MAO')) return 'MAO_DE_OBRA'
    if (upper.includes('EQUIP')) return 'EQUIPAMENTO'
    if (upper.includes('SERVI')) return 'SERVICO'
    return 'MATERIAL'
  }

  private toNumber(val: any): number {
    if (val === null || val === undefined || val === '' || val === '-') return 0
    if (typeof val === 'number') return val
    const str = String(val).trim().replace(/\./g, '').replace(',', '.')
    const num = parseFloat(str)
    return isNaN(num) ? 0 : num
  }
}
