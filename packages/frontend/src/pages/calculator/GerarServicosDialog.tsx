import { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { levantamentoAPI } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, Wand2 } from 'lucide-react'
import {
  getServicosPorTipo,
  calcularAreas,
  getQuantidadePorArea,
  AREA_LABELS,
  type ServicoSugerido,
} from './servicosCatalogo'

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
}

export function GerarServicosDialog({
  open,
  onOpenChange,
  ambiente,
  projectId,
  levantamentoId,
}: GerarServicosDialogProps) {
  const queryClient = useQueryClient()

  const areas = useMemo(() => calcularAreas(ambiente), [ambiente])

  const servicosSugeridos = useMemo(
    () => getServicosPorTipo(ambiente.tipo),
    [ambiente.tipo],
  )

  const [rows, setRows] = useState<ServicoRow[]>(() => buildRows(servicosSugeridos, areas))

  // Rebuild rows when dialog opens with different ambiente
  useMemo(() => {
    if (open) {
      setRows(buildRows(servicosSugeridos, areas))
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

  const handleToggle = (idx: number) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, checked: !r.checked } : r))
  }

  const handleQuantidadeChange = (idx: number, value: string) => {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) return
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, quantidade: num } : r))
  }

  const handleSelectAll = () => {
    const allChecked = rows.every((r) => r.checked)
    setRows((prev) => prev.map((r) => ({ ...r, checked: !allChecked })))
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
      precoUnitario: 0,
      etapa: r.servico.etapa,
      ambienteId: ambiente.id,
    }))

    batchMutation.mutate(itens)
  }

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Gerar Servicos — {ambiente.nome}
          </DialogTitle>
          <DialogDescription>
            Selecione os servicos necessarios. As quantidades ja foram calculadas
            a partir das dimensoes do ambiente ({Number(ambiente.comprimento).toFixed(2)} x {Number(ambiente.largura).toFixed(2)} m).
          </DialogDescription>
        </DialogHeader>

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
                      className={`flex items-center gap-3 px-3 py-2 rounded-md border transition-colors ${
                        row.checked ? 'bg-primary/5 border-primary/20' : 'bg-neutral-50 border-transparent'
                      }`}
                    >
                      <Checkbox
                        checked={row.checked}
                        onChange={() => handleToggle(idx)}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{row.servico.nome}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {AREA_LABELS[row.servico.areaTipo]}
                      </Badge>
                      <div className="flex items-center gap-1 shrink-0">
                        <Input
                          className="h-7 w-20 text-xs text-right"
                          type="number"
                          step="0.01"
                          value={row.quantidade}
                          onChange={(e) => handleQuantidadeChange(idx, e.target.value)}
                          disabled={!row.checked}
                        />
                        <span className="text-xs text-neutral-400 w-6">{row.servico.unidade}</span>
                      </div>
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
            <span className="text-sm text-neutral-500">{selectedCount} selecionados</span>
            <Button onClick={handleSubmit} disabled={selectedCount === 0 || batchMutation.isPending}>
              {batchMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Gerar {selectedCount} Ite{selectedCount === 1 ? 'm' : 'ns'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function buildRows(
  servicos: ServicoSugerido[],
  areas: ReturnType<typeof calcularAreas>,
): ServicoRow[] {
  return servicos.map((s) => ({
    servico: s,
    checked: s.padrao,
    quantidade: Math.round(getQuantidadePorArea(s.areaTipo, areas) * 100) / 100,
    areaLabel: AREA_LABELS[s.areaTipo],
  }))
}
