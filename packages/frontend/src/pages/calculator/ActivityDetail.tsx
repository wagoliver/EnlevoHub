import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { ManualCalculator } from './ManualCalculator'
import { SinapiCalculator } from './SinapiCalculator'
import { getUnitForAreaTipo, getQuantityLabel } from './servicosCatalogo'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface ActivityDetailProps {
  activity: any
  projectId: string
  levantamentoId: string
  itens: any[]
  activityGroups?: any
}

export function ActivityDetail({ activity, projectId, levantamentoId, itens }: ActivityDetailProps) {
  const [baseQuantity, setBaseQuantity] = useState<string>('')
  const [itemsExpanded, setItemsExpanded] = useState(false)

  const unit = getUnitForAreaTipo(activity.areaTipo)
  const quantityLabel = getQuantityLabel(activity.areaTipo)

  const activityItens = useMemo(
    () => itens.filter((i: any) => i.projectActivityId === activity.id),
    [itens, activity.id],
  )

  const totalGeral = useMemo(
    () => activityItens.reduce((sum: number, item: any) => sum + Number(item.quantidade) * Number(item.precoUnitario), 0),
    [activityItens],
  )

  const parsedBaseQuantity = parseFloat(baseQuantity) || 0

  return (
    <div className="space-y-4">
      {/* Activity header */}
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-lg font-semibold">{activity.name}</h3>
        {activity.parentName && (
          <span className="text-sm text-neutral-400">{activity.parentName}</span>
        )}
        {activity.areaTipo && (
          <Badge variant="secondary" className="text-xs">{activity.areaTipo}</Badge>
        )}
        {activity.sinapiCodigo && (
          <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
            SINAPI {activity.sinapiCodigo}
          </Badge>
        )}
      </div>

      {/* Quantity input */}
      <Card className="bg-neutral-50/60">
        <CardContent className="py-4 px-5">
          <div className="flex items-end gap-3">
            <div className="space-y-1.5 flex-1 max-w-xs">
              <label className="text-sm font-medium text-neutral-700">
                {quantityLabel}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="h-9 text-sm"
                  placeholder="0"
                  value={baseQuantity}
                  onChange={(e) => setBaseQuantity(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <span className="text-sm font-medium text-neutral-500 flex-shrink-0">{unit}</span>
              </div>
            </div>
            {parsedBaseQuantity > 0 && (
              <p className="text-xs text-neutral-400 pb-2">
                Usado como multiplicador ao importar composições SINAPI
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing items */}
      {activityItens.length > 0 && (
        <Card>
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50/80 transition-colors"
            onClick={() => setItemsExpanded(!itemsExpanded)}
          >
            <div className="flex items-center gap-2">
              {itemsExpanded ? (
                <ChevronDown className="h-4 w-4 text-neutral-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-neutral-500" />
              )}
              <span className="text-sm font-medium">
                {activityItens.length} ite{activityItens.length === 1 ? 'm' : 'ns'} existentes
              </span>
            </div>
            <span className="text-sm font-bold text-green-700">
              {formatCurrency(totalGeral)}
            </span>
          </div>
        </Card>
      )}

      {/* Calculator tabs */}
      <Tabs defaultValue="manual">
        <TabsList>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="sinapi">SINAPI</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-4">
          <ManualCalculator
            projectId={projectId}
            levantamentoId={levantamentoId}
            itens={activityItens}
            fixedActivityId={activity.id}
            fixedActivityName={activity.name}
          />
        </TabsContent>

        <TabsContent value="sinapi" className="mt-4">
          <SinapiCalculator
            projectId={projectId}
            levantamentoId={levantamentoId}
            fixedActivityId={activity.id}
            fixedActivityName={activity.name}
            baseQuantity={parsedBaseQuantity}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
