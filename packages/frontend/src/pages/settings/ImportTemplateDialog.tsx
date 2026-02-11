import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { activityTemplatesAPI } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'

interface ImportTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ParsedPhase {
  name: string
  order: number
  percentageOfTotal: number
  color: string | null
  stages: ParsedStage[]
}

interface ParsedStage {
  name: string
  order: number
  activities: ParsedActivity[]
}

interface ParsedActivity {
  name: string
  order: number
  weight: number
  durationDays: number | null
  dependencies: string[] | null
}

interface ValidationError {
  row: number
  message: string
}

const HEADERS = [
  'Fase',
  'Percentual (%)',
  'Cor',
  'Etapa',
  'Atividade',
  'Peso (1-5)',
  'Duração (dias)',
  'Dependências',
]

function generateModelXLSX() {
  const data = [
    HEADERS,
    ['Fundação', 20, '#FF5733', 'Infraestrutura', 'Escavação', 2, 5, ''],
    ['Fundação', 20, '#FF5733', 'Infraestrutura', 'Estacas', 4, 10, 'Escavação'],
    ['Fundação', 20, '#FF5733', 'Infraestrutura', 'Blocos', 3, 8, 'Estacas'],
    ['Estrutura', 30, '#3498DB', 'Pilares', 'Formas', 2, 7, ''],
    ['Estrutura', 30, '#3498DB', 'Pilares', 'Armação', 4, 5, 'Formas'],
    ['Estrutura', 30, '#3498DB', 'Lajes', 'Escoramento', 2, 4, ''],
    ['Estrutura', 30, '#3498DB', 'Lajes', 'Concretagem', 5, 3, 'Escoramento'],
    ['Acabamento', 50, '#2ECC71', 'Revestimento', 'Chapisco', 1, 3, ''],
    ['Acabamento', 50, '#2ECC71', 'Revestimento', 'Reboco', 4, 5, 'Chapisco'],
    ['Acabamento', 50, '#2ECC71', 'Pintura', 'Massa corrida', 1, 4, ''],
    ['Acabamento', 50, '#2ECC71', 'Pintura', 'Pintura final', 3, 3, 'Massa corrida'],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)

  // Column widths
  ws['!cols'] = [
    { wch: 18 }, // Fase
    { wch: 14 }, // Percentual
    { wch: 10 }, // Cor
    { wch: 20 }, // Etapa
    { wch: 22 }, // Atividade
    { wch: 8 },  // Peso
    { wch: 16 }, // Duração
    { wch: 22 }, // Dependências
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template')
  XLSX.writeFile(wb, 'modelo-template-atividades.xlsx')
}

function parseSpreadsheet(
  file: File
): Promise<{ rows: any[][]; errors: ValidationError[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

        if (raw.length < 2) {
          resolve({ rows: [], errors: [{ row: 0, message: 'Arquivo vazio ou sem dados' }] })
          return
        }

        // Validate headers
        const headers = raw[0].map((h: any) => String(h).trim())
        const missingHeaders = HEADERS.filter(
          (h) => !headers.some((rh: string) => rh.toLowerCase() === h.toLowerCase())
        )

        if (missingHeaders.length > 0) {
          resolve({
            rows: [],
            errors: [{ row: 1, message: `Cabeçalhos ausentes: ${missingHeaders.join(', ')}` }],
          })
          return
        }

        // Map header indices
        const idx: Record<string, number> = {}
        HEADERS.forEach((h) => {
          idx[h] = headers.findIndex((rh: string) => rh.toLowerCase() === h.toLowerCase())
        })

        const dataRows = raw.slice(1).filter((row) => row.some((cell: any) => cell != null && String(cell).trim() !== ''))
        const errors: ValidationError[] = []

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i]
          const rowNum = i + 2 // 1-indexed + header

          const fase = String(row[idx['Fase']] ?? '').trim()
          const etapa = String(row[idx['Etapa']] ?? '').trim()
          const atividade = String(row[idx['Atividade']] ?? '').trim()
          const peso = Number(row[idx['Peso (1-5)']])
          const percentual = Number(row[idx['Percentual (%)']])

          if (!fase) errors.push({ row: rowNum, message: 'Fase não preenchida' })
          if (!etapa) errors.push({ row: rowNum, message: 'Etapa não preenchida' })
          if (!atividade) errors.push({ row: rowNum, message: 'Atividade não preenchida' })
          if (!peso || !Number.isInteger(peso) || peso < 1 || peso > 5) errors.push({ row: rowNum, message: 'Peso deve ser um número inteiro de 1 a 5' })
          if (!percentual || percentual <= 0) errors.push({ row: rowNum, message: 'Percentual deve ser > 0' })
        }

        resolve({ rows: dataRows.map((row) => {
          return HEADERS.map((h) => row[idx[h]])
        }), errors })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsArrayBuffer(file)
  })
}

