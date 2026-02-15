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

interface GerarServicosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ambiente: any
  projectId: string
  levantamentoId: string
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
  sinapiComposicaoId?: string
  sinapiCodigo?: string
  sinapiDescricao?: string
  loadingPreco?: boolean
}

export function GerarServicosDialog({
  open,
  onOpenChange,
  ambiente,
  projectId,
  levantamentoId,
}: GerarServicosDialogProps) {
  const queryClient = useQueryClient()

  // SINAPI params
  const [uf, setUf] = useState('SP')
  const [mesReferencia, setMesReferencia] = useState('')
  const [desonerado, setDesonerado] = useState(false)

  // SINAPI search (manual override)
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

  // Fetch templates from DB
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['servico-templates'],
    queryFn: () => levantamentoAPI.listTemplates(),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  })

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

  // Build rows from templates when they load or ambiente changes
  useEffect(() => {
    if (!open || !templates || !Array.isArray(templates)) return

    const activeTemplates = templates.filter((t: any) => t.ativo !== false)
    const ambienteTags: string[] = ambiente.tags || []
    const newRows: ServicoRow[] = activeTemplates.map((t: any) => {
      const sugerido = templateAplicaAoAmbiente(t.tags || [], ambienteTags)
      return {
        template: t,
        checked: sugerido && t.padrao,
        quantidade: Math.round(getQuantidadePorArea(t.areaTipo, areas) * 100) / 100,
        sugerido,
        precoUnitario: 0,
        sinapiCodigo: t.sinapiCodigo || undefined,
      }
    })
    setRows(newRows)
    setPricesLoaded(false)
    setExpandedIdx(null)
    setTreeData(null)
  }, [open, templates, ambiente.id, ambiente.tags])

  // Auto-resolve SINAPI prices when rows are built and month is available
  const resolveAllPrices = useCallback(async (currentRows: ServicoRow[], mes: string) => {
    if (!mes) return

    const rowsWithCodigo = currentRows
      .map((r, i) => ({ row: r, idx: i }))
      .filter((x) => x.row.sinapiCodigo)

    if (rowsWithCodigo.length === 0) return

    // Mark all as loading
    setRows((prev) => prev.map((r) => r.sinapiCodigo ? { ...r, loadingPreco: true } : r))

    // Resolve codes to compositions in parallel (batch search)
    for (const { row, idx } of rowsWithCodigo) {
      try {
        // Search SINAPI by code
        const searchResult = await sinapiAPI.searchComposicoes({
          search: row.sinapiCodigo!,
          page: 1,
          limit: 1,
        })

        const composicao = searchResult?.data?.[0]
        if (!composicao || composicao.codigo !== row.sinapiCodigo) {
          // Code not found in SINAPI database
          setRows((prev) => prev.map((r, i) => i === idx ? { ...r, loadingPreco: false } : r))
          continue
        }

        // Calculate unit cost
        const calculo = await sinapiAPI.calculateComposicao(composicao.id, {
          uf,
          mesReferencia: mes,
          quantidade: 1,
          desonerado,
        })

        setRows((prev) => prev.map((r, i) => i === idx ? {
          ...r,
          sinapiComposicaoId: composicao.id,
          sinapiDescricao: composicao.descricao,
          precoUnitario: Math.round(calculo.custoUnitarioTotal * 100) / 100,
          loadingPreco: false,
        } : r))
      } catch {
        setRows((prev) => prev.map((r, i) => i === idx ? { ...r, loadingPreco: false } : r))
      }
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
      queryClient.invalidateQueries({ queryKey: ['levantamento', projectId, levantamentoId] })
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
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, precoUnitario: num } : r))
  }

  const handleSelectAll = () => {
    const allChecked = rows.every((r) => r.checked)
    setRows((prev) => prev.map((r) => ({ ...r, checked: !allChecked })))
  }

  // Open SINAPI search for manual override
  const handleOpenSinapiSearch = (idx: number) => {
    setSearchTargetIdx(idx)
    setSearchOpen(true)
  }

  // Manual SINAPI composition selection (override)
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
    // Reset prices and re-resolve
    setRows((prev) => prev.map((r) => ({
      ...r,
      sinapiComposicaoId: undefined,
      sinapiDescricao: undefined,
      precoUnitario: 0,
      loadingPreco: false,
    })))
    // Will trigger useEffect
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
      nome: r.sinapiDescricao || r.template.nome || r.template.nomeCustom || '(sem nome)',
      unidade: r.template.unidade || 'UN',
      quantidade: Math.round(r.quantidade * 100) / 100,
      precoUnitario: Math.round(r.precoUnitario * 100) / 100,
      etapa: r.template.etapa,
      ambienteId: ambiente.id,
      sinapiComposicaoId: r.sinapiComposicaoId || undefined,
    }))

    batchMutation.mutate(itens)
  }

  // Totals
  const totalCost = rows
    .filter((r) => r.checked)
    .reduce((sum, r) => sum + r.quantidade * r.precoUnitario, 0)

  // Group by etapa
  const etapas = useMemo(() => {
    const map = new Map<string, number[]>()
    rows.forEach((r, i) => {
      const key = r.template.etapa
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(i)
    })
    return Array.from(map.entries())
  }, [rows])

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
              Servicos pre-configurados com composicoes SINAPI. Precos calculados automaticamente.
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
          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-2">
              {etapas.map(([etapa, indices]) => (
                <div key={etapa}>
                  <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                    {etapa}
                  </h4>
                  <div className="space-y-1">
                    {indices.map((idx) => {
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
                                <span className="text-sm font-medium">{row.template.nome}</span>
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
                                  className="h-7 w-20 text-xs text-right"
                                  type="number"
                                  step="0.01"
                                  placeholder="R$ 0,00"
                                  value={row.precoUnitario || ''}
                                  onChange={(e) => handlePrecoChange(idx, e.target.value)}
                                  disabled={!row.checked}
                                />
                              )}
                            </div>
                            {/* SINAPI manual link button (only if no code or unresolved) */}
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
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
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

      {/* SINAPI Search Dialog (for manual override) */}
      <SinapiSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        mode="composicoes"
        onSelectComposicao={handleSelectComposicao}
      />
    </>
  )
}
