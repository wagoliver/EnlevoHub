import { useState, useMemo } from 'react'
import { Home, ChevronRight, ChevronDown, Square, Ruler, Box } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getUnitForAreaTipo } from './servicosCatalogo'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface ActivitySidebarProps {
  activities: any[]
  itens: any[]
  selectedActivityId: string | null
  onSelect: (activityId: string | null) => void
}

function getAreaIcon(areaTipo?: string | null) {
  switch (areaTipo) {
    case 'VOLUME': return Box
    case 'PERIMETRO': case 'LINEAR': return Ruler
    default: return Square
  }
}

/** Collect all STAGE-level activities from the tree */
function collectStages(items: any[]): any[] {
  const stages: any[] = []
  for (const item of items) {
    if (item.level === 'STAGE') stages.push(item)
    if (item.children?.length) stages.push(...collectStages(item.children))
  }
  return stages
}

export function ActivitySidebar({
  activities,
  itens,
  selectedActivityId,
  onSelect,
}: ActivitySidebarProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())

  // Build stats for each STAGE activity
  const stageStats = useMemo(() => {
    const stats = new Map<string, { itemCount: number; total: number }>()
    const stages = collectStages(activities)
    for (const stage of stages) {
      const stageItens = itens.filter((i: any) => i.projectActivityId === stage.id)
      const total = stageItens.reduce(
        (sum: number, i: any) => sum + Number(i.quantidade) * Number(i.precoUnitario),
        0,
      )
      stats.set(stage.id, { itemCount: stageItens.length, total })
    }
    return stats
  }, [activities, itens])

  // Summary totals
  const { totalItens, totalCusto, itensOrfaos } = useMemo(() => {
    const allStageIds = new Set(collectStages(activities).map((s) => s.id))
    const linked = itens.filter((i: any) => i.projectActivityId && allStageIds.has(i.projectActivityId))
    const orphaned = itens.filter((i: any) => !i.projectActivityId || !allStageIds.has(i.projectActivityId))
    return {
      totalItens: linked.length,
      totalCusto: linked.reduce((sum: number, i: any) => sum + Number(i.quantidade) * Number(i.precoUnitario), 0),
      itensOrfaos: orphaned.length,
    }
  }, [activities, itens])

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phaseId)) next.delete(phaseId)
      else next.add(phaseId)
      return next
    })
  }

  const renderStage = (stage: any) => {
    const stats = stageStats.get(stage.id) || { itemCount: 0, total: 0 }
    const Icon = getAreaIcon(stage.areaTipo)
    const unit = getUnitForAreaTipo(stage.areaTipo)
    const isSelected = selectedActivityId === stage.id

    return (
      <button
        key={stage.id}
        onClick={() => onSelect(stage.id)}
        className={cn(
          'w-full text-left pl-7 pr-3 py-2 border-b transition-colors hover:bg-neutral-50',
          isSelected && 'bg-primary/5 border-l-2 border-l-primary',
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Icon className="h-3 w-3 text-neutral-400 flex-shrink-0" />
            <span className="text-xs font-medium truncate">{stage.name}</span>
          </div>
          <span className="text-[10px] text-neutral-400 flex-shrink-0 ml-1">{unit}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[10px] text-neutral-400">{stats.itemCount} itens</span>
          {stats.total > 0 && (
            <span className="text-[10px] font-medium text-green-700">{formatCurrency(stats.total)}</span>
          )}
        </div>
      </button>
    )
  }

  const renderPhase = (phase: any) => {
    const isExpanded = expandedPhases.has(phase.id)
    const stages = (phase.children || []).filter((c: any) => c.level === 'STAGE')
    if (stages.length === 0) return null

    // Phase-level totals
    const phaseTotal = stages.reduce((sum: number, s: any) => {
      const stats = stageStats.get(s.id)
      return sum + (stats?.total || 0)
    }, 0)

    return (
      <div key={phase.id}>
        <button
          onClick={() => togglePhase(phase.id)}
          className="w-full text-left px-3 py-2 border-b transition-colors hover:bg-neutral-50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-neutral-400" />
              ) : (
                <ChevronRight className="h-3 w-3 text-neutral-400" />
              )}
              <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                {phase.name}
              </span>
            </div>
            {phaseTotal > 0 && (
              <span className="text-[10px] font-medium text-green-700">{formatCurrency(phaseTotal)}</span>
            )}
          </div>
        </button>
        {isExpanded && stages.map(renderStage)}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Atividades</span>
      </div>

      {/* Activity tree */}
      <div className="flex-1 overflow-y-auto">
        {/* "Resumo geral" option */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'w-full text-left px-3 py-2.5 border-b transition-colors hover:bg-neutral-50',
            selectedActivityId === null && 'bg-primary/5 border-l-2 border-l-primary',
          )}
        >
          <div className="flex items-center gap-2">
            <Home className="h-3.5 w-3.5 text-neutral-400" />
            <span className="text-sm font-medium">Resumo Geral</span>
          </div>
        </button>

        {/* Phases with their stages */}
        {activities
          .filter((a: any) => a.level === 'PHASE')
          .map(renderPhase)}

        {/* Top-level stages (without phase parent) */}
        {activities
          .filter((a: any) => a.level === 'STAGE' && !activities.some((p: any) => p.level === 'PHASE' && p.children?.some((c: any) => c.id === a.id)))
          .map(renderStage)}

        {activities.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-neutral-400">Nenhuma atividade</p>
          </div>
        )}
      </div>

      {/* Summary footer */}
      <div className="border-t px-3 py-3 bg-neutral-50/80 space-y-1">
        <div className="flex justify-between text-xs text-neutral-500">
          <span>{collectStages(activities).length} atividade{collectStages(activities).length !== 1 ? 's' : ''}</span>
          <span>{totalItens} ite{totalItens === 1 ? 'm' : 'ns'}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-neutral-500">Total:</span>
          <span className="text-sm font-bold text-green-700">{formatCurrency(totalCusto)}</span>
        </div>
        {itensOrfaos > 0 && (
          <div className="text-[10px] text-amber-500 text-right">
            +{itensOrfaos} ite{itensOrfaos === 1 ? 'm' : 'ns'} sem atividade
          </div>
        )}
      </div>
    </div>
  )
}
