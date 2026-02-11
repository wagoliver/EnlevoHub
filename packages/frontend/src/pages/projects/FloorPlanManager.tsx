import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FormTooltip } from '@/components/ui/FormTooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { FloorPlanFormDialog } from './FloorPlanFormDialog'
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  LayoutGrid,
  BedDouble,
  Bath,
  Ruler,
  DollarSign,
} from 'lucide-react'

const typeLabels: Record<string, string> = {
  APARTMENT: 'Apartamento',
  HOUSE: 'Casa',
  COMMERCIAL: 'Comercial',
  LAND: 'Terreno',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface FloorPlanManagerProps {
  projectId: string
}

export function FloorPlanManager({ projectId }: FloorPlanManagerProps) {
  const queryClient = useQueryClient()
  const canCreate = usePermission('units:create')
  const canEdit = usePermission('units:edit')
  const canDelete = usePermission('units:delete')

  const [showFormDialog, setShowFormDialog] = useState(false)
  const [editingPlan, setEditingPlan] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<any>(null)

  const { data: floorPlans = [], isLoading } = useQuery({
    queryKey: ['project-floor-plans', projectId],
    queryFn: () => projectsAPI.listFloorPlans(projectId),
  })

  const deleteMutation = useMutation({
    mutationFn: (fpId: string) => projectsAPI.deleteFloorPlan(projectId, fpId),
    onSuccess: () => {
      toast.success('Planta excluída com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['project-floor-plans', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-units', projectId] })
      setDeleteDialogOpen(false)
      setPlanToDelete(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir planta')
    },
  })

  const handleEdit = (plan: any) => {
    setEditingPlan(plan)
    setShowFormDialog(true)
  }

  const handleFormClose = (open: boolean) => {
    setShowFormDialog(open)
    if (!open) setEditingPlan(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <h4 className="text-sm font-medium text-neutral-700">Plantas ({floorPlans.length})</h4>
          <FormTooltip text="Planta define o modelo da unidade (tipo, área, quartos). Cadastre uma vez e reutilize." />
        </div>
        {canCreate && (
          <Button variant="outline" size="sm" onClick={() => { setEditingPlan(null); setShowFormDialog(true) }}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Nova Planta
          </Button>
        )}
      </div>

      {floorPlans.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-neutral-50/50 p-6 text-center">
          <LayoutGrid className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 text-sm text-neutral-500">
            Nenhuma planta cadastrada. Defina plantas para facilitar a criação de unidades em lote.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {floorPlans.map((plan: any) => (
            <Card key={plan.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-medium text-neutral-900">{plan.name}</h5>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {typeLabels[plan.type] || plan.type}
                  </Badge>
                </div>
                {(canEdit || canDelete) && (
                  <div className="flex gap-1">
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(plan)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-neutral-400 hover:text-destructive"
                        onClick={() => { setPlanToDelete(plan); setDeleteDialogOpen(true) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-600">
                <div className="flex items-center gap-1">
                  <Ruler className="h-3.5 w-3.5" />
                  <span>{plan.area} m²</span>
                </div>
                {plan.bedrooms != null && (
                  <div className="flex items-center gap-1">
                    <BedDouble className="h-3.5 w-3.5" />
                    <span>{plan.bedrooms} quartos</span>
                  </div>
                )}
                {plan.bathrooms != null && (
                  <div className="flex items-center gap-1">
                    <Bath className="h-3.5 w-3.5" />
                    <span>{plan.bathrooms} banheiros</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>{formatCurrency(plan.defaultPrice)}</span>
                </div>
              </div>
              {plan._count?.units > 0 && (
                <p className="mt-2 text-xs text-neutral-400">
                  {plan._count.units} unidade{plan._count.units > 1 ? 's' : ''}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <FloorPlanFormDialog
        projectId={projectId}
        open={showFormDialog}
        onOpenChange={handleFormClose}
        floorPlan={editingPlan}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Planta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            Tem certeza que deseja excluir a planta <strong>{planToDelete?.name}</strong>?
            As unidades associadas permanecerão, mas perderão a referência à planta.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setPlanToDelete(null) }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => planToDelete && deleteMutation.mutate(planToDelete.id)}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
