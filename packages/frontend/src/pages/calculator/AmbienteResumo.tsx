import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Layers } from 'lucide-react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface AmbienteResumoProps {
  ambientes: any[]
  itens: any[]
  activityGroups?: any
  quantidadeUnidades?: number
}

export function AmbienteResumo({ ambientes, itens, activityGroups, quantidadeUnidades = 1 }: AmbienteResumoProps) {
  const resumo = useMemo(() => {
    const ambientesData = ambientes.map((amb) => {
      const comp = Number(amb.comprimento)
      const larg = Number(amb.largura)
      const area = comp * larg
      const ambItens = itens.filter((i: any) => i.ambienteId === amb.id)
      const total = ambItens.reduce(
        (sum: number, i: any) => sum + Number(i.quantidade) * Number(i.precoUnitario),
        0,
      )
      return { id: amb.id, nome: amb.nome, area, itemCount: ambItens.length, total }
    })

    const itensSemAmbiente = itens.filter((i: any) => !i.ambienteId)
    const totalSemAmbiente = itensSemAmbiente.reduce(
      (sum: number, i: any) => sum + Number(i.quantidade) * Number(i.precoUnitario),
      0,
    )

    const totalAmbientes = ambientesData.reduce((sum, a) => sum + a.total, 0)
    const totalGeral = totalAmbientes + totalSemAmbiente
    const itensEmAmbientes = ambientesData.reduce((sum, a) => sum + a.itemCount, 0)
    const areaTotal = ambientesData.reduce((sum, a) => sum + a.area, 0)

    return { ambientesData, itensSemAmbiente, totalSemAmbiente, totalAmbientes, totalGeral, itensEmAmbientes, areaTotal }
  }, [ambientes, itens])

  // Group cost by activity (when activityGroups are available)
  const activityCost = useMemo(() => {
    if (!activityGroups?.activityGroups?.length) return null

    const groups: { id: string; label: string; color: string | null; itemCount: number; total: number }[] = []
    const activityIdSet = new Set<string>()

    for (const ag of activityGroups.activityGroups) {
      activityIdSet.add(ag.activity.id)
      const activityItens = itens.filter((i: any) => i.projectActivityId === ag.activity.id)
      const total = activityItens.reduce(
        (sum: number, i: any) => sum + Number(i.quantidade) * Number(i.precoUnitario),
        0,
      )
      const label = ag.activity.parentName
        ? `${ag.activity.parentName} > ${ag.activity.name}`
        : ag.activity.name
      groups.push({ id: ag.activity.id, label, color: ag.activity.color, itemCount: activityItens.length, total })
    }

    // Items not linked to any activity
    const unlinked = itens.filter((i: any) => !i.projectActivityId || !activityIdSet.has(i.projectActivityId))
    const unlinkedTotal = unlinked.reduce(
      (sum: number, i: any) => sum + Number(i.quantidade) * Number(i.precoUnitario),
      0,
    )

    const totalGeral = groups.reduce((sum, g) => sum + g.total, 0) + unlinkedTotal

    return { groups, unlinked, unlinkedTotal, totalGeral }
  }, [activityGroups, itens])

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
            <p className="text-2xl font-bold">{ambientes.length}</p>
            <p className="text-xs text-neutral-500">Ambientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 text-center">
            <p className="text-2xl font-bold">{resumo.itensEmAmbientes}</p>
            <p className="text-xs text-neutral-500">Itens</p>
            {resumo.itensSemAmbiente.length > 0 && (
              <p className="text-[10px] text-amber-500">+{resumo.itensSemAmbiente.length} sem ambiente</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 text-center">
            <p className="text-2xl font-bold">{resumo.areaTotal.toFixed(1)} m2</p>
            <p className="text-xs text-neutral-500">Area Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 text-center">
            <p className="text-2xl font-bold text-green-700">{formatCurrency(resumo.totalAmbientes)}</p>
            <p className="text-xs text-neutral-500">Custo Total</p>
            {resumo.totalSemAmbiente > 0 && (
              <p className="text-[10px] text-amber-500">+{formatCurrency(resumo.totalSemAmbiente)} sem amb.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Multiplicador de unidades */}
      {quantidadeUnidades > 1 && resumo.totalGeral > 0 && (
        <Card className="bg-blue-50/60 border-blue-200">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Multiplicador de Unidades</span>
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

      {/* Per-ambiente breakdown */}
      {resumo.ambientesData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Custo por Ambiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resumo.ambientesData.map((amb) => {
                const pct = resumo.totalAmbientes > 0 ? (amb.total / resumo.totalAmbientes) * 100 : 0
                return (
                  <div key={amb.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{amb.nome}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-400">{amb.itemCount} itens</span>
                          <span className="text-sm font-medium">{formatCurrency(amb.total)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              {resumo.itensSemAmbiente.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-400 truncate">Sem ambiente</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-400">{resumo.itensSemAmbiente.length} itens</span>
                        <span className="text-sm font-medium">{formatCurrency(resumo.totalSemAmbiente)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-1.5">
                      <div
                        className="bg-neutral-300 h-1.5 rounded-full transition-all"
                        style={{ width: `${resumo.totalGeral > 0 ? Math.min((resumo.totalSemAmbiente / resumo.totalGeral) * 100, 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-activity breakdown */}
      {activityCost && activityCost.groups.some((g) => g.itemCount > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Custo por Atividade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activityCost.groups.map((g) => {
                if (g.itemCount === 0) return null
                const pct = activityCost.totalGeral > 0 ? (g.total / activityCost.totalGeral) * 100 : 0
                return (
                  <div key={g.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate" style={g.color ? { color: g.color } : undefined}>{g.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-400">{g.itemCount} itens</span>
                          <span className="text-sm font-medium">{formatCurrency(g.total)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: g.color || 'hsl(var(--primary))' }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              {activityCost.unlinked.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-400 truncate">Sem atividade</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-400">{activityCost.unlinked.length} itens</span>
                        <span className="text-sm font-medium">{formatCurrency(activityCost.unlinkedTotal)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-1.5">
                      <div
                        className="bg-neutral-300 h-1.5 rounded-full transition-all"
                        style={{ width: `${activityCost.totalGeral > 0 ? Math.min((activityCost.unlinkedTotal / activityCost.totalGeral) * 100, 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {resumo.ambientesData.length === 0 && itens.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-10 w-10 text-neutral-200" />
            <h3 className="mt-3 text-sm font-medium text-neutral-600">Levantamento vazio</h3>
            <p className="mt-1 text-xs text-neutral-400 max-w-sm text-center">
              Adicione ambientes na barra lateral e depois insira materiais em cada ambiente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
