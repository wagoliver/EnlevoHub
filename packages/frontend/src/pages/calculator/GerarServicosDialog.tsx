import { useState, useMemo, useEffect } from 'react'
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
import { Loader2, Wand2, Search, Link2, X } from 'lucide-react'
import { SinapiSearchDialog } from './SinapiSearchDialog'
import {
  SERVICOS_CATALOGO,
  getServicosPorTipo,
  calcularAreas,
  getQuantidadePorArea,
  AREA_LABELS,
  type ServicoSugerido,
} from './servicosCatalogo'

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

interface ServicoRow {
  servico: ServicoSugerido
  checked: boolean
  quantidade: number
  areaLabel: string
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

  // SINAPI search
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTargetIdx, setSearchTargetIdx] = useState<number | null>(null)

  const areas = useMemo(() => calcularAreas(ambiente), [ambiente])

  const sugeridosIds = useMemo(() => {
    const sugeridos = getServicosPorTipo(ambiente.tipo)
    return new Set(sugeridos.map((s) => s.id))
  }, [ambiente.tipo])

  const [rows, setRows] = useState<ServicoRow[]>(() => buildRows(SERVICOS_CATALOGO, areas, sugeridosIds))

  // Fetch available months
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

  // Rebuild rows when dialog opens with different ambiente
  useMemo(() => {
    if (open) {
      setRows(buildRows(SERVICOS_CATALOGO, areas, sugeridosIds))
    }
  }, [open, ambiente.id])

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
  const linkedCount = rows.filter((r) => r.checked && r.sinapiComposicaoId).length

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

  // Open SINAPI search for a specific row
  const handleOpenSinapiSearch = (idx: number) => {
    setSearchTargetIdx(idx)
    setSearchOpen(true)
  }

  // When a SINAPI composition is selected from search
  const handleSelectComposicao = async (composicao: any) => {
    if (searchTargetIdx === null) return
    const idx = searchTargetIdx

    // Mark row as loading
    setRows((prev) => prev.map((r, i) => i === idx ? {
      ...r,
      sinapiComposicaoId: composicao.id,
      sinapiCodigo: composicao.codigo,
      sinapiDescricao: composicao.descricao,
      loadingPreco: true,
    } : r))

    // Calculate unit cost
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
      toast.warning('Selecione o mes de referencia para calcular o preco')
    }
  }

  // Unlink SINAPI from a row
  const handleUnlinkSinapi = (idx: number) => {
    setRows((prev) => prev.map((r, i) => i === idx ? {
      ...r,
      sinapiComposicaoId: undefined,
      sinapiCodigo: undefined,
      sinapiDescricao: undefined,
      precoUnitario: 0,
    } : r))
  }

  // Recalculate all SINAPI-linked prices when UF/month/regime changes
  const handleRecalculateAll = async () => {
    if (!mesReferencia) {
      toast.warning('Selecione o mes de referencia')
      return
    }

    const linked = rows
      .map((r, i) => ({ row: r, idx: i }))
      .filter((x) => x.row.sinapiComposicaoId)

    if (linked.length === 0) {
      toast.info('Nenhum servico vinculado ao SINAPI')
      return
    }

    // Mark all as loading
    setRows((prev) => prev.map((r) => r.sinapiComposicaoId ? { ...r, loadingPreco: true } : r))

    for (const { row, idx } of linked) {
      try {
        const calculo = await sinapiAPI.calculateComposicao(row.sinapiComposicaoId!, {
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
      } catch {
        setRows((prev) => prev.map((r, i) => i === idx ? { ...r, loadingPreco: false } : r))
      }
    }

    toast.success(`Precos recalculados para ${uf}/${mesReferencia}`)
  }

  const handleSubmit = () => {
    const selected = rows.filter((r) => r.checked && r.quantidade > 0)
    if (selected.length === 0) {
      toast.error('Selecione pelo menos um servico')
      return
    }

    const itens = selected.map((r) => ({
      nome: r.servico.nome,
      unidade: r.servico.unidade,
      quantidade: Math.round(r.quantidade * 100) / 100,
      precoUnitario: Math.round(r.precoUnitario * 100) / 100,
      etapa: r.servico.etapa,
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
      const key = r.servico.etapa
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(i)
    })
    return Array.from(map.entries())
  }, [rows])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Gerar Servicos — {ambiente.nome}
            </DialogTitle>
            <DialogDescription>
              Selecione os servicos e vincule composicoes SINAPI para precos de referencia.
              Quantidades calculadas a partir das dimensoes ({Number(ambiente.comprimento).toFixed(2)} x {Number(ambiente.largura).toFixed(2)} m).
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
            {linkedCount > 0 && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleRecalculateAll}>
                Recalcular Precos
              </Button>
            )}
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
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-2">
            {etapas.map(([etapa, indices]) => (
              <div key={etapa}>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  {etapa}
                </h4>
                <div className="space-y-1">
                  {indices.map((idx) => {
                    const row = rows[idx]
                    return (
                      <div
                        key={row.servico.id}
                        className={`px-3 py-2 rounded-md border transition-colors ${
                          row.checked ? 'bg-primary/5 border-primary/20' : 'bg-neutral-50 border-transparent'
                        }`}
                      >
                        {/* Main row */}
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={row.checked}
                            onChange={() => handleToggle(idx)}
                          />
                          <div className="flex-1 min-w-0 flex items-center gap-1.5">
                            <span className="text-sm font-medium">{row.servico.nome}</span>
                            {!row.sugerido && (
                              <Badge variant="outline" className="text-[9px] text-neutral-400 border-neutral-200">
                                opcional
                              </Badge>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {AREA_LABELS[row.servico.areaTipo]}
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
                            <span className="text-xs text-neutral-400 w-6">{row.servico.unidade}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {row.loadingPreco ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
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
                          {/* SINAPI link button */}
                          {row.checked && !row.sinapiComposicaoId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 shrink-0"
                              onClick={() => handleOpenSinapiSearch(idx)}
                              title="Vincular composicao SINAPI"
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
                          <div className="mt-1.5 ml-7 flex items-center gap-2">
                            <Link2 className="h-3 w-3 text-blue-500" />
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              {row.sinapiCodigo}
                            </Badge>
                            <span className="text-[11px] text-neutral-500 truncate max-w-[300px]">
                              {row.sinapiDescricao}
                            </span>
                            <span className="text-[11px] font-medium text-green-700 ml-auto shrink-0">
                              {formatCurrency(row.precoUnitario)}/{row.servico.unidade}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

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
              <Button onClick={handleSubmit} disabled={selectedCount === 0 || batchMutation.isPending}>
                {batchMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Gerar {selectedCount} Ite{selectedCount === 1 ? 'm' : 'ns'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SINAPI Search Dialog (reused) */}
      <SinapiSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        mode="composicoes"
        onSelectComposicao={handleSelectComposicao}
      />
    </>
  )
}

function buildRows(
  servicos: ServicoSugerido[],
  areas: ReturnType<typeof calcularAreas>,
  sugeridosIds: Set<string>,
): ServicoRow[] {
  return servicos.map((s) => {
    const sugerido = sugeridosIds.has(s.id)
    return {
      servico: s,
      checked: sugerido && s.padrao,
      quantidade: Math.round(getQuantidadePorArea(s.areaTipo, areas) * 100) / 100,
      areaLabel: AREA_LABELS[s.areaTipo],
      sugerido,
      precoUnitario: 0,
    }
  })
}
