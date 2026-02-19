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
import { UnifiedActivityWizard } from './UnifiedActivityWizard'
import { HierarchicalItemEditor, type TemplatePhase, type TemplateActivity } from '@/pages/settings/HierarchicalItemEditor'
import { MeasurementFormDialog } from './MeasurementFormDialog'
import { GanttChart } from './GanttChart'
import { activityToGanttTask } from '@/lib/gantt-types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  Loader2,
  ClipboardList,
  Ruler,
  BarChart3,
  List,
  Settings2,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { DialogDescription } from '@/components/ui/dialog'

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
  onEdit,
  onDelete,
  onMeasure,
}: {
  activity: any
  depth: number
  expandedRows: Set<string>
  toggleRow: (id: string) => void
  canEdit: boolean
  canMeasure: boolean
  onEdit: (e: React.MouseEvent, activity: any) => void
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
            {canEdit && (
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-neutral-400 hover:text-primary"
                  onClick={(e) => onEdit(e, activity)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-neutral-400 hover:text-destructive"
                  onClick={(e) => onDelete(e, activity)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
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
          onEdit={onEdit}
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

function countDescendants(activity: any): { phases: number; stages: number; activities: number } {
  let phases = 0, stages = 0, activities = 0
  function walk(items: any[]) {
    for (const item of items) {
      if (item.level === 'PHASE') phases++
      else if (item.level === 'STAGE') stages++
      else activities++
      if (item.children?.length) walk(item.children)
    }
  }
  if (activity.children?.length) walk(activity.children)
  return { phases, stages, activities }
}

function getDeleteMessage(activity: any): string {
  const levelLabel = activity.level === 'PHASE' ? 'a fase' : activity.level === 'STAGE' ? 'a etapa' : 'a atividade'
  const desc = countDescendants(activity)
  const parts: string[] = []
  if (desc.phases > 0) parts.push(`${desc.phases} fase(s)`)
  if (desc.stages > 0) parts.push(`${desc.stages} etapa(s)`)
  if (desc.activities > 0) parts.push(`${desc.activities} atividade(s)`)

  if (parts.length > 0) {
    return `Excluir ${levelLabel} "${activity.name}" e seus ${parts.join(' e ')}? Todas as medições associadas também serão removidas. Esta ação não pode ser desfeita.`
  }
  return `Tem certeza que deseja excluir ${levelLabel} "${activity.name}"? Todas as medições associadas também serão removidas. Esta ação não pode ser desfeita.`
}

/** Convert hierarchical ProjectActivity[] (tree from API) to TemplatePhase[] for the editor */
function activitiesToTemplatePhases(activities: any[]): TemplatePhase[] {
  return activities
    .filter((a: any) => a.level === 'PHASE')
    .map((phase: any, pIdx: number) => ({
      name: phase.name,
      order: pIdx,
      percentageOfTotal: Number(phase.weight) || 0,
      color: phase.color || null,
      stages: (phase.children || [])
        .filter((s: any) => s.level === 'STAGE')
        .map((stage: any, sIdx: number) => ({
          name: stage.name,
          order: sIdx,
          activities: (stage.children || [])
            .filter((a: any) => a.level === 'ACTIVITY')
            .map((act: any, aIdx: number): TemplateActivity => ({
              name: act.name,
              order: aIdx,
              weight: Number(act.weight) || 1,
              durationDays: act.durationDays ?? null,
              dependencies: act.dependencies || undefined,
              sinapiCodigo: act.sinapiCodigo || null,
            })),
        })),
    }))
}

export function ActivitiesTab({ projectId }: ActivitiesTabProps) {
  const queryClient = useQueryClient()
  const canEdit = usePermission('activities:edit')
  const canMeasure = usePermission('measurements:create')

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showWizard, setShowWizard] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [activityToDelete, setActivityToDelete] = useState<any>(null)
  const [measurementDialog, setMeasurementDialog] = useState<{
    open: boolean
    activityId?: string
    unitActivityId?: string
  }>({ open: false })
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [activityToEdit, setActivityToEdit] = useState<any>(null)
  const [editForm, setEditForm] = useState({ name: '', weight: 0, status: 'PENDING' })
  const [hierarchyEditorOpen, setHierarchyEditorOpen] = useState(false)
  const [hierarchyPhases, setHierarchyPhases] = useState<TemplatePhase[]>([])
  const [hierarchyFullscreen, setHierarchyFullscreen] = useState(false)

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

  const updateMutation = useMutation({
    mutationFn: ({ activityId, data }: { activityId: string; data: any }) =>
      projectsAPI.updateActivity(projectId, activityId, data),
    onSuccess: () => {
      toast.success('Atividade atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] })
      setEditDialogOpen(false)
      setActivityToEdit(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar atividade')
    },
  })

  const syncHierarchyMutation = useMutation({
    mutationFn: (data: { phases: any[] }) =>
      projectsAPI.syncActivitiesHierarchy(projectId, data),
    onSuccess: () => {
      toast.success('Estrutura de atividades atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] })
      setHierarchyEditorOpen(false)
      setHierarchyFullscreen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar estrutura')
    },
  })

  const openHierarchyEditor = () => {
    const phases = activitiesToTemplatePhases(activities)
    setHierarchyPhases(phases)
    setHierarchyEditorOpen(true)
  }

  const confirmSyncHierarchy = () => {
    const payload = {
      phases: hierarchyPhases.map((p) => ({
        name: p.name,
        percentageOfTotal: p.percentageOfTotal,
        color: p.color || null,
        stages: p.stages.map((s) => ({
          name: s.name,
          activities: s.activities.map((a) => ({
            name: a.name,
            weight: a.weight,
            durationDays: a.durationDays,
            dependencies: a.dependencies && a.dependencies.length > 0 ? a.dependencies : null,
            sinapiCodigo: a.sinapiCodigo || null,
          })),
        })),
      })),
    }
    syncHierarchyMutation.mutate(payload)
  }

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

  const handleEditClick = (e: React.MouseEvent, activity: any) => {
    e.stopPropagation()
    setActivityToEdit(activity)
    setEditForm({
      name: activity.name || '',
      weight: activity.weight ?? 0,
      status: activity.status || 'PENDING',
    })
    setEditDialogOpen(true)
  }

  const confirmEdit = () => {
    if (!activityToEdit) return
    updateMutation.mutate({
      activityId: activityToEdit.id,
      data: {
        name: editForm.name,
        weight: Number(editForm.weight),
        status: editForm.status,
      },
    })
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
          {canEdit && activities.length > 0 && (
            <Button variant="outline" onClick={openHierarchyEditor}>
              <Settings2 className="mr-2 h-4 w-4" />
              Editar Estrutura
            </Button>
          )}
          {canEdit && (
            <Button onClick={() => setShowWizard(true)}>
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
            <Button className="mt-6" onClick={() => setShowWizard(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeiras Atividades
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
                    <TableHead className="w-[100px]">Ações</TableHead>
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
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onMeasure={openMeasurementDialog}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Unified Activity Wizard */}
      <UnifiedActivityWizard
        projectId={projectId}
        open={showWizard}
        onOpenChange={setShowWizard}
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
            <DialogTitle>
              Excluir {activityToDelete?.level === 'PHASE' ? 'Fase' : activityToDelete?.level === 'STAGE' ? 'Etapa' : 'Atividade'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            {activityToDelete && getDeleteMessage(activityToDelete)}
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

      {/* Edit Activity Dialog (single item) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Editar {activityToEdit?.level === 'PHASE' ? 'Fase' : activityToEdit?.level === 'STAGE' ? 'Etapa' : 'Atividade'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-weight">Peso</Label>
              <Input
                id="edit-weight"
                type="number"
                min={0}
                max={100}
                value={editForm.weight}
                onChange={(e) => setEditForm((f) => ({ ...f, weight: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm((f) => ({ ...f, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                  <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                  <SelectItem value="COMPLETED">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false)
                setActivityToEdit(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={updateMutation.isPending || !editForm.name.trim()}
              onClick={confirmEdit}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hierarchy Editor Dialog */}
      <Dialog open={hierarchyEditorOpen} onOpenChange={(open) => { if (!open) { setHierarchyEditorOpen(false); setHierarchyFullscreen(false) } }}>
        <DialogContent className={`${hierarchyFullscreen ? 'max-w-[100vw] w-[100vw] !left-0 !top-0 !translate-x-0 !translate-y-0 !rounded-none h-[100vh] max-h-[100vh]' : 'max-w-5xl max-h-[90vh]'} overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle>Editar Estrutura de Atividades</DialogTitle>
            <DialogDescription>
              Edite fases, etapas e atividades do projeto. Ao salvar, a estrutura será substituída.
            </DialogDescription>
          </DialogHeader>

          <button
            type="button"
            onClick={() => setHierarchyFullscreen(f => !f)}
            title={hierarchyFullscreen ? 'Restaurar tamanho' : 'Tela inteira'}
            className="absolute right-12 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {hierarchyFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          <HierarchicalItemEditor
            phases={hierarchyPhases}
            onChange={setHierarchyPhases}
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setHierarchyEditorOpen(false); setHierarchyFullscreen(false) }}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                syncHierarchyMutation.isPending ||
                hierarchyPhases.length === 0 ||
                !hierarchyPhases.every(p => p.name.trim() && p.stages.every(s => s.name.trim() && s.activities.every(a => a.name.trim()))) ||
                Math.abs(hierarchyPhases.reduce((sum, p) => sum + p.percentageOfTotal, 0) - 100) >= 0.1
              }
              onClick={confirmSyncHierarchy}
            >
              {syncHierarchyMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar Estrutura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