function rowsToPhases(rows: any[][]): { phases: ParsedPhase[]; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  const phaseMap = new Map<string, {
    percentageOfTotal: number
    color: string | null
    stageMap: Map<string, ParsedActivity[]>
  }>()
  const phaseOrder: string[] = []

  const allActivityNames: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const [fase, percentual, cor, etapa, atividade, peso, duracao, deps] = rows[i]

    const faseName = String(fase ?? '').trim()
    const etapaName = String(etapa ?? '').trim()
    const atividadeName = String(atividade ?? '').trim()

    if (!faseName || !etapaName || !atividadeName) continue

    allActivityNames.push(atividadeName)

    if (!phaseMap.has(faseName)) {
      phaseMap.set(faseName, {
        percentageOfTotal: Number(percentual) || 0,
        color: cor ? String(cor).trim() : null,
        stageMap: new Map(),
      })
      phaseOrder.push(faseName)
    }

    const phase = phaseMap.get(faseName)!
    if (!phase.stageMap.has(etapaName)) {
      phase.stageMap.set(etapaName, [])
    }

    const activities = phase.stageMap.get(etapaName)!
    const depsStr = String(deps ?? '').trim()
    const depsList = depsStr
      ? depsStr.split(';').map((d) => d.trim()).filter((d) => d.length > 0)
      : null

    activities.push({
      name: atividadeName,
      order: activities.length,
      weight: Number(peso) || 1,
      durationDays: duracao && !isNaN(Number(duracao)) ? Number(duracao) : null,
      dependencies: depsList,
    })
  }

  // Validate percentage sum
  const percentSum = Array.from(phaseMap.values()).reduce((s, p) => s + p.percentageOfTotal, 0)
  if (Math.abs(percentSum - 100) >= 0.1) {
    errors.push({
      row: 0,
      message: `Soma dos percentuais das fases é ${percentSum.toFixed(1)}%, deveria ser 100%`,
    })
  }

  // Validate dependencies reference existing activities
  for (let i = 0; i < rows.length; i++) {
    const depsStr = String(rows[i][7] ?? '').trim()
    if (!depsStr) continue
    const depsList = depsStr.split(';').map((d) => d.trim()).filter((d) => d.length > 0)
    for (const dep of depsList) {
      if (!allActivityNames.includes(dep)) {
        errors.push({ row: i + 2, message: `Dependência "${dep}" não encontrada na planilha` })
      }
    }
  }

  // Build phases array
  const phases: ParsedPhase[] = phaseOrder.map((phaseName, pIdx) => {
    const p = phaseMap.get(phaseName)!
    const stageNames = Array.from(p.stageMap.keys())
    return {
      name: phaseName,
      order: pIdx,
      percentageOfTotal: p.percentageOfTotal,
      color: p.color,
      stages: stageNames.map((sName, sIdx) => ({
        name: sName,
        order: sIdx,
        activities: p.stageMap.get(sName)!,
      })),
    }
  })

  return { phases, errors }
}

