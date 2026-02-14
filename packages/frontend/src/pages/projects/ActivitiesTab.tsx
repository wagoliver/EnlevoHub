import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
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
import { GanttChart } from './GanttChart'
import { activityToGanttTask } from '@/lib/gantt-types'
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  ClipboardList,
  Ruler,
  BarChart3,
  List,
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

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// Recursive component for hierarchical activity rows
function ActivityRow({
  activity,
  depth,
  expandedRows,
  toggleRow,
  canEdit,
  canMeasure,
  onDelete,
  onMeasure,
}: {
  activity: any
  depth: number
  expandedRows: Set<string>
  toggleRow: (id: string) => void
  canEdit: boolean
  canMeasure: boolean
  onDelete: (e: React.MouseEvent, activity: any) => void
  onMeasure: (e: React.MouseEvent, activityId: string, unitActivityId?: string) => void
}) {
  const isExpanded = expandedRows.has(activity.id)
  const hasChildren = activity.children && activity.children.length > 0
  const unitActivities = activity.unitActivities || []
  const avgProgress = activity.averageProgress ?? 0
  const isLeaf = activity.level === 'ACTIVITY' || (!activity.level && !hasChildren)
  const showExpandForUnits = isLeaf && unitActivities.length > 0

  const levelStyles: Record<string, string> = {
    PHASE: 'bg-neutral-50 font-semibold',
    STAGE: 'bg-neutral-25 font-medium',
    ACTIVITY: '',
  }

  return (
    <>
      <TableRow
        className={`cursor-pointer hover:bg-neutral-50 ${levelStyles[activity.level] || ''}`}
        onClick={() => toggleRow(activity.id)}
      >
        <TableCell className="px-2" style={{ paddingLeft: `${depth * 20 + 8}px` }}>
          <div className="flex items-center gap-1">
            {(hasChildren || showExpandForUnits) ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-neutral-500 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-neutral-500 shrink-0" />
              )
            ) : (
              <span className="w-4" />
            )}
            {activity.color && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activity.color }}
              />
            )}
          </div>
        </TableCell>
        <TableCell>
          <div>
            <span className={activity.level === 'PHASE' ? 'font-semibold' : activity.level === 'STAGE' ? 'font-medium' : ''}>
              {activity.name}
            </span>
            {activity.level && activity.level !== 'ACTIVITY' && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                {activity.level === 'PHASE' ? 'Fase' : 'Etapa'}
              </Badge>
            )}
            {isLeaf && activity.scope && (
              <span className="ml-2 text-xs text-neutral-400">
                {scopeLabel[activity.scope] || activity.scope}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="secondary">{activity.weight}</Badge>
        </TableCell>
        <TableCell>
          {activity.plannedStartDate && (
            <span className="text-xs text-neutral-500">
              {formatDate(activity.plannedStartDate)} - {formatDate(activity.plannedEndDate)}
            </span>
          )}
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
        {(canEdit || canMeasure) && (
          <TableCell>
            {canEdit && isLeaf && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-neutral-400 hover:text-destructive"
                onClick={(e) => onDelete(e, activity)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </TableCell>
        )}
      </TableRow>

      {/* Expanded children (hierarchy) */}
      {isExpanded && hasChildren && activity.children.map((child: any) => (
        <ActivityRow
          key={child.id}
          activity={child}
          depth={depth + 1}
          expandedRows={expandedRows}
          toggleRow={toggleRow}
          canEdit={canEdit}
          canMeasure={canMeasure}
          onDelete={onDelete}
          onMeasure={onMeasure}
        />
      ))}

      {/* Expanded UnitActivities (leaf activities) */}
      {isExpanded && isLeaf && unitActivities.map((ua: any) => (
        <TableRow key={ua.id} className="bg-neutral-50/50">
          <TableCell />
          <TableCell style={{ paddingLeft: `${(depth + 1) * 20 + 8}px` }}>
            <span className="text-sm text-neutral-600">
              {ua.unit?.code || 'Geral'}
              {ua.unit?.type && (
                <span className="ml-1 text-xs text-neutral-400">({ua.unit.type})</span>
              )}
            </span>
          </TableCell>
          <TableCell />
          <TableCell />
          <TableCell>
            <div className="flex items-center gap-2">
              <Progress value={ua.progress ?? 0} className="flex-1 h-2" />
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
          {(canEdit || canMeasure) && (
            <TableCell>
              {ua.lastMeasurementStatus === 'PENDING' ? (
                <Badge variant="reserved" className="text-xs">
                  Pendente
                </Badge>
              ) : ua.lastMeasurementStatus === 'APPROVED' ? (
                <Badge variant="completed" className="text-xs">
                  Aprovada
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => onMeasure(e, activity.id, ua.id)}
                >
                  <Ruler className="mr-1 h-3 w-3" />
                  Medir
                </Button>
              )}
            </TableCell>
          )}
        </TableRow>
      ))}
    </>
  )
}

export function ActivitiesTab({ projectId }: ActivitiesTabProps) {
  const queryClient = useQueryClient()
  const canEdit = usePermission('activities:edit')
  const canMeasure = usePermission('measurements:create')

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [activityToDelete, setActivityToDelete] = useState<any>(null)
  const [measurementDialog, setMeasurementDialog] = useState<{
    open: boolean
    activityId?: string
    unitActivityId?: string
  }>({ open: false })
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list')

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
      if (next.has(activityId)) next.delete(activityId)
      else next.add(activityId)
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
    setMeasurementDialog({ open: true, activityId, unitActivityId })
  }

  // Check if activities have dates for Gantt
  const hasScheduleData = useMemo(() => {
    const checkDates = (items: any[]): boolean => {
      for (const item of items) {
        if (item.plannedStartDate) return true
        if (item.children?.length && checkDates(item.children)) return true
      }
      return false
    }
    return checkDates(activities)
  }, [activities])

  // Convert activities to Gantt tasks
  const ganttTasks = useMemo(() => {
    if (!hasScheduleData) return []
    return activities.map((a: any) => activityToGanttTask(a))
  }, [activities, hasScheduleData])

  // Count total items (flat or recursive)
  const totalCount = useMemo(() => {
    const count = (items: any[]): number => {
      let c = items.length
      for (const item of items) {
        if (item.children?.length) c += count(item.children)
      }
      return c
    }
    return count(activities)
  }, [activities])

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
          Atividades ({totalCount})
        </h3>
        <div className="flex items-center gap-2">
          {hasScheduleData && (
            <div className="flex items-center rounded-lg border p-0.5">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setViewMode('list')}
              >
                <List className="mr-1 h-3.5 w-3.5" />
                Lista
              </Button>
              <Button
                variant={viewMode === 'gantt' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setViewMode('gantt')}
              >
                <BarChart3 className="mr-1 h-3.5 w-3.5" />
                Gantt
              </Button>
            </div>
          )}
          {canEdit && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Atividade
            </Button>
          )}
        </div>
      </div>

      {/* Activities Display */}
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-16">
          <ClipboardList className="h-16 w-16 text-neutral-300" />
          <h3 className="mt-4 text-xl font-medium text-neutral-900">
            Nenhuma atividade cadastrada
          </h3>
          <p className="mt-2 text-sm text-neutral-500 text-center max-w-md">
            As atividades representam as etapas da obra. Adicione manualmente ou
            importe de um planejamento para acompanhar o progresso de cada fase.
          </p>
          {canEdit && (
            <Button className="mt-6" onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeira Atividade
            </Button>
          )}
        </div>
      ) : viewMode === 'gantt' ? (
        <Card>
          <CardContent className="p-4">
            <GanttChart tasks={ganttTasks} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]" />
                  <TableHead>Atividade</TableHead>
                  <TableHead className="w-[80px] text-center">Peso</TableHead>
                  <TableHead className="w-[140px]">Período</TableHead>
                  <TableHead className="w-[180px]">Progresso</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  {(canEdit || canMeasure) && (
                    <TableHead className="w-[80px]">Ações</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity: any) => (
                  <ActivityRow
                    key={activity.id}
                    activity={activity}
                    depth={0}
                    expandedRows={expandedRows}
                    toggleRow={toggleRow}
                    canEdit={canEdit}
                    canMeasure={canMeasure}
                    onDelete={handleDeleteClick}
                    onMeasure={openMeasurementDialog}
                  />
                ))}
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
        existingCount={totalCount}
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
