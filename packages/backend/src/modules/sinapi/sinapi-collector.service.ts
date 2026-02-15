import { PrismaClient, SinapiTipoInsumo } from '@prisma/client'
import ExcelJS from 'exceljs'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as https from 'https'
import * as http from 'http'
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

    // 2. Extract and process
    log('Extraindo ZIP...')
    await this.extractZip(zipPath, tmpDir)

    return this.processExtractedDir(tmpDir, userId, log)
  }

  /**
   * Import from a ZIP buffer uploaded by the user (skips download).
   */
  async collectFromZip(
    zipBuffer: Buffer,
    userId: string,
    onProgress?: (msg: string) => void,
  ): Promise<CollectResult> {
    const log = (msg: string) => onProgress?.(msg)

    const tmpDir = path.join(os.tmpdir(), `sinapi-upload-${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })

    const zipPath = path.join(tmpDir, 'sinapi.zip')
    fs.writeFileSync(zipPath, zipBuffer)

    log('Extraindo ZIP...')
    await this.extractZip(zipPath, tmpDir)

    return this.processExtractedDir(tmpDir, userId, log)
  }

  /**
   * Shared logic: process an extracted SINAPI directory (find XLSX, parse, import).
   */
  private async processExtractedDir(
    tmpDir: string,
    userId: string,
    log: (msg: string) => void,
  ): Promise<CollectResult> {
    const errors: string[] = []

    // Find the Referência XLSX (search recursively — ZIP may extract into subfolder)
    const xlsxPath = this.findFileRecursive(tmpDir, (f) =>
      f.toLowerCase().includes('refer') && f.endsWith('.xlsx'),
    )
    if (!xlsxPath) {
      const allFiles = this.listAllFiles(tmpDir)
      throw new Error(
        'Arquivo de referência não encontrado no ZIP. Arquivos: ' +
          allFiles.join(', '),
      )
    }

    const refFile = path.basename(xlsxPath)

    // Extract mesRef from filename (e.g. "SINAPI_Referência_2026_01.xlsx" → "2026-01")
    const mesRefMatch = refFile.match(/(\d{4})[_-](\d{2})/)
    const mesRef = mesRefMatch ? `${mesRefMatch[1]}-${mesRefMatch[2]}` : 'desconhecido'

    log(`Processando ${refFile} (${mesRef})...`)

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(xlsxPath)

    log('Importando insumos e preços sem desoneração...')
    const isdResult = await this.parseInsumosSheet(
      workbook, 'ISD', mesRef, false, errors, log,
    )

    log('Importando preços com desoneração...')
    const icdResult = await this.parsePrecosDesonerados(
      workbook, 'ICD', mesRef, errors, log,
    )

    log('Importando composições analíticas (coeficientes)...')
    const analiticoResult = await this.parseAnalitico(
      workbook, errors, log,
    )

    // Cleanup
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }

    // Log import
    await this.prisma.sinapiImportLog.create({
      data: {
        tipo: 'COLETA_AUTOMATICA',
        fileName: refFile,
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
        insumos: { codigo: string; coeficiente: number }[]
        subComposicoes: { codigo: string; coeficiente: number }[]
      }
    >()

    let totalItens = 0

    for (let r = dataStartRow; r <= rowCount; r++) {
      const row = ws.getRow(r)
      const compCodigoRaw = row.getCell(2).value
      if (!compCodigoRaw) continue

      const compCodigo = String(compCodigoRaw).trim()
      const tipoItem = String(row.getCell(3).value || '').trim().toUpperCase()
      const itemCodigoRaw = row.getCell(4).value
      const descricao = String(row.getCell(5).value || '').trim()
      const unidade = String(row.getCell(6).value || '').trim()
      const coeficiente = this.toNumber(row.getCell(7).value)

      if (!tipoItem && !itemCodigoRaw) {
        // Header line of a composição
        if (!composicaoMap.has(compCodigo)) {
          composicaoMap.set(compCodigo, {
            descricao,
            unidade,
            insumos: [],
            subComposicoes: [],
          })
        }
      } else if (tipoItem && itemCodigoRaw) {
        const itemCodigo = String(itemCodigoRaw).trim()
        if (!composicaoMap.has(compCodigo)) {
          composicaoMap.set(compCodigo, {
            descricao: '',
            unidade: '',
            insumos: [],
            subComposicoes: [],
          })
        }
        const entry = composicaoMap.get(compCodigo)!

        if (tipoItem === 'COMPOSICAO' || tipoItem === 'COMPOSIÇÃO') {
          entry.subComposicoes.push({ codigo: itemCodigo, coeficiente })
        } else {
          // INSUMO or any other type
          entry.insumos.push({ codigo: itemCodigo, coeficiente })
        }
        totalItens++
      }
    }

    const totalComposicoes = composicaoMap.size
    log(
      `  Analítico: ${totalComposicoes} composições, ${totalItens} itens`,
    )

    // Phase 1: Upsert all composições first (needed for sub-composition references)
    let importedComposicoes = 0
    const codigoToIdMap = new Map<string, string>()

    const entries = [...composicaoMap.entries()]
    const batchSize = 100

    log('  Fase 1: criando composições...')
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)
      const ops = batch.map(([codigo, data]) =>
        this.prisma.sinapiComposicao.upsert({
          where: { codigo },
          create: { codigo, descricao: data.descricao, unidade: data.unidade },
          update: {
            descricao: data.descricao || undefined,
            unidade: data.unidade || undefined,
          },
        }),
      )
      try {
        const results = await this.prisma.$transaction(ops)
        for (const r of results) {
          codigoToIdMap.set(r.codigo, r.id)
          importedComposicoes++
        }
      } catch (err: any) {
        // Fallback: one by one
        for (const [codigo, data] of batch) {
          try {
            const r = await this.prisma.sinapiComposicao.upsert({
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
            codigoToIdMap.set(r.codigo, r.id)
            importedComposicoes++
          } catch (e: any) {
            errors.push(`Composição ${codigo}: ${e.message}`)
          }
        }
      }

      if (i % 2000 === 0 && i > 0) {
        log(`  Fase 1: ${i}/${totalComposicoes} composições...`)
      }
    }

    // Also load existing composição IDs (for sub-compositions that reference
    // compositions not in the Analítico sheet but already in the DB)
    const allComps = await this.prisma.sinapiComposicao.findMany({
      select: { id: true, codigo: true },
    })
    for (const c of allComps) {
      if (!codigoToIdMap.has(c.codigo)) {
        codigoToIdMap.set(c.codigo, c.id)
      }
    }

    // Phase 2: Import insumo links and sub-composition links
    let importedInsumoLinks = 0
    let importedFilhoLinks = 0

    log('  Fase 2: vinculando insumos e sub-composições...')
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)

      for (const [codigo, data] of batch) {
        const composicaoId = codigoToIdMap.get(codigo)
        if (!composicaoId) continue

        try {
          // --- Insumo links ---
          if (data.insumos.length > 0) {
            const insumoCodigos = data.insumos.map((it) => it.codigo)
            const insumos = await this.prisma.sinapiInsumo.findMany({
              where: { codigo: { in: insumoCodigos } },
              select: { id: true, codigo: true },
            })
            const insumoIdMap = new Map(
              insumos.map((ins) => [ins.codigo, ins.id]),
            )

            // Delete existing and recreate
            await this.prisma.sinapiComposicaoInsumo.deleteMany({
              where: { composicaoId },
            })

            const validInsumos = data.insumos
              .filter((it) => insumoIdMap.has(it.codigo))
              .map((it) => ({
                composicaoId,
                insumoId: insumoIdMap.get(it.codigo)!,
                coeficiente: it.coeficiente,
              }))

            if (validInsumos.length > 0) {
              await this.prisma.sinapiComposicaoInsumo.createMany({
                data: validInsumos,
              })
              importedInsumoLinks += validInsumos.length
            }
          }

          // --- Sub-composition links ---
          if (data.subComposicoes.length > 0) {
            // Delete existing and recreate
            await this.prisma.sinapiComposicaoFilho.deleteMany({
              where: { composicaoId },
            })

            const validFilhos = data.subComposicoes
              .filter((it) => codigoToIdMap.has(it.codigo))
              .map((it) => ({
                composicaoId,
                filhoId: codigoToIdMap.get(it.codigo)!,
                coeficiente: it.coeficiente,
              }))

            if (validFilhos.length > 0) {
              await this.prisma.sinapiComposicaoFilho.createMany({
                data: validFilhos,
              })
              importedFilhoLinks += validFilhos.length
            }
          }
        } catch (err: any) {
          errors.push(`Links ${codigo}: ${err.message}`)
        }
      }

      if (i % 500 === 0 && i > 0) {
        log(
          `  Fase 2: ${i}/${totalComposicoes} (${importedInsumoLinks} insumos, ${importedFilhoLinks} sub-comp)...`,
        )
      }
    }

    return {
      totalComposicoes,
      importedComposicoes,
      totalItens,
      importedItens: importedInsumoLinks + importedFilhoLinks,
    }
  }

  // ---- Helpers ----

  private async downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const maxRedirects = 10
      let redirectCount = 0

      const doRequest = (targetUrl: string) => {
        const client = targetUrl.startsWith('https') ? https : http
        const req = client.get(targetUrl, { timeout: 180_000 }, (res) => {
          // Follow redirects
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            redirectCount++
            if (redirectCount > maxRedirects) {
              reject(new Error(`Too many redirects (${maxRedirects})`))
              return
            }
            const next = new URL(res.headers.location, targetUrl).toString()
            doRequest(next)
            return
          }

          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} ao baixar ${targetUrl}`))
            return
          }

          const file = fs.createWriteStream(dest)
          res.pipe(file)
          file.on('finish', () => {
            file.close()
            const stat = fs.statSync(dest)
            if (stat.size < 1000) {
              reject(new Error(`Arquivo baixado muito pequeno (${stat.size} bytes)`))
            } else {
              resolve()
            }
          })
          file.on('error', (err) => {
            fs.unlinkSync(dest)
            reject(err)
          })
        })

        req.on('error', reject)
        req.on('timeout', () => {
          req.destroy()
          reject(new Error('Download timeout (180s)'))
        })
      }

      doRequest(url)
    })
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

  /** Recursively search for a file matching predicate */
  private findFileRecursive(dir: string, predicate: (name: string) => boolean): string | null {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isFile() && predicate(entry.name)) {
        return fullPath
      }
      if (entry.isDirectory()) {
        const found = this.findFileRecursive(fullPath, predicate)
        if (found) return found
      }
    }
    return null
  }

  /** List all files recursively (for error messages) */
  private listAllFiles(dir: string): string[] {
    const result: string[] = []
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile()) {
        result.push(entry.name)
      } else if (entry.isDirectory()) {
        const sub = this.listAllFiles(path.join(dir, entry.name))
        result.push(...sub.map((f) => `${entry.name}/${f}`))
      }
    }
    return result
  }
}
