import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface AmbienteSidebarProps {
  ambientes: any[]
  itens: any[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onAdd: () => void
  onEdit: (ambiente: any) => void
  onDelete: (id: string) => void
  canEdit: boolean
}

export function AmbienteSidebar({
  ambientes,
  itens,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  canEdit,
}: AmbienteSidebarProps) {
  // Calculate area for each ambiente
  const ambientesWithArea = useMemo(() => {
    return ambientes.map((amb) => {
      const comp = Number(amb.comprimento)
      const larg = Number(amb.largura)
      const area = comp * larg
      const ambItens = itens.filter((i: any) => i.ambienteId === amb.id)
      const total = ambItens.reduce(
        (sum: number, i: any) => sum + Number(i.quantidade) * Number(i.precoUnitario),
        0,
      )
      return { ...amb, area, itemCount: ambItens.length, total }
    })
  }, [ambientes, itens])

  // Summary — only items that belong to ambientes
  const { totalAmbientes, totalItensAmbientes, itensOrfaos } = useMemo(() => {
    const ambienteIds = new Set(ambientes.map((a: any) => a.id))
    const comAmbiente = itens.filter((i: any) => i.ambienteId && ambienteIds.has(i.ambienteId))
    const semAmbiente = itens.filter((i: any) => !i.ambienteId || !ambienteIds.has(i.ambienteId))
    return {
      totalAmbientes: comAmbiente.reduce((sum: number, i: any) => sum + Number(i.quantidade) * Number(i.precoUnitario), 0),
      totalItensAmbientes: comAmbiente.length,
      itensOrfaos: semAmbiente.length,
    }
  }, [ambientes, itens])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Ambientes</span>
        {canEdit && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Ambiente list */}
      <div className="flex-1 overflow-y-auto">
        {/* "Resumo geral" option */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'w-full text-left px-3 py-2.5 border-b transition-colors hover:bg-neutral-50',
            selectedId === null && 'bg-primary/5 border-l-2 border-l-primary',
          )}
        >
          <div className="flex items-center gap-2">
            <Home className="h-3.5 w-3.5 text-neutral-400" />
            <span className="text-sm font-medium">Resumo Geral</span>
          </div>
        </button>

        {ambientesWithArea.map((amb) => (
          <button
            key={amb.id}
            onClick={() => onSelect(amb.id)}
            className={cn(
              'w-full text-left px-3 py-2.5 border-b transition-colors hover:bg-neutral-50 group',
              selectedId === amb.id && 'bg-primary/5 border-l-2 border-l-primary',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">{amb.nome}</span>
              {canEdit && (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(amb) }}
                    className="p-1 rounded hover:bg-neutral-200"
                  >
                    <Pencil className="h-3 w-3 text-neutral-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const msg = amb.itemCount > 0
                        ? `Remover ambiente "${amb.nome}" e seus ${amb.itemCount} itens?`
                        : `Remover ambiente "${amb.nome}"?`
                      if (confirm(msg)) onDelete(amb.id)
                    }}
                    className="p-1 rounded hover:bg-red-100"
                  >
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xs text-neutral-400">{amb.area.toFixed(1)} m2</span>
              <span className="text-xs text-neutral-500">{amb.itemCount} itens</span>
            </div>
            {amb.total > 0 && (
              <span className="text-xs font-medium text-green-700">{formatCurrency(amb.total)}</span>
            )}
          </button>
        ))}

        {ambientes.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-neutral-400">Nenhum ambiente</p>
            <p className="text-[10px] text-neutral-300 mt-1">Cadastre cômodos na planta para importar automaticamente</p>
          </div>
        )}
      </div>

      {/* Summary footer */}
      <div className="border-t px-3 py-3 bg-neutral-50/80 space-y-1">
        <div className="flex justify-between text-xs text-neutral-500">
          <span>{ambientes.length} ambiente{ambientes.length !== 1 ? 's' : ''}</span>
          <span>{totalItensAmbientes} ite{totalItensAmbientes === 1 ? 'm' : 'ns'}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-neutral-500">Total:</span>
          <span className="text-sm font-bold text-green-700">{formatCurrency(totalAmbientes)}</span>
        </div>
        {itensOrfaos > 0 && (
          <div className="text-[10px] text-amber-500 text-right">
            +{itensOrfaos} ite{itensOrfaos === 1 ? 'm' : 'ns'} sem ambiente
          </div>
        )}
      </div>
    </div>
  )
}
