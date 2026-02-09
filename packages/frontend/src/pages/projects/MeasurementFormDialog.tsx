import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI, contractorsAPI } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react'

interface MeasurementFormDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultActivityId?: string
  defaultUnitActivityId?: string
}

interface ActivityNode {
  id: string
  name: string
  level?: string
  weight: number
  order: number
  scope?: string
  parentId?: string | null
  unitActivities: UnitActivityNode[]
  children?: ActivityNode[]
  [key: string]: any
}

interface UnitActivityNode {
  id: string
  activityId: string
  progress: number
  unit?: { id: string; code: string; type?: string } | null
  [key: string]: any
}

interface EditableItem {
  activityId: string
  activityName: string
  unitActivityId: string
  unitCode: string | null
  weight: number
  currentProgress: number
  newProgress: number
}

/** Walk a hierarchical tree to find the phase & stage that contain a given activityId */
function findAncestors(
  tree: ActivityNode[],
  targetId: string
): { phaseId: string; stageId: string } | null {
  for (const phase of tree) {
    if (phase.level === 'PHASE' && phase.children) {
      for (const stage of phase.children) {
        if (stage.level === 'STAGE' && stage.children) {
          for (const act of stage.children) {
            if (act.id === targetId) {
              return { phaseId: phase.id, stageId: stage.id }
            }
          }
        }
        // activity directly under phase (no stage)
        if (stage.id === targetId) {
          return { phaseId: phase.id, stageId: '' }
        }
      }
    }
    // activity directly at root
    if (phase.id === targetId) {
      return { phaseId: '', stageId: '' }
    }
  }
  return null
}

