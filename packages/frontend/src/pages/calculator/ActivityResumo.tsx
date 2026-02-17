import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Layers } from 'lucide-react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
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

interface ActivityResumoProps {
  activities: any[]
  itens: any[]
  quantidadeUnidades?: number
}

export function ActivityResumo({ activities, itens, quantidadeUnidades = 1 }: ActivityResumoProps) {
  const stages = useMemo(() => collectStages(activities), [activities])

  const resumo = useMemo(() => {
    const stageIds = new Set(stages.map((s) => s.id))

    const activityBreakdown = stages.map((stage) => {
      const stageItens = itens.filter((i: any) => i.projectActivityId === stage.id)
      const total = stageItens.reduce(
        (sum: number, i: any) => sum + Number(i.quantidade) * Number(i.precoUnitario),
        0,
      )
      return {
        id: stage.id,
        name: stage.name,
        parentName: stage.parentName,
        color: stage.color,
        itemCount: stageItens.length,
        total,
      }
    })

    const activitiesWithItens = activityBreakdown.filter((a) => a.itemCount > 0).length

    // Distinct parent phases covered
    const etapasCovered = new Set(stages.map((s) => s.parentName || s.name).filter(Boolean)).size

    // Orphaned items (no projectActivityId or unknown activityId)
    const orphanedItens = itens.filter(
      (i: any) => !i.projectActivityId || !stageIds.has(i.projectActivityId),
    )
    const orphanedTotal = orphanedItens.reduce(
      (sum: number, i: any) => sum + Number(i.quantidade) * Number(i.precoUnitario),
      0,
    )

    const linkedTotal = activityBreakdown.reduce((sum, a) => sum + a.total, 0)
    const totalGeral = linkedTotal + orphanedTotal

    return {
      activityBreakdown,
      activitiesWithItens,
      totalItens: itens.length,
      etapasCovered,
      totalGeral,
      orphanedItens,
      orphanedTotal,
    }
  }, [stages, itens])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-neutral-500" />
        <h3 className="text-lg font-semibold">Resumo Geral</h3>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 px-4 text-center">
            <p className="text-2xl font-bold">{resumo.activitiesWithItens}</p>
            <p className="text-xs text-neutral-500">Atividades com itens</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 text-center">
            <p className="text-2xl font-bold">{resumo.totalItens}</p>
            <p className="text-xs text-neutral-500">Total de itens</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 text-center">
            <p className="text-2xl font-bold">{resumo.etapasCovered}</p>
            <p className="text-xs text-neutral-500">Etapas cobertas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 text-center">
            <p className="text-2xl font-bold text-green-700">{formatCurrency(resumo.totalGeral)}</p>
            <p className="text-xs text-neutral-500">Custo Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Unit multiplier */}
      {quantidadeUnidades > 1 && resumo.totalGeral > 0 && (
        <Card className="bg-blue-50/60 border-blue-200">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Multiplicador — {quantidadeUnidades} unidades cadastradas</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-blue-600">Total por unidade</p>
                <p className="text-lg font-bold text-blue-800">{formatCurrency(resumo.totalGeral)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-600">Total x {quantidadeUnidades} unidades</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(resumo.totalGeral * quantidadeUnidades)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breakdown by activity */}
      {resumo.activityBreakdown.some((a) => a.itemCount > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Custo por Atividade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resumo.activityBreakdown.map((act) => {
                if (act.itemCount === 0) return null
                const pct = resumo.totalGeral > 0 ? (act.total / resumo.totalGeral) * 100 : 0
                const label = act.parentName ? `${act.parentName} > ${act.name}` : act.name
                return (
                  <div key={act.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-sm font-medium truncate"
                          style={act.color ? { color: act.color } : undefined}
                        >
                          {label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-400">{act.itemCount} itens</span>
                          <span className="text-sm font-medium">{formatCurrency(act.total)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: act.color || 'hsl(var(--primary))' }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Orphaned items */}
              {resumo.orphanedItens.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-400 truncate">Sem atividade</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-400">{resumo.orphanedItens.length} itens</span>
                        <span className="text-sm font-medium">{formatCurrency(resumo.orphanedTotal)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-1.5">
                      <div
                        className="bg-neutral-300 h-1.5 rounded-full transition-all"
                        style={{ width: `${resumo.totalGeral > 0 ? Math.min((resumo.orphanedTotal / resumo.totalGeral) * 100, 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {itens.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-10 w-10 text-neutral-200" />
            <h3 className="mt-3 text-sm font-medium text-neutral-600">Nenhum item cadastrado</h3>
            <p className="mt-1 text-xs text-neutral-400 max-w-sm text-center">
              Selecione uma atividade na barra lateral para adicionar materiais e serviços.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
