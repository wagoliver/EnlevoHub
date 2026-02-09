import { PrismaClient } from '@prisma/client'
import * as iconv from 'iconv-lite'

interface ParsedTransaction {
  date: Date
  amount: number
  type: 'INCOME' | 'EXPENSE'
  description: string
  externalId?: string
}

interface ImportResult {
  batchId: string
  totalRecords: number
  importedCount: number
  duplicateCount: number
  periodStart: Date | null
  periodEnd: Date | null
}

export class ImportService {
  constructor(private prisma: PrismaClient) {}

  async importFile(
    tenantId: string,
    userId: string,
    bankAccountId: string,
    fileName: string,
    buffer: Buffer,
  ): Promise<ImportResult> {
    // Validate bank account belongs to tenant
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: bankAccountId, tenantId },
    })
    if (!account) throw new Error('Conta bancária não encontrada')

    // Detect file type
    const ext = fileName.toLowerCase().split('.').pop() || ''
    let fileType: string
    let transactions: ParsedTransaction[]

    // Decode from Latin1 (common for Brazilian bank exports)
    const text = this.decodeBuffer(buffer, ext)

    switch (ext) {
      case 'ofx':
        fileType = 'OFX'
        transactions = this.parseOFX(text)
        break
      case 'csv':
        fileType = 'CSV'
        transactions = this.parseCSV(text)
        break
      case 'xls':
      case 'xlsx':
        fileType = ext.toUpperCase()
        transactions = await this.parseXLSX(buffer)
        break
      default:
        throw new Error(`Formato de arquivo não suportado: .${ext}. Use .ofx, .csv, .xls ou .xlsx`)
    }

    if (transactions.length === 0) {
      throw new Error('Nenhuma transação encontrada no arquivo')
    }

    // Deduplicate against existing transactions
    const existingExternalIds = new Set<string>()
    if (transactions.some(t => t.externalId)) {
      const existing = await this.prisma.financialTransaction.findMany({
        where: {
          bankAccountId,
          externalId: { in: transactions.filter(t => t.externalId).map(t => t.externalId!) },
        },
        select: { externalId: true },
      })
      existing.forEach(e => {
        if (e.externalId) existingExternalIds.add(e.externalId)
      })
    }

    const newTransactions = transactions.filter(t => !t.externalId || !existingExternalIds.has(t.externalId))
    const duplicateCount = transactions.length - newTransactions.length

    // Calculate period
    const dates = transactions.map(t => t.date).sort((a, b) => a.getTime() - b.getTime())
    const periodStart = dates[0] || null
    const periodEnd = dates[dates.length - 1] || null

    // Create batch and transactions in a single prisma transaction
    const batch = await this.prisma.$transaction(async (tx) => {
      const importBatch = await tx.importBatch.create({
        data: {
          tenantId,
          bankAccountId,
          fileName,
          fileType,
          totalRecords: transactions.length,
          importedCount: newTransactions.length,
          duplicateCount,
          periodStart,
          periodEnd,
          importedBy: userId,
        },
      })

      if (newTransactions.length > 0) {
        await tx.financialTransaction.createMany({
          data: newTransactions.map(t => ({
            bankAccountId,
            type: t.type,
            category: t.type === 'INCOME' ? 'Receita Importada' : 'Despesa Importada',
            amount: Math.abs(t.amount),
            date: t.date,
            description: t.description,
            rawDescription: t.description,
            externalId: t.externalId,
            importBatchId: importBatch.id,
            status: 'COMPLETED',
            reconciliationStatus: 'PENDING',
            createdBy: userId,
          })),
        })
      }

      return importBatch
    })

    return {
      batchId: batch.id,
      totalRecords: transactions.length,
      importedCount: newTransactions.length,
      duplicateCount,
      periodStart,
      periodEnd,
    }
  }

  // ==================== Parsers ====================

  private decodeBuffer(buffer: Buffer, ext: string): string {
    // OFX and CSV from Brazilian banks are typically Latin1/Windows-1252
    if (ext === 'ofx' || ext === 'csv') {
      // Check if it's already UTF-8
      const utf8 = buffer.toString('utf8')
      if (this.isValidUtf8(utf8)) return utf8
      return iconv.decode(buffer, 'windows-1252')
    }
    return buffer.toString('utf8')
  }

  private isValidUtf8(str: string): boolean {
    // Simple heuristic: if no replacement characters appear, it's likely valid UTF-8
    return !str.includes('\ufffd')
  }

  private parseOFX(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = []

    // OFX 1.x (SGML) parser — supports the most common Brazilian bank format
    // Extract STMTTRN blocks
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
    let match

    while ((match = stmtTrnRegex.exec(text)) !== null) {
      const block = match[1]
      const trn = this.parseOFXBlock(block)
      if (trn) transactions.push(trn)
    }

    // Fallback: OFX 1.x without closing tags (more common in BR)
    if (transactions.length === 0) {
      const blocks = text.split(/<STMTTRN>/i).slice(1)
      for (const block of blocks) {
        const endIdx = block.search(/<\/STMTTRN>|<STMTTRN>/i)
        const content = endIdx >= 0 ? block.substring(0, endIdx) : block
        const trn = this.parseOFXBlock(content)
        if (trn) transactions.push(trn)
      }
    }

    return transactions
  }

  private parseOFXBlock(block: string): ParsedTransaction | null {
    const getValue = (tag: string): string => {
      // Handles both <TAG>value\n and <TAG>value</TAG>
      const regex = new RegExp(`<${tag}>\\s*([^<\\n\\r]+)`, 'i')
      const m = block.match(regex)
      return m ? m[1].trim() : ''
    }

    const dateStr = getValue('DTPOSTED')
    const amountStr = getValue('TRNAMT')
    const fitid = getValue('FITID')
    const memo = getValue('MEMO') || getValue('NAME')
    const trnType = getValue('TRNTYPE')

    if (!dateStr || !amountStr) return null

    // Parse OFX date: YYYYMMDD or YYYYMMDDHHMMSS
    const year = parseInt(dateStr.substring(0, 4))
    const month = parseInt(dateStr.substring(4, 6)) - 1
    const day = parseInt(dateStr.substring(6, 8))
    const date = new Date(year, month, day)

    if (isNaN(date.getTime())) return null

    const amount = parseFloat(amountStr.replace(',', '.'))
    if (isNaN(amount)) return null

    return {
      date,
      amount,
      type: amount >= 0 ? 'INCOME' : 'EXPENSE',
      description: memo || trnType || 'Sem descrição',
      externalId: fitid || undefined,
    }
  }

  private parseCSV(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = []
    const lines = text.split(/\r?\n/).filter(l => l.trim())

    if (lines.length < 2) return transactions

    // Detect delimiter (Brazilian CSVs typically use ;)
    const firstLine = lines[0]
    const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ','

    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''))

    // Try to detect column mapping
    const dateCol = this.findColumn(headers, ['data', 'date', 'dt', 'data lancamento', 'data lançamento', 'data_lancamento'])
    const amountCol = this.findColumn(headers, ['valor', 'amount', 'value', 'vlr', 'quantia'])
    const descCol = this.findColumn(headers, ['descricao', 'descrição', 'description', 'historico', 'histórico', 'memo', 'lancamento', 'lançamento'])

    if (dateCol === -1 || amountCol === -1) {
      throw new Error('Não foi possível detectar as colunas de data e valor no CSV. Verifique se o arquivo possui cabeçalho.')
    }

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCSVLine(lines[i], delimiter)
      if (cols.length <= Math.max(dateCol, amountCol)) continue

      const dateStr = cols[dateCol].replace(/"/g, '').trim()
      const amountStr = cols[amountCol].replace(/"/g, '').trim()
      const desc = descCol >= 0 ? cols[descCol].replace(/"/g, '').trim() : 'Sem descrição'

      const date = this.parseBrazilianDate(dateStr)
      if (!date) continue

      // Parse Brazilian number format: 1.234,56 → 1234.56
      const amount = this.parseBrazilianNumber(amountStr)
      if (isNaN(amount)) continue

      transactions.push({
        date,
        amount,
        type: amount >= 0 ? 'INCOME' : 'EXPENSE',
        description: desc,
      })
    }

    return transactions
  }

  private async parseXLSX(buffer: Buffer): Promise<ParsedTransaction[]> {
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as any)

    const transactions: ParsedTransaction[] = []
    const worksheet = workbook.worksheets[0]
    if (!worksheet) throw new Error('Planilha vazia')

    const headers: string[] = []
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value || '').toLowerCase().trim()
    })

    const dateCol = this.findColumn(headers, ['data', 'date', 'dt', 'data lancamento', 'data lançamento'])
    const amountCol = this.findColumn(headers, ['valor', 'amount', 'value', 'vlr'])
    const descCol = this.findColumn(headers, ['descricao', 'descrição', 'description', 'historico', 'histórico'])

    if (dateCol === -1 || amountCol === -1) {
      throw new Error('Não foi possível detectar as colunas de data e valor na planilha.')
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // Skip header

      const dateVal = row.getCell(dateCol + 1).value
      const amountVal = row.getCell(amountCol + 1).value
      const descVal = descCol >= 0 ? String(row.getCell(descCol + 1).value || 'Sem descrição') : 'Sem descrição'

      let date: Date | null = null
      if (dateVal instanceof Date) {
        date = dateVal
      } else if (typeof dateVal === 'string') {
        date = this.parseBrazilianDate(dateVal)
      }
      if (!date) return

      let amount: number
      if (typeof amountVal === 'number') {
        amount = amountVal
      } else {
        amount = this.parseBrazilianNumber(String(amountVal || ''))
      }
      if (isNaN(amount)) return

      transactions.push({
        date,
        amount,
        type: amount >= 0 ? 'INCOME' : 'EXPENSE',
        description: descVal,
      })
    })

    return transactions
  }

  // ==================== Helpers ====================

  private findColumn(headers: string[], candidates: string[]): number {
    for (const candidate of candidates) {
      const idx = headers.findIndex(h => h.includes(candidate))
      if (idx >= 0) return idx
    }
    return -1
  }

  private parseBrazilianDate(str: string): Date | null {
    // DD/MM/YYYY or DD-MM-YYYY
    const parts = str.split(/[\/\-.]/)
    if (parts.length === 3) {
      const day = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1
      let year = parseInt(parts[2])
      if (year < 100) year += 2000
      const date = new Date(year, month, day)
      if (!isNaN(date.getTime())) return date
    }
    // ISO format fallback
    const date = new Date(str)
    return isNaN(date.getTime()) ? null : date
  }

  private parseBrazilianNumber(str: string): number {
    // Remove spaces
    str = str.trim()
    // Check if Brazilian format (uses comma as decimal separator)
    if (str.includes(',')) {
      // 1.234,56 → 1234.56
      str = str.replace(/\./g, '').replace(',', '.')
    }
    return parseFloat(str)
  }

  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }
}