export function MeasurementFormDialog({
  projectId,
  open,
  onOpenChange,
  defaultActivityId,
  defaultUnitActivityId: _defaultUnitActivityId,
}: MeasurementFormDialogProps) {
  const queryClient = useQueryClient()

  const [selectedPhaseId, setSelectedPhaseId] = useState('')
  const [selectedStageId, setSelectedStageId] = useState('')
  const [contractorId, setContractorId] = useState('')
  const [notes, setNotes] = useState('')
  const [editableItems, setEditableItems] = useState<EditableItem[]>([])
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set())
  const [initialized, setInitialized] = useState(false)

  // Fetch activities (returns tree if hierarchical)
  const { data: activitiesRaw = [] } = useQuery({
    queryKey: ['project-activities', projectId],
    queryFn: () => projectsAPI.listActivities(projectId),
    enabled: open,
  })

  // Fetch contractors
  const { data: contractors = [] } = useQuery({
    queryKey: ['project-contractors', projectId],
    queryFn: () => contractorsAPI.listByProject(projectId),
    enabled: open,
  })

  const activities = activitiesRaw as ActivityNode[]

  // Determine if hierarchical
  const hasHierarchy = useMemo(() => {
    return activities.some(
      (a) => a.level === 'PHASE' || a.level === 'STAGE'
    )
  }, [activities])

  // Extract phases
  const phases = useMemo(() => {
    if (!hasHierarchy) return []
    return activities.filter((a) => a.level === 'PHASE')
  }, [activities, hasHierarchy])

  // Extract stages for selected phase
  const stages = useMemo(() => {
    if (!selectedPhaseId) return []
    const phase = phases.find((p) => p.id === selectedPhaseId)
    return (phase?.children || []).filter((c) => c.level === 'STAGE')
  }, [phases, selectedPhaseId])

  // Get leaf activities to show
  const leafActivities = useMemo((): ActivityNode[] => {
    if (!hasHierarchy) {
      // Flat: return all activities that have unitActivities (leaf-level)
      return activities.filter((a) => a.unitActivities && a.unitActivities.length > 0)
    }
    if (!selectedStageId) return []
    const stage = stages.find((s) => s.id === selectedStageId)
    if (!stage || !stage.children) return []
    return stage.children.filter((c) => c.level === 'ACTIVITY')
  }, [hasHierarchy, activities, stages, selectedStageId])

  // Build editable items from leaf activities
  useEffect(() => {
    const items: EditableItem[] = []
    for (const act of leafActivities) {
      if (act.unitActivities.length <= 1) {
        // Single unitActivity (GENERAL) or exactly one
        const ua = act.unitActivities[0]
        if (ua) {
          items.push({
            activityId: act.id,
            activityName: act.name,
            unitActivityId: ua.id,
            unitCode: ua.unit?.code || null,
            weight: act.weight,
            currentProgress: ua.progress,
            newProgress: ua.progress,
          })
        }
      } else {
        // Multiple unitActivities — one row per unit
        for (const ua of act.unitActivities) {
          items.push({
            activityId: act.id,
            activityName: act.name,
            unitActivityId: ua.id,
            unitCode: ua.unit?.code || null,
            weight: act.weight,
            currentProgress: ua.progress,
            newProgress: ua.progress,
          })
        }
      }
    }
    setEditableItems(items)
    setExpandedActivities(new Set())
  }, [leafActivities])

  // Initialize from defaultActivityId when dialog opens
  useEffect(() => {
    if (!open) {
      setInitialized(false)
      return
    }
    if (initialized || activities.length === 0) return

    setContractorId('')
    setNotes('')

    if (defaultActivityId && hasHierarchy) {
      const ancestors = findAncestors(activities, defaultActivityId)
      if (ancestors) {
        setSelectedPhaseId(ancestors.phaseId)
        setSelectedStageId(ancestors.stageId)
      }
    } else if (!hasHierarchy) {
      setSelectedPhaseId('')
      setSelectedStageId('')
    }
    setInitialized(true)
  }, [open, activities, defaultActivityId, hasHierarchy, initialized])

  // Calculate stage progress (weighted average)
  const stageProgress = useMemo(() => {
    if (editableItems.length === 0) return 0
    const totalWeight = editableItems.reduce((sum, i) => sum + i.weight, 0)
    if (totalWeight === 0) return 0
    const weightedSum = editableItems.reduce(
      (sum, i) => sum + i.weight * i.newProgress,
      0
    )
    return Math.round((weightedSum / totalWeight) * 100) / 100
  }, [editableItems])

  // Count changed items
  const changedItems = useMemo(
    () => editableItems.filter((i) => i.newProgress !== i.currentProgress),
    [editableItems]
  )

  // Group items by activity for multi-unit display
  const groupedByActivity = useMemo(() => {
    const groups: Map<string, EditableItem[]> = new Map()
    for (const item of editableItems) {
      const key = item.activityId
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(item)
    }
    return groups
  }, [editableItems])

  const updateProgress = (unitActivityId: string, value: number) => {
    setEditableItems((prev) =>
      prev.map((item) =>
        item.unitActivityId === unitActivityId
          ? { ...item, newProgress: Math.min(100, Math.max(0, value)) }
          : item
      )
    )
  }

  const toggleComplete = (unitActivityId: string) => {
    setEditableItems((prev) =>
      prev.map((item) =>
        item.unitActivityId === unitActivityId
          ? {
              ...item,
              newProgress: item.newProgress === 100 ? item.currentProgress : 100,
            }
          : item
      )
    )
  }

  const toggleExpand = (activityId: string) => {
    setExpandedActivities((prev) => {
      const next = new Set(prev)
      if (next.has(activityId)) next.delete(activityId)
      else next.add(activityId)
      return next
    })
  }

  // Batch create mutation
  const batchMutation = useMutation({
    mutationFn: (data: any) =>
      projectsAPI.createBatchMeasurements(projectId, data),
    onSuccess: (result) => {
      const count = result?.count ?? changedItems.length
      toast.success(`${count} medição(ões) registrada(s) com sucesso!`)
      queryClient.invalidateQueries({
        queryKey: ['project-measurements', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['project-activities', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['project-progress', projectId],
      })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao registrar medições')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (changedItems.length === 0) {
      toast.error('Nenhuma atividade foi alterada')
      return
    }

    const data: any = {
      items: changedItems.map((item) => ({
        activityId: item.activityId,
        unitActivityId: item.unitActivityId,
        progress: item.newProgress,
      })),
      notes: notes.trim() || undefined,
    }

    if (contractorId && contractorId !== 'none') {
      data.contractorId = contractorId
    }

    batchMutation.mutate(data)
  }

  const renderActivityRow = (
    activityId: string,
    items: EditableItem[]
  ) => {
    const isMultiUnit = items.length > 1
    const firstItem = items[0]
    const isExpanded = expandedActivities.has(activityId)
    const isHighlighted = defaultActivityId === activityId

    if (!isMultiUnit) {
      // Single unit — render inline row
      const item = firstItem
      return (
        <div
          key={item.unitActivityId}
          className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
            isHighlighted
              ? 'border-primary/50 bg-primary/5'
              : 'border-neutral-200'
          }`}
        >
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={item.newProgress === 100}
            onChange={() => toggleComplete(item.unitActivityId)}
            className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
          />

          {/* Activity name */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">
                {item.activityName}
              </span>
              <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                Peso: {item.weight}
              </Badge>
            </div>
            <span className="text-xs text-neutral-500">
              anterior: {Math.round(item.currentProgress)}%
            </span>
          </div>

          {/* Progress input */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={100}
              value={item.newProgress}
              onChange={(e) =>
                updateProgress(item.unitActivityId, Number(e.target.value))
              }
              className="h-8 w-16 text-center text-sm"
            />
            <span className="text-xs text-neutral-500">%</span>
          </div>

          {/* Mini progress bar */}
          <Progress
            value={item.newProgress}
            className="h-2 w-20 shrink-0"
          />
        </div>
      )
    }

    // Multi-unit: collapsible group
    return (
      <div
        key={activityId}
        className={`rounded-lg border transition-colors ${
          isHighlighted
            ? 'border-primary/50 bg-primary/5'
            : 'border-neutral-200'
        }`}
      >
        {/* Group header */}
        <button
          type="button"
          onClick={() => toggleExpand(activityId)}
          className="flex w-full items-center gap-3 p-3 text-left hover:bg-neutral-50"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-neutral-400" />
          )}
          <span className="flex-1 text-sm font-medium">
            {firstItem.activityName}
          </span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Peso: {firstItem.weight}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {items.length} unidades
          </Badge>
        </button>

        {/* Expanded unit rows */}
        {isExpanded && (
          <div className="border-t border-neutral-100 px-3 pb-3">
            {items.map((item) => (
              <div
                key={item.unitActivityId}
                className="mt-2 flex items-center gap-3 rounded border border-neutral-100 bg-neutral-50 p-2"
              >
                <input
                  type="checkbox"
                  checked={item.newProgress === 100}
                  onChange={() => toggleComplete(item.unitActivityId)}
                  className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
                />
                <span className="min-w-0 flex-1 text-sm">
                  {item.unitCode || 'Geral'}
                </span>
                <span className="text-xs text-neutral-500">
                  ant: {Math.round(item.currentProgress)}%
                </span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={item.newProgress}
                  onChange={(e) =>
                    updateProgress(
                      item.unitActivityId,
                      Number(e.target.value)
                    )
                  }
                  className="h-7 w-16 text-center text-sm"
                />
                <span className="text-xs text-neutral-500">%</span>
                <Progress
                  value={item.newProgress}
                  className="h-2 w-16 shrink-0"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Medição</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Filters row */}
          {hasHierarchy && (
            <div className="grid grid-cols-2 gap-3">
              {/* Phase select */}
              <div>
                <Label>Fase</Label>
                <Select
                  value={selectedPhaseId}
                  onValueChange={(v) => {
                    setSelectedPhaseId(v)
                    setSelectedStageId('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fase..." />
                  </SelectTrigger>
                  <SelectContent>
                    {phases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stage select */}
              <div>
                <Label>Etapa</Label>
                <Select
                  value={selectedStageId}
                  onValueChange={setSelectedStageId}
                  disabled={!selectedPhaseId || stages.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a etapa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Contractor */}
          <div>
            <Label>Empreiteiro (opcional)</Label>
            <Select value={contractorId} onValueChange={setContractorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o empreiteiro..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {(Array.isArray(contractors) ? contractors : []).map(
                  (item: any) => {
                    const c = item.contractor || item
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    )
                  }
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Stage progress bar */}
          {editableItems.length > 0 && (
            <div className="rounded-lg bg-neutral-50 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700">
                  {hasHierarchy ? 'Progresso da Etapa' : 'Progresso Geral'}
                </span>
                <span className="text-sm font-semibold text-primary">
                  {Math.round(stageProgress)}%
                </span>
              </div>
              <Progress value={stageProgress} className="h-3" />
            </div>
          )}

          {/* Activities list */}
          {editableItems.length > 0 ? (
            <div className="space-y-2">
              <Label>Atividades</Label>
              <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
                {Array.from(groupedByActivity.entries()).map(
                  ([activityId, items]) =>
                    renderActivityRow(activityId, items)
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
              <p className="text-sm text-neutral-500">
                {hasHierarchy
                  ? 'Selecione uma fase e etapa para ver as atividades'
                  : 'Nenhuma atividade encontrada neste projeto'}
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações sobre a medição..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={changedItems.length === 0 || batchMutation.isPending}
            >
              {batchMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {changedItems.length === 0
                ? 'Nenhuma alteração'
                : `Registrar ${changedItems.length} medição(ões)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
