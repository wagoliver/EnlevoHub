import { useState, useMemo, useEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { levantamentoAPI, sinapiAPI } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, Wand2, Search, Link2, X, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { SinapiSearchDialog } from './SinapiSearchDialog'
import { ComposicaoTree } from './ComposicaoTree'
import { calcularAreas, getQuantidadePorArea, AREA_LABELS, templateAplicaAoAmbiente, type AreaTipo } from './servicosCatalogo'

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface PhaseHierarchy {
  id: string; name: string; color: string | null
  stages: {
    id: string; name: string; color: string | null
    activities: {
      id: string; name: string
      sinapiCodigo: string | null; areaTipo: string | null
      tags: string[]; padrao: boolean
      sinapiDescricao: string | null; unidade: string | null
      linkedTemplates: any[]
    }[]
  }[]
}

interface GerarServicosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ambiente: any
  projectId: string
  levantamentoId: string
  activityGroups?: {
    phases?: PhaseHierarchy[]
    hasSinapiActivities?: boolean
    activityGroups: any[]
    unlinkedTemplates: any[]
  }
}

interface TemplateData {
  id: string
  nome: string
  sinapiCodigo: string | null
  nomeCustom: string | null
  unidade: string
  areaTipo: AreaTipo
  tags: string[]
  padrao: boolean
  etapa: string
  order: number
  sinapiDescricao: string | null
}

interface ServicoRow {
  template: TemplateData
  checked: boolean
  quantidade: number
  sugerido: boolean
  precoUnitario: number
  precoManual?: boolean
  sinapiComposicaoId?: string
  sinapiCodigo?: string
  sinapiDescricao?: string
  loadingPreco?: boolean
  projectActivityId?: string
}

