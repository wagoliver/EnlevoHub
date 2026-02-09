import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { AddActivityDialog } from './AddActivityDialog'
import { MeasurementFormDialog } from './MeasurementFormDialog'
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  ClipboardList,
  Ruler,
} from 'lucide-react'

const statusVariant: Record<string, any> = {
  PENDING: 'secondary',
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'completed',
}

const statusLabel: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
}

const scopeLabel: Record<string, string> = {
  ALL_UNITS: 'Todas as Unidades',
  SPECIFIC_UNITS: 'Unidades Específicas',
  GENERAL: 'Geral',
}

interface ActivitiesTabProps {
  projectId: string
}

export function ActivitiesTab({ projectId }: ActivitiesTabProps) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [activityToDelete, setActivityToDelete] = useState<any>(null)
  const [measurementDialog, setMeasurementDialog] = useState<{
    open: boolean
    activityId?: string
    unitActivityId?: string
  }>({ open: false })

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['project-activities', projectId],
    queryFn: () => projectsAPI.listActivities(projectId),
  })

  const deleteMutation = useMutation({
    mutationFn: (activityId: string) =>
      projectsAPI.deleteActivity(projectId, activityId),
    onSuccess: () => {
      toast.success('Atividade excluída com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] })
      setDeleteDialogOpen(false)
      setActivityToDelete(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir atividade')
    },
  })

  const toggleRow = (activityId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(activityId)) {
        next.delete(activityId)
      } else {
        next.add(activityId)
      }
      return next
    })
  }

  const handleDeleteClick = (e: React.MouseEvent, activity: any) => {
    e.stopPropagation()
    setActivityToDelete(activity)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (activityToDelete) {
      deleteMutation.mutate(activityToDelete.id)
    }
  }

  const openMeasurementDialog = (
    e: React.MouseEvent,
    activityId: string,
    unitActivityId?: string
  ) => {
    e.stopPropagation()
    setMeasurementDialog({
      open: true,
      activityId,
      unitActivityId,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-neutral-900">
          Atividades ({activities.length})
        </h3>
        {canEdit && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Atividade
          </Button>
        )}
      </div>

      {/* Activities List */}
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-12">
          <ClipboardList className="h-12 w-12 text-neutral-300" />
          <h3 className="mt-4 text-lg font-medium text-neutral-900">
            Nenhuma atividade cadastrada
          </h3>
          <p className="mt-2 text-sm text-neutral-500">
            Adicione atividades manualmente ou importe de um template.
          </p>
          {canEdit && (
            <Button className="mt-6" onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeira Atividade
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>Atividade</TableHead>
                  <TableHead className="w-[80px] text-center">Peso</TableHead>
                  <TableHead className="w-[200px]">Progresso</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px] text-center">Unidades</TableHead>
                  {canEdit && (
                    <TableHead className="w-[80px]">Ações</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity: any) => {
                  const isExpanded = expandedRows.has(activity.id)
                  const unitActivities = activity.unitActivities || []
                  const avgProgress = activity.averageProgress ?? 0

                  return (
                    <>
                      {/* Activity Row */}
                      <TableRow
                        key={activity.id}
                        className="cursor-pointer hover:bg-neutral-50"
                        onClick={() => toggleRow(activity.id)}
                      >
                        <TableCell className="px-2">
                          {unitActivities.length > 0 ? (
                            isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-neutral-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-neutral-500" />
                            )
                          ) : (
                            <span className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{activity.name}</span>
                            <span className="ml-2 text-xs text-neutral-400">
                              {scopeLabel[activity.scope] || activity.scope}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{activity.weight}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={avgProgress} className="flex-1 h-2" />
                            <span className="text-sm font-medium w-10 text-right">
                              {Math.round(avgProgress)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[activity.status]}>
                            {statusLabel[activity.status] || activity.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {activity._count?.unitActivities ?? unitActivities.length}
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-neutral-400 hover:text-destructive"
                              onClick={(e) => handleDeleteClick(e, activity)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>

                      {/* Expanded UnitActivities */}
                      {isExpanded &&
                        unitActivities.map((ua: any) => (
                          <TableRow
                            key={ua.id}
                            className="bg-neutral-50/50"
                          >
                            <TableCell />
                            <TableCell className="pl-8">
                              <span className="text-sm text-neutral-600">
                                {ua.unit?.code || 'Geral'}
                                {ua.unit?.type && (
                                  <span className="ml-1 text-xs text-neutral-400">
                                    ({ua.unit.type})
                                  </span>
                                )}
                              </span>
                            </TableCell>
                            <TableCell />
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={ua.progress ?? 0}
                                  className="flex-1 h-2"
                                />
                                <span className="text-sm font-medium w-10 text-right">
                                  {Math.round(ua.progress ?? 0)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant[ua.status]}>
                                {statusLabel[ua.status] || ua.status}
                              </Badge>
                            </TableCell>
                            <TableCell />
                            {canEdit && (
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={(e) =>
                                    openMeasurementDialog(e, activity.id, ua.id)
                                  }
                                >
                                  <Ruler className="mr-1 h-3 w-3" />
                                  Medir
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}

                      {/* If activity has no unit activities, show a single measurement button */}
                      {isExpanded && unitActivities.length === 0 && (
                        <TableRow className="bg-neutral-50/50">
                          <TableCell />
                          <TableCell colSpan={canEdit ? 5 : 4} className="pl-8">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-neutral-500">
                                Atividade geral (sem unidades vinculadas)
                              </span>
                              {canEdit && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={(e) =>
                                    openMeasurementDialog(e, activity.id)
                                  }
                                >
                                  <Ruler className="mr-1 h-3 w-3" />
                                  Registrar Medição
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          {canEdit && <TableCell />}
                        </TableRow>
                      )}
                    </>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Activity Dialog */}
      <AddActivityDialog
        projectId={projectId}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        existingCount={activities.length}
      />

      {/* Measurement Form Dialog */}
      <MeasurementFormDialog
        projectId={projectId}
        open={measurementDialog.open}
        onOpenChange={(open) =>
          setMeasurementDialog((prev) => ({ ...prev, open }))
        }
        defaultActivityId={measurementDialog.activityId}
        defaultUnitActivityId={measurementDialog.unitActivityId}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Atividade</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            Tem certeza que deseja excluir a atividade{' '}
            <strong>{activityToDelete?.name}</strong>? Todas as medições
            associadas também serão removidas. Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setActivityToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={confirmDelete}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