export function ImportTemplateDialog({ open, onOpenChange }: ImportTemplateDialogProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [templateName, setTemplateName] = useState('')
  const [fileName, setFileName] = useState('')
  const [phases, setPhases] = useState<ParsedPhase[]>([])
  const [parseErrors, setParseErrors] = useState<ValidationError[]>([])
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())
  const [showHelp, setShowHelp] = useState(false)

  const hasData = phases.length > 0
  const hasErrors = parseErrors.length > 0
  const blockingErrors = parseErrors.filter((e) => e.row === 0)
  const canSubmit = hasData && blockingErrors.length === 0 && templateName.trim().length >= 2

  const togglePhase = (name: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setPhases([])
    setParseErrors([])
    setExpandedPhases(new Set())

    try {
      const { rows, errors: rowErrors } = await parseSpreadsheet(file)

      if (rowErrors.length > 0 && rows.length === 0) {
        setParseErrors(rowErrors)
        return
      }

      const { phases: parsed, errors: structErrors } = rowsToPhases(rows)
      setPhases(parsed)
      setParseErrors([...rowErrors, ...structErrors])

      // Auto-expand all phases for preview
      setExpandedPhases(new Set(parsed.map((p) => p.name)))

      // Auto-fill template name from file name
      if (!templateName) {
        const baseName = file.name.replace(/\.(xlsx|csv|xls)$/i, '').replace(/[_-]/g, ' ')
        setTemplateName(baseName)
      }
    } catch {
      setParseErrors([{ row: 0, message: 'Erro ao processar arquivo. Verifique o formato.' }])
    }

    // Reset input
    e.target.value = ''
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => activityTemplatesAPI.create(data),
    onSuccess: () => {
      toast.success('Template importado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] })
      handleClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar template')
    },
  })

  const handleSubmit = () => {
    if (!canSubmit) return

    createMutation.mutate({
      name: templateName.trim(),
      phases: phases.map((p) => ({
        name: p.name,
        order: p.order,
        percentageOfTotal: p.percentageOfTotal,
        color: p.color,
        stages: p.stages.map((s) => ({
          name: s.name,
          order: s.order,
          activities: s.activities.map((a) => ({
            name: a.name,
            order: a.order,
            weight: a.weight,
            durationDays: a.durationDays,
            dependencies: a.dependencies,
          })),
        })),
      })),
    })
  }

  const handleClose = () => {
    setTemplateName('')
    setFileName('')
    setPhases([])
    setParseErrors([])
    setExpandedPhases(new Set())
    onOpenChange(false)
  }

  // Count totals
  const totalActivities = phases.reduce(
    (s, p) => s + p.stages.reduce((ss, st) => ss + st.activities.length, 0),
    0
  )
  const totalStages = phases.reduce((s, p) => s + p.stages.length, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Template de Planilha</DialogTitle>
          <DialogDescription>
            Importe atividades a partir de um arquivo XLSX ou CSV seguindo o modelo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Step 1: Download model */}
          <div className="flex items-center justify-between rounded-lg border border-dashed border-neutral-300 p-4">
            <div>
              <p className="text-sm font-medium">Modelo de planilha</p>
              <p className="text-xs text-neutral-500">
                Baixe o modelo, preencha e envie de volta.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={generateModelXLSX}>
              <Download className="mr-2 h-4 w-4" />
              Baixar Modelo
            </Button>
          </div>

          {/* Field descriptions */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <HelpCircle className="h-4 w-4 text-neutral-500" />
              <span className="flex-1 text-sm font-medium text-neutral-700">
                Entenda os campos da planilha
              </span>
              {showHelp ? (
                <ChevronDown className="h-4 w-4 text-neutral-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-neutral-400" />
              )}
            </button>

            {showHelp && (
              <div className="border-t border-neutral-200 px-4 py-3 space-y-3 text-sm text-neutral-600">
                <div>
                  <span className="font-medium text-neutral-800">Fase</span>
                  <span className="text-red-500"> *</span>
                  <p className="text-xs mt-0.5">
                    Agrupamento principal da obra. Ex: Fundação, Estrutura, Acabamento.
                    Atividades com o mesmo nome de fase são agrupadas automaticamente.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-neutral-800">Percentual (%)</span>
                  <span className="text-red-500"> *</span>
                  <p className="text-xs mt-0.5">
                    Quanto essa fase representa do total da obra. A soma de todas as fases
                    deve ser exatamente 100%. Ex: Fundação 20%, Estrutura 30%, Acabamento 50%.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-neutral-800">Cor</span>
                  <p className="text-xs mt-0.5">
                    Cor da fase no painel de progresso. Use código hexadecimal (ex: #FF5733).
                    Opcional — se não informar, o sistema usa a cor padrão.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-neutral-800">Etapa</span>
                  <span className="text-red-500"> *</span>
                  <p className="text-xs mt-0.5">
                    Subdivisão dentro da fase. Ex: dentro de "Estrutura", as etapas
                    podem ser "Pilares", "Vigas", "Lajes". Etapas com o mesmo nome dentro
                    da mesma fase são agrupadas.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-neutral-800">Atividade</span>
                  <span className="text-red-500"> *</span>
                  <p className="text-xs mt-0.5">
                    A tarefa específica a ser executada e medida. Ex: "Concretagem",
                    "Chapisco", "Pintura final". Cada linha da planilha representa uma atividade.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-neutral-800">Peso (1-5)</span>
                  <span className="text-red-500"> *</span>
                  <p className="text-xs mt-0.5">
                    Grau de importância da atividade dentro da etapa, de <strong>1 a 5</strong>.
                    Quanto maior o peso, mais essa atividade influencia no progresso da etapa.
                    <strong> Não sabe o que colocar? Use 1 em todas.</strong>
                  </p>
                  <div className="mt-2 rounded border border-neutral-200 bg-white text-xs">
                    <div className="px-3 py-1.5 space-y-0.5 text-neutral-500">
                      <p><strong className="text-neutral-700">1</strong> — Atividade simples, rápida, pouco impacto</p>
                      <p><strong className="text-neutral-700">2</strong> — Importância baixa-média</p>
                      <p><strong className="text-neutral-700">3</strong> — Importância média</p>
                      <p><strong className="text-neutral-700">4</strong> — Importância alta</p>
                      <p><strong className="text-neutral-700">5</strong> — Atividade crítica, complexa, maior impacto</p>
                    </div>
                    <div className="px-3 py-2 border-t border-neutral-100 text-neutral-500">
                      <p className="font-medium text-neutral-600 mb-1">Como isso afeta o progresso?</p>
                      <p>
                        Ex: Chapisco (peso 1) concluído e Reboco (peso 4) pendente →
                        etapa em <strong className="text-neutral-700">20%</strong>.
                      </p>
                      <p>
                        Se fosse tudo peso 1 → etapa em <strong className="text-neutral-700">50%</strong>.
                      </p>
                      <p className="mt-1 text-neutral-400">
                        O peso maior do Reboco reflete que a maior parte do trabalho ainda não foi feita.
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-neutral-800">Duração (dias)</span>
                  <p className="text-xs mt-0.5">
                    Estimativa de dias úteis para executar a atividade. Opcional — usado para
                    planejamento de cronograma.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-neutral-800">Dependências</span>
                  <p className="text-xs mt-0.5">
                    Nome de atividades que precisam ser concluídas antes desta iniciar.
                    Separe múltiplas com ponto e vírgula (;). Opcional.
                  </p>
                  <p className="text-xs mt-1 text-neutral-500 italic">
                    Exemplo: "Escavação; Estacas" — significa que esta atividade
                    só inicia após Escavação e Estacas serem concluídas.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Upload */}
          <div>
            <Label>Arquivo</Label>
            <div className="mt-1 flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {fileName || 'Selecionar arquivo'}
              </Button>
              {fileName && (
                <span className="text-sm text-neutral-500">{fileName}</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Errors */}
          {hasErrors && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">
                  {parseErrors.length} problema(s) encontrado(s)
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {parseErrors.slice(0, 10).map((err, i) => (
                  <li key={i} className="text-xs text-red-600">
                    {err.row > 0 ? `Linha ${err.row}: ` : ''}{err.message}
                  </li>
                ))}
                {parseErrors.length > 10 && (
                  <li className="text-xs text-red-500">
                    ... e mais {parseErrors.length - 10} erro(s)
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Preview */}
          {hasData && (
            <>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-neutral-700">
                  {phases.length} fase(s), {totalStages} etapa(s), {totalActivities} atividade(s)
                </span>
              </div>

              <div className="max-h-[35vh] overflow-y-auto rounded-lg border">
                {phases.map((phase) => {
                  const isExpanded = expandedPhases.has(phase.name)
                  return (
                    <div key={phase.name} className="border-b last:border-b-0">
                      <button
                        type="button"
                        onClick={() => togglePhase(phase.name)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-neutral-50"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-neutral-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-neutral-400" />
                        )}
                        {phase.color && (
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: phase.color }}
                          />
                        )}
                        <span className="flex-1 text-sm font-semibold">
                          {phase.name}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {phase.percentageOfTotal}%
                        </Badge>
                      </button>

                      {isExpanded && (
                        <div className="pb-2">
                          {phase.stages.map((stage) => (
                            <div key={stage.name} className="px-4">
                              <p className="py-1.5 pl-7 text-sm font-medium text-neutral-700">
                                {stage.name}
                              </p>
                              {stage.activities.map((act) => (
                                <div
                                  key={act.name}
                                  className="flex items-center gap-2 py-1 pl-14 text-sm text-neutral-600"
                                >
                                  <span className="flex-1">{act.name}</span>
                                  <span className="text-xs text-neutral-400">
                                    Peso: {act.weight}
                                  </span>
                                  {act.durationDays && (
                                    <span className="text-xs text-neutral-400">
                                      {act.durationDays}d
                                    </span>
                                  )}
                                  {act.dependencies && act.dependencies.length > 0 && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {act.dependencies.join(', ')}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Template name */}
          {hasData && (
            <div>
              <Label htmlFor="template-name">Nome do Template *</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Construção Residencial"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            disabled={!canSubmit || createMutation.isPending}
            onClick={handleSubmit}
          >
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Criar Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