export function GerarServicosDialog({
  open,
  onOpenChange,
  ambiente,
  projectId,
  levantamentoId,
  activityGroups: activityGroupsProp,
}: GerarServicosDialogProps) {
  const queryClient = useQueryClient()

  // SINAPI params
  const [uf, setUf] = useState('SP')
  const [mesReferencia, setMesReferencia] = useState('')
  const [desonerado, setDesonerado] = useState(false)

  // SINAPI search (manual override for existing row)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTargetIdx, setSearchTargetIdx] = useState<number | null>(null)

  // State
  const [rows, setRows] = useState<ServicoRow[]>([])
  const [pricesLoaded, setPricesLoaded] = useState(false)

  // Tree expand state
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [treeData, setTreeData] = useState<any>(null)
  const [treeLoading, setTreeLoading] = useState(false)

  const areas = useMemo(() => calcularAreas(ambiente), [ambiente])

  // Fetch available SINAPI months
  const { data: mesesDisponiveis } = useQuery({
    queryKey: ['sinapi-meses-referencia'],
    queryFn: () => sinapiAPI.getMesesReferencia(),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  })

  // Auto-select most recent month
  useEffect(() => {
    if (mesesDisponiveis && mesesDisponiveis.length > 0 && !mesReferencia) {
      setMesReferencia(mesesDisponiveis[0])
    }
  }, [mesesDisponiveis, mesReferencia])

  // Build rows from PHASE > STAGE > ACTIVITY hierarchy
  useEffect(() => {
    if (!open) return
    if (!activityGroupsProp?.phases) {
      setRows([])
      return
    }

    const ambienteTags: string[] = ambiente.tags || []
    const newRows: ServicoRow[] = []

    for (const phase of activityGroupsProp.phases) {
      for (const stage of phase.stages) {
        for (const act of stage.activities) {
          if (!act.sinapiCodigo || !act.areaTipo) continue
          const sugerido = templateAplicaAoAmbiente(act.tags || [], ambienteTags)
          const etapaLabel = `${phase.name} > ${stage.name}`
          newRows.push({
            template: {
              id: act.id,
              nome: act.name,
              sinapiCodigo: act.sinapiCodigo,
              nomeCustom: null,
              unidade: act.unidade || 'UN',
              areaTipo: act.areaTipo as AreaTipo,
              tags: act.tags || [],
              padrao: act.padrao,
              etapa: etapaLabel,
              order: 0,
              sinapiDescricao: act.sinapiDescricao,
            },
            checked: sugerido && act.padrao,
            quantidade: Math.round(getQuantidadePorArea(act.areaTipo as AreaTipo, areas) * 100) / 100,
            sugerido,
            precoUnitario: 0,
            sinapiCodigo: act.sinapiCodigo || undefined,
            projectActivityId: act.id,
          })
        }
      }
    }

    setRows(newRows)
    setPricesLoaded(false)
    setExpandedIdx(null)
    setTreeData(null)
  }, [open, ambiente.id, ambiente.tags, activityGroupsProp?.phases])

  // Auto-resolve SINAPI prices when rows are built and month is available
  const resolveAllPrices = useCallback(async (currentRows: ServicoRow[], mes: string) => {
    if (!mes) return

    const rowsWithCodigo = currentRows
      .map((r, i) => ({ row: r, idx: i }))
      .filter((x) => x.row.sinapiCodigo && !x.row.precoManual)

    if (rowsWithCodigo.length === 0) {
      setPricesLoaded(true)
      return
    }

    // Mark only non-manual rows as loading
    setRows((prev) => prev.map((r) => (r.sinapiCodigo && !r.precoManual) ? { ...r, loadingPreco: true } : r))

    try {
      const codes = rowsWithCodigo.map((x) => x.row.sinapiCodigo!)
      const resolved = await sinapiAPI.batchResolve({
        codes,
        uf,
        mesReferencia: mes,
        desonerado,
      })

      setRows((prev) => prev.map((r) => {
        if (!r.sinapiCodigo || r.precoManual) return r
        const match = resolved[r.sinapiCodigo]
        if (!match) return { ...r, loadingPreco: false }
        return {
          ...r,
          sinapiComposicaoId: match.id,
          sinapiDescricao: match.descricao,
          precoUnitario: match.custoUnitarioTotal,
          loadingPreco: false,
        }
      }))
    } catch {
      setRows((prev) => prev.map((r) => ({ ...r, loadingPreco: false })))
    }

    setPricesLoaded(true)
  }, [uf, desonerado])

  // Trigger auto-resolve when rows are built and month is ready
  useEffect(() => {
    if (rows.length > 0 && mesReferencia && !pricesLoaded) {
      resolveAllPrices(rows, mesReferencia)
    }
  }, [rows.length, mesReferencia, pricesLoaded])

  const batchMutation = useMutation({
    mutationFn: (itens: any[]) =>
      levantamentoAPI.batchCreateItems(projectId, levantamentoId, itens),
    onSuccess: (data) => {
      toast.success(`${data.addedCount} servicos gerados para "${ambiente.nome}"`)
      queryClient.invalidateQueries({ queryKey: ['levantamento-project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['workflow-check', 'levantamento-items'] })
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const selectedCount = rows.filter((r) => r.checked).length
  const loadingCount = rows.filter((r) => r.loadingPreco).length

  const handleToggle = (idx: number) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, checked: !r.checked } : r))
  }

  const handleQuantidadeChange = (idx: number, value: string) => {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) return
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, quantidade: num } : r))
  }

  const handlePrecoChange = (idx: number, value: string) => {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) return
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, precoUnitario: num, precoManual: true } : r))
  }

  const handleSelectAll = () => {
    const allChecked = rows.every((r) => r.checked)
    setRows((prev) => prev.map((r) => ({ ...r, checked: !allChecked })))
  }

  // ---- SINAPI search for existing row (override) ----

  const handleOpenSinapiSearch = (idx: number) => {
    setSearchTargetIdx(idx)
    setSearchOpen(true)
  }

  const handleSelectComposicao = async (composicao: any) => {
    if (searchTargetIdx === null) return
    const idx = searchTargetIdx

    setRows((prev) => prev.map((r, i) => i === idx ? {
      ...r,
      sinapiComposicaoId: composicao.id,
      sinapiCodigo: composicao.codigo,
      sinapiDescricao: composicao.descricao,
      loadingPreco: true,
    } : r))

    if (mesReferencia) {
      try {
        const calculo = await sinapiAPI.calculateComposicao(composicao.id, {
          uf,
          mesReferencia,
          quantidade: 1,
          desonerado,
        })
        setRows((prev) => prev.map((r, i) => i === idx ? {
          ...r,
          precoUnitario: Math.round(calculo.custoUnitarioTotal * 100) / 100,
          loadingPreco: false,
        } : r))
        if (calculo.itensSemPreco > 0) {
          toast.warning(`${calculo.itensSemPreco} insumo(s) sem preco para ${uf}/${mesReferencia}`)
        }
      } catch {
        setRows((prev) => prev.map((r, i) => i === idx ? { ...r, loadingPreco: false } : r))
        toast.error('Erro ao calcular preco SINAPI')
      }
    } else {
      setRows((prev) => prev.map((r, i) => i === idx ? { ...r, loadingPreco: false } : r))
    }
  }

  // Unlink SINAPI from a row
  const handleUnlinkSinapi = (idx: number) => {
    setRows((prev) => prev.map((r, i) => i === idx ? {
      ...r,
      sinapiComposicaoId: undefined,
      sinapiCodigo: rows[idx].template.sinapiCodigo || undefined,
      sinapiDescricao: undefined,
      precoUnitario: 0,
    } : r))
    if (expandedIdx === idx) {
      setExpandedIdx(null)
      setTreeData(null)
    }
  }

  // Recalculate all linked prices
  const handleRecalculateAll = async () => {
    if (!mesReferencia) {
      toast.warning('Selecione o mes de referencia')
      return
    }
    setPricesLoaded(false)
    setExpandedIdx(null)
    setTreeData(null)
    setRows((prev) => prev.map((r) => r.precoManual ? r : ({
      ...r,
      sinapiComposicaoId: undefined,
      sinapiDescricao: undefined,
      precoUnitario: 0,
      loadingPreco: false,
    })))
  }

  // Toggle tree expand for a row
  const handleToggleTree = async (idx: number) => {
    if (expandedIdx === idx) {
      setExpandedIdx(null)
      setTreeData(null)
      return
    }

    const row = rows[idx]
    if (!row.sinapiComposicaoId || !mesReferencia) return

    setExpandedIdx(idx)
    setTreeData(null)
    setTreeLoading(true)

    try {
      const tree = await sinapiAPI.getComposicaoTree(row.sinapiComposicaoId, {
        uf,
        mesReferencia,
        desonerado,
      })
      setTreeData(tree)
    } catch {
      toast.error('Erro ao carregar arvore de composicao')
      setExpandedIdx(null)
    } finally {
      setTreeLoading(false)
    }
  }

  const handleSubmit = () => {
    const selected = rows.filter((r) => r.checked && r.quantidade > 0)
    if (selected.length === 0) {
      toast.error('Selecione pelo menos um servico')
      return
    }

    const itens = selected.map((r) => ({
      nome: r.sinapiDescricao || r.template.nome || '(sem nome)',
      unidade: r.template.unidade || 'UN',
      quantidade: Math.round(r.quantidade * 100) / 100,
      precoUnitario: Math.round(r.precoUnitario * 100) / 100,
      etapa: r.template.etapa,
      ambienteId: ambiente.id,
      sinapiComposicaoId: r.sinapiComposicaoId || undefined,
      projectActivityId: r.projectActivityId || undefined,
    }))

    batchMutation.mutate(itens)
  }

  // Totals
  const totalCost = rows
    .filter((r) => r.checked)
    .reduce((sum, r) => sum + r.quantidade * r.precoUnitario, 0)

  // Group by PHASE > STAGE from the hierarchy
  const groupedRows = useMemo(() => {
    if (!activityGroupsProp?.phases) return []

    const groups: { key: string; label: string; color: string | null; indices: number[] }[] = []

    for (const phase of activityGroupsProp.phases) {
      for (const stage of phase.stages) {
        const label = `${phase.name} > ${stage.name}`
        const stageActIds = new Set(stage.activities.map(a => a.id))
        const indices: number[] = []
        rows.forEach((r, i) => {
          if (r.projectActivityId && stageActIds.has(r.projectActivityId)) {
            indices.push(i)
          }
        })
        if (indices.length > 0) {
          groups.push({
            key: stage.id,
            label,
            color: phase.color || stage.color,
            indices,
          })
        }
      }
    }

    // Orphan rows (shouldn't happen but just in case)
    const usedIndices = new Set(groups.flatMap(g => g.indices))
    const orphanIndices = rows.map((_, i) => i).filter(i => !usedIndices.has(i))
    if (orphanIndices.length > 0) {
      groups.push({ key: '__orphan__', label: 'Outros', color: null, indices: orphanIndices })
    }

    return groups
  }, [rows, activityGroupsProp])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Gerar Servicos — {ambiente.nome}
            </DialogTitle>
            <DialogDescription>
              Servicos baseados nas atividades do projeto com composicoes SINAPI.
              Quantidades baseadas nas dimensoes ({Number(ambiente.comprimento).toFixed(2)} x {Number(ambiente.largura).toFixed(2)} m).
            </DialogDescription>
          </DialogHeader>

          {/* SINAPI params bar */}
          <div className="flex flex-wrap items-end gap-3 pb-3 border-b">
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">UF</Label>
              <Select value={uf} onValueChange={setUf}>
                <SelectTrigger className="h-8 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UFS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">Mes Ref.</Label>
              <Select value={mesReferencia} onValueChange={setMesReferencia}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {(mesesDisponiveis || []).map((mes: string) => {
                    const [ano, m] = mes.split('-')
                    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
                    const label = `${meses[parseInt(m, 10) - 1]}/${ano}`
                    return <SelectItem key={mes} value={mes}>{label}</SelectItem>
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">Regime</Label>
              <Select value={desonerado ? 'true' : 'false'} onValueChange={(v) => setDesonerado(v === 'true')}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Nao Desonerado</SelectItem>
                  <SelectItem value="true">Desonerado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleRecalculateAll}
              disabled={loadingCount > 0}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingCount > 0 ? 'animate-spin' : ''}`} />
              Recalcular
            </Button>
          </div>

          {/* Areas summary */}
          <div className="flex flex-wrap gap-2 pb-2 border-b">
            <Badge variant="outline" className="text-xs">
              Piso: {areas.areaPiso.toFixed(2)} m2
            </Badge>
            <Badge variant="outline" className="text-xs">
              Parede liq.: {areas.areaParedeLiquida.toFixed(2)} m2
            </Badge>
            <Badge variant="outline" className="text-xs">
              Teto: {areas.areaTeto.toFixed(2)} m2
            </Badge>
            <Badge variant="outline" className="text-xs">
              Perimetro: {areas.perimetro.toFixed(2)} m
            </Badge>
          </div>

          {/* Service list */}
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wand2 className="h-8 w-8 text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-600 font-medium">Nenhuma atividade com SINAPI encontrada</p>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                As atividades do projeto precisam ter codigo SINAPI e tipo de area configurados
                para aparecer aqui. Configure-os no template do projeto.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-2">
              {groupedRows.map((group) => (
                <div key={group.key}>
                  <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={group.color ? { color: group.color } : { color: 'rgb(115, 115, 115)' }}>
                    {group.label}
                  </h4>
                  <div className="space-y-1">
                    {group.indices.map((idx) => {
                      const row = rows[idx]
                      const isExpanded = expandedIdx === idx
                      const canExpand = !!row.sinapiComposicaoId && !!mesReferencia

                      return (
                        <div
                          key={row.template.id}
                          className={`rounded-md border transition-colors ${
                            row.checked ? 'bg-primary/5 border-primary/20' : 'bg-neutral-50 border-transparent'
                          }`}
                        >
                          {/* Main row */}
                          <div className="flex items-center gap-2 px-3 py-2">
                            <Checkbox
                              checked={row.checked}
                              onChange={() => handleToggle(idx)}
                            />
                            {/* Tree expand button */}
                            {canExpand ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 shrink-0"
                                onClick={() => handleToggleTree(idx)}
                                title="Ver composicao detalhada"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-orange-500" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
                                )}
                              </Button>
                            ) : (
                              <div className="w-6 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium">
                                  {row.template.nome}
                                </span>
                                {!row.sugerido && (
                                  <Badge variant="outline" className="text-[9px] text-neutral-400 border-neutral-200">
                                    opcional
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {AREA_LABELS[row.template.areaTipo]}
                            </Badge>
                            <div className="flex items-center gap-1 shrink-0">
                              <Input
                                className="h-7 w-16 text-xs text-right"
                                type="number"
                                step="0.01"
                                value={row.quantidade}
                                onChange={(e) => handleQuantidadeChange(idx, e.target.value)}
                                disabled={!row.checked}
                              />
                              <span className="text-xs text-neutral-400 w-6">{row.template.unidade}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {row.loadingPreco ? (
                                <div className="w-20 flex justify-center">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
                                </div>
                              ) : (
                                <Input
                                  className={`h-7 w-20 text-xs text-right ${row.precoManual ? 'border-amber-400 bg-amber-50' : ''}`}
                                  type="number"
                                  step="0.01"
                                  placeholder="R$ 0,00"
                                  value={row.precoUnitario || ''}
                                  onChange={(e) => handlePrecoChange(idx, e.target.value)}
                                  disabled={!row.checked}
                                  title={row.precoManual ? 'Preco editado manualmente' : ''}
                                />
                              )}
                              {row.precoManual && row.sinapiCodigo && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-amber-500 hover:text-blue-600 shrink-0"
                                  onClick={() => {
                                    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, precoManual: false, precoUnitario: 0 } : r))
                                    setPricesLoaded(false)
                                  }}
                                  title="Restaurar preco SINAPI"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            {row.checked && !row.sinapiComposicaoId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 shrink-0"
                                onClick={() => handleOpenSinapiSearch(idx)}
                                title="Buscar composicao SINAPI"
                              >
                                <Search className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {row.sinapiComposicaoId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-400 hover:text-red-600 shrink-0"
                                onClick={() => handleUnlinkSinapi(idx)}
                                title="Desvincular SINAPI"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                          {/* SINAPI linked info */}
                          {row.sinapiComposicaoId && (
                            <div className="mt-0.5 mb-1 ml-14 mr-3 flex items-center gap-2">
                              <Link2 className="h-3 w-3 text-blue-500" />
                              <Badge variant="secondary" className="text-[10px] font-mono">
                                {row.sinapiCodigo}
                              </Badge>
                              <span className="text-[11px] text-neutral-500 truncate max-w-[300px]">
                                {row.sinapiDescricao}
                              </span>
                              <span className="text-[11px] font-medium text-green-700 ml-auto shrink-0">
                                {formatCurrency(row.precoUnitario)}/{row.template.unidade}
                              </span>
                            </div>
                          )}
                          {/* SINAPI code not found warning */}
                          {row.sinapiCodigo && !row.sinapiComposicaoId && !row.loadingPreco && pricesLoaded && (
                            <div className="mt-1 mb-1 ml-14 mr-3 flex items-center gap-1.5">
                              <span className="text-[10px] text-amber-500">
                                Codigo {row.sinapiCodigo} nao encontrado na base SINAPI
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1.5 text-[10px] text-blue-500"
                                onClick={() => handleOpenSinapiSearch(idx)}
                              >
                                Buscar
                              </Button>
                            </div>
                          )}
                          {/* Composition tree (expanded) */}
                          {isExpanded && (
                            <div className="mx-3 mb-2 mt-1">
                              {treeLoading ? (
                                <div className="flex items-center gap-2 py-4 justify-center text-xs text-neutral-500">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Carregando arvore de composicao...
                                </div>
                              ) : treeData ? (
                                <ComposicaoTree data={treeData} />
                              ) : null}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            <Button variant="ghost" size="sm" onClick={handleSelectAll} disabled={rows.length === 0}>
              {rows.every((r) => r.checked) ? 'Desmarcar todos' : 'Selecionar todos'}
            </Button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-sm text-neutral-500">{selectedCount} selecionados</span>
                {totalCost > 0 && (
                  <span className="text-sm font-medium text-green-700 ml-2">
                    {formatCurrency(totalCost)}
                  </span>
                )}
              </div>
              <Button onClick={handleSubmit} disabled={selectedCount === 0 || batchMutation.isPending || loadingCount > 0}>
                {batchMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Gerar {selectedCount} Ite{selectedCount === 1 ? 'm' : 'ns'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SINAPI Search Dialog (for override existing row) */}
      <SinapiSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        mode="composicoes"
        onSelectComposicao={handleSelectComposicao}
      />
    </>
  )
}
