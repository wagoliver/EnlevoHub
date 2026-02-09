import { useState, useEffect, useMemo, useRef } from 'react'
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
import { Loader2, ChevronDown, ChevronRight, Camera, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

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
  averageProgress?: number
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

const ALL_ACTIVITIES_VALUE = '__all__'

/** Recursively collect leaf ACTIVITY nodes from a tree */
function collectLeafActivities(nodes: ActivityNode[]): ActivityNode[] {
  const result: ActivityNode[] = []
  for (const node of nodes) {
    if (node.level === 'ACTIVITY' || (!node.children?.length && !node.level)) {
      result.push(node)
    }
    if (node.children?.length) {
      result.push(...collectLeafActivities(node.children))
    }
  }
  return result
}

/** Walk a hierarchical tree to find the phase & stage that contain a given activityId */
function findAncestors(
  tree: ActivityNode[],
  targetId: string
): { phaseId: string; stageId: string } | null {
  for (const phase of tree) {
    if (phase.level === 'PHASE' && phase.children) {
      for (const child of phase.children) {
        if (child.level === 'STAGE' && child.children) {
          for (const act of child.children) {
            if (act.id === targetId) {
              return { phaseId: phase.id, stageId: child.id }
            }
          }
        }
        if (child.id === targetId) {
          return { phaseId: phase.id, stageId: '' }
        }
      }
    }
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
  const authUser = useAuthStore((s) => s.user)
  const isContractorUser = authUser?.role === 'CONTRACTOR' && !!authUser?.contractorId

  const [selectedPhaseId, setSelectedPhaseId] = useState('')
  const [selectedStageId, setSelectedStageId] = useState('')
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const [selectedUnitActivityId, setSelectedUnitActivityId] = useState('')
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [singleProgress, setSingleProgress] = useState(0)
  const [contractorId, setContractorId] = useState('')
  const [notes, setNotes] = useState('')
  const [editableItems, setEditableItems] = useState<EditableItem[]>([])
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set())
  const [initialized, setInitialized] = useState(false)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Fetch project units
  const { data: unitsData } = useQuery({
    queryKey: ['project-units', projectId],
    queryFn: () => projectsAPI.listUnits(projectId, { limit: 200 }),
    enabled: open,
  })
  const projectUnits: Array<{ id: string; code: string; [key: string]: any }> =
    (unitsData as any)?.data || []

  const activities = activitiesRaw as ActivityNode[]

  // Determine if hierarchical
  const hasHierarchy = useMemo(() => {
    return activities.some((a) => a.level === 'PHASE' || a.level === 'STAGE')
  }, [activities])

  // Extract phases
  const phases = useMemo(() => {
    if (!hasHierarchy) return []
    return activities.filter((a) => a.level === 'PHASE')
  }, [activities, hasHierarchy])

  // Extract children of selected phase
  const phaseChildren = useMemo(() => {
    if (!selectedPhaseId) return []
    const phase = phases.find((p) => p.id === selectedPhaseId)
    return phase?.children || []
  }, [phases, selectedPhaseId])

  // Determine if selected phase has stages
  const hasStages = useMemo(() => {
    return phaseChildren.some((c) => c.level === 'STAGE')
  }, [phaseChildren])

  // Extract stages for selected phase
  const stages = useMemo(() => {
    if (!hasStages) return []
    return phaseChildren.filter((c) => c.level === 'STAGE')
  }, [phaseChildren, hasStages])

  // Get ACTIVITY-level nodes available
  const availableActivities = useMemo((): ActivityNode[] => {
    if (!hasHierarchy) {
      // Flat project: all root-level activities
      return activities
    }
    if (!selectedPhaseId) return []
    if (hasStages) {
      if (!selectedStageId) return []
      const stage = stages.find((s) => s.id === selectedStageId)
      if (!stage) return []
      return collectLeafActivities(stage.children || [])
    }
    return collectLeafActivities(phaseChildren)
  }, [hasHierarchy, activities, selectedPhaseId, hasStages, selectedStageId, stages, phaseChildren])

  // Mode: single activity or batch (all)
  const isSingleMode = selectedActivityId !== '' && selectedActivityId !== ALL_ACTIVITIES_VALUE
  const isBatchMode = selectedActivityId === ALL_ACTIVITIES_VALUE

  // Selected single activity node
  const selectedActivity = useMemo(() => {
    if (!isSingleMode) return null
    return availableActivities.find((a) => a.id === selectedActivityId) || null
  }, [isSingleMode, availableActivities, selectedActivityId])

  // Unit activities for the selected single activity
  const unitActivities = selectedActivity?.unitActivities || []

  // Current progress of the selected unit activity (for single mode)
  const currentSingleProgress = useMemo(() => {
    if (!selectedActivity) return 0
    if (unitActivities.length === 0) return selectedActivity.averageProgress || 0
    // When a unit is selected via the new dropdown, find matching UnitActivity
    if (selectedUnitId) {
      const ua = unitActivities.find((u) => u.unit?.id === selectedUnitId)
      return ua?.progress ?? 0
    }
    if (selectedUnitActivityId) {
      const ua = unitActivities.find((u) => u.id === selectedUnitActivityId)
      return ua?.progress ?? 0
    }
    if (unitActivities.length === 1) return unitActivities[0].progress
    return selectedActivity.averageProgress || 0
  }, [selectedActivity, unitActivities, selectedUnitActivityId, selectedUnitId])

  // Auto-select unitActivity when activity changes (single mode)
  useEffect(() => {
    if (!isSingleMode || !selectedActivity) return
    setSelectedUnitId('')
    if (unitActivities.length === 1) {
      setSelectedUnitActivityId(unitActivities[0].id)
      setSingleProgress(unitActivities[0].progress)
    } else if (unitActivities.length === 0) {
      setSelectedUnitActivityId('')
      setSingleProgress(selectedActivity.averageProgress || 0)
    } else {
      setSelectedUnitActivityId('')
      setSingleProgress(0)
    }
  }, [isSingleMode, selectedActivity, unitActivities])

  // Update singleProgress when unitActivity selection changes
  useEffect(() => {
    if (!isSingleMode || !selectedUnitActivityId) return
    const ua = unitActivities.find((u) => u.id === selectedUnitActivityId)
    if (ua) setSingleProgress(ua.progress)
  }, [isSingleMode, selectedUnitActivityId, unitActivities])

  // Update singleProgress when unit selection changes (new unit dropdown)
  useEffect(() => {
    if (!isSingleMode || !selectedUnitId) return
    const ua = unitActivities.find((u) => u.unit?.id === selectedUnitId)
    setSingleProgress(ua?.progress ?? 0)
  }, [isSingleMode, selectedUnitId, unitActivities])

  // Build editable items for batch mode
  const batchActivities = useMemo((): ActivityNode[] => {
    if (!isBatchMode) return []
    return availableActivities
  }, [isBatchMode, availableActivities])

  useEffect(() => {
    if (!isBatchMode) {
      setEditableItems([])
      return
    }
    const items: EditableItem[] = []
    for (const act of batchActivities) {
      if (act.unitActivities.length <= 1) {
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
        } else {
          // Activity without unitActivities — cannot batch, skip
        }
      } else {
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
  }, [isBatchMode, batchActivities])

  // Initialize when dialog opens
  useEffect(() => {
    if (!open) {
      setInitialized(false)
      return
    }
    if (initialized || activities.length === 0) return

    setContractorId(isContractorUser ? authUser!.contractorId! : '')
    setNotes('')
    setSingleProgress(0)
    setSelectedUnitActivityId('')
    setSelectedUnitId('')
    setPhotoFiles([])

    if (defaultActivityId && hasHierarchy) {
      const ancestors = findAncestors(activities, defaultActivityId)
      if (ancestors) {
        setSelectedPhaseId(ancestors.phaseId)
        setSelectedStageId(ancestors.stageId)
        setSelectedActivityId(defaultActivityId)
      } else {
        setSelectedPhaseId('')
        setSelectedStageId('')
        setSelectedActivityId('')
      }
    } else if (!hasHierarchy) {
      setSelectedPhaseId('')
      setSelectedStageId('')
      setSelectedActivityId(defaultActivityId || '')
    } else {
      setSelectedPhaseId('')
      setSelectedStageId('')
      setSelectedActivityId('')
    }
    setInitialized(true)
  }, [open, activities, defaultActivityId, hasHierarchy, initialized, isContractorUser, authUser])

  // Batch progress calculations
  const stageProgress = useMemo(() => {
    if (editableItems.length === 0) return 0
    const totalWeight = editableItems.reduce((sum, i) => sum + i.weight, 0)
    if (totalWeight === 0) return 0
    const weightedSum = editableItems.reduce((sum, i) => sum + i.weight * i.newProgress, 0)
    return Math.round((weightedSum / totalWeight) * 100) / 100
  }, [editableItems])

  const changedItems = useMemo(
    () => editableItems.filter((i) => i.newProgress !== i.currentProgress),
    [editableItems]
  )

  const groupedByActivity = useMemo(() => {
    const groups: Map<string, EditableItem[]> = new Map()
    for (const item of editableItems) {
      if (!groups.has(item.activityId)) groups.set(item.activityId, [])
      groups.get(item.activityId)!.push(item)
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
          ? { ...item, newProgress: item.newProgress === 100 ? item.currentProgress : 100 }
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

  // --- Mutations ---

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['project-measurements', projectId] })
    queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] })
    queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] })
  }

  // Single measurement (original endpoint)
  const singleMutation = useMutation({
    mutationFn: (data: any) => projectsAPI.createMeasurement(projectId, data),
    onSuccess: () => {
      toast.success('Medição registrada com sucesso!')
      invalidateAll()
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao registrar medição')
    },
  })

  // Batch measurements
  const batchMutation = useMutation({
    mutationFn: (data: any) => projectsAPI.createBatchMeasurements(projectId, data),
    onSuccess: (result) => {
      const count = result?.count ?? changedItems.length
      toast.success(`${count} medição(ões) registrada(s) com sucesso!`)
      invalidateAll()
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao registrar medições')
    },
  })

  const isPending = singleMutation.isPending || batchMutation.isPending || isUploading

  // --- Submit ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const effectiveContractorId = contractorId && contractorId !== 'none' ? contractorId : undefined

    if (isSingleMode) {
      // Single activity mode
      if (!selectedActivityId) {
        toast.error('Selecione uma atividade')
        return
      }
      if (singleProgress < 0 || singleProgress > 100) {
        toast.error('Progresso deve estar entre 0 e 100')
        return
      }

      const data: any = {
        activityId: selectedActivityId,
        progress: singleProgress,
        notes: notes.trim() || undefined,
        contractorId: effectiveContractorId,
      }

      if (selectedUnitId) {
        data.unitId = selectedUnitId
      } else if (selectedUnitActivityId) {
        data.unitActivityId = selectedUnitActivityId
      }

      // Upload photos if any
      if (photoFiles.length > 0) {
        setIsUploading(true)
        try {
          const formData = new FormData()
          photoFiles.forEach((file) => formData.append('photos', file))
          const result = await projectsAPI.uploadMeasurementPhotos(projectId, formData)
          data.photos = result.urls
        } catch {
          toast.error('Erro ao enviar fotos. Tente novamente.')
          setIsUploading(false)
          return
        }
        setIsUploading(false)
      }

      singleMutation.mutate(data)
    } else if (isBatchMode) {
      // Batch mode
      if (changedItems.length === 0) {
        toast.error('Nenhuma atividade foi alterada')
        return
      }

      batchMutation.mutate({
        items: changedItems.map((item) => ({
          activityId: item.activityId,
          unitActivityId: item.unitActivityId,
          progress: item.newProgress,
        })),
        notes: notes.trim() || undefined,
        contractorId: effectiveContractorId,
      })
    }
  }

  // Can submit?
  const canSubmit = useMemo(() => {
    if (isPending) return false
    if (isSingleMode) {
      return singleProgress !== currentSingleProgress && singleProgress >= 0 && singleProgress <= 100
    }
    if (isBatchMode) {
      return changedItems.length > 0
    }
    return false
  }, [isPending, isSingleMode, isBatchMode, singleProgress, currentSingleProgress, changedItems])

  // Submit label
  const submitLabel = useMemo(() => {
    if (isSingleMode) return 'Registrar Medição'
    if (isBatchMode) {
      if (changedItems.length === 0) return 'Nenhuma alteração'
      return `Registrar ${changedItems.length} medição(ões)`
    }
    return 'Registrar Medição'
  }, [isSingleMode, isBatchMode, changedItems])

  // Empty state message
  const emptyMessage = useMemo(() => {
    if (!hasHierarchy) return 'Selecione uma atividade'
    if (!selectedPhaseId) return 'Selecione uma fase para começar'
    if (hasStages && !selectedStageId) return 'Selecione uma etapa'
    if (!selectedActivityId) return 'Selecione uma atividade'
    return 'Nenhuma atividade encontrada'
  }, [hasHierarchy, selectedPhaseId, hasStages, selectedStageId, selectedActivityId])

  // --- Render helpers ---

  const renderBatchRow = (activityId: string, items: EditableItem[]) => {
    const isMultiUnit = items.length > 1
    const firstItem = items[0]
    const isExpanded = expandedActivities.has(activityId)
    const isHighlighted = defaultActivityId === activityId

    if (!isMultiUnit) {
      const item = firstItem
      return (
        <div
          key={item.unitActivityId}
          className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
            isHighlighted ? 'border-primary/50 bg-primary/5' : 'border-neutral-200'
          }`}
        >
          <input
            type="checkbox"
            checked={item.newProgress === 100}
            onChange={() => toggleComplete(item.unitActivityId)}
            className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{item.activityName}</span>
              <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                Peso: {item.weight}
              </Badge>
            </div>
            <span className="text-xs text-neutral-500">
              anterior: {Math.round(item.currentProgress)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={100}
              value={item.newProgress}
              onChange={(e) => updateProgress(item.unitActivityId, Number(e.target.value))}
              className="h-8 w-16 text-center text-sm"
            />
            <span className="text-xs text-neutral-500">%</span>
          </div>
          <Progress value={item.newProgress} className="h-2 w-20 shrink-0" />
        </div>
      )
    }

    return (
      <div
        key={activityId}
        className={`rounded-lg border transition-colors ${
          isHighlighted ? 'border-primary/50 bg-primary/5' : 'border-neutral-200'
        }`}
      >
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
          <span className="flex-1 text-sm font-medium">{firstItem.activityName}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Peso: {firstItem.weight}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {items.length} unidades
          </Badge>
        </button>
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
                <span className="min-w-0 flex-1 text-sm">{item.unitCode || 'Geral'}</span>
                <span className="text-xs text-neutral-500">
                  ant: {Math.round(item.currentProgress)}%
                </span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={item.newProgress}
                  onChange={(e) => updateProgress(item.unitActivityId, Number(e.target.value))}
                  className="h-7 w-16 text-center text-sm"
                />
                <span className="text-xs text-neutral-500">%</span>
                <Progress value={item.newProgress} className="h-2 w-16 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // --- Main render ---

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Medição</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* === Hierarchy filters === */}
          {hasHierarchy && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fase</Label>
                  <Select
                    value={selectedPhaseId}
                    onValueChange={(v) => {
                      setSelectedPhaseId(v)
                      setSelectedStageId('')
                      setSelectedActivityId('')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a fase..." />
                    </SelectTrigger>
                    <SelectContent>
                      {phases.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasStages ? (
                  <div>
                    <Label>Etapa</Label>
                    <Select
                      value={selectedStageId}
                      onValueChange={(v) => {
                        setSelectedStageId(v)
                        setSelectedActivityId('')
                      }}
                      disabled={!selectedPhaseId || stages.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a etapa..." />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div />
                )}
              </div>

              {availableActivities.length > 0 && (
                <div>
                  <Label>Atividade</Label>
                  <Select value={selectedActivityId} onValueChange={setSelectedActivityId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a atividade..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_ACTIVITIES_VALUE}>
                        Todas as atividades ({availableActivities.length})
                      </SelectItem>
                      {availableActivities.map((act) => (
                        <SelectItem key={act.id} value={act.id}>{act.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* === Flat project activity select === */}
          {!hasHierarchy && activities.length > 0 && (
            <div>
              <Label>Atividade</Label>
              <Select value={selectedActivityId} onValueChange={setSelectedActivityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a atividade..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ACTIVITIES_VALUE}>
                    Todas as atividades ({availableActivities.length})
                  </SelectItem>
                  {availableActivities.map((act) => (
                    <SelectItem key={act.id} value={act.id}>{act.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* === Contractor === */}
          <div>
            <Label>{isContractorUser ? 'Empreiteiro' : 'Empreiteiro (opcional)'}</Label>
            <Select value={contractorId} onValueChange={setContractorId} disabled={isContractorUser}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o empreiteiro..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {(Array.isArray(contractors) ? contractors : []).map((item: any) => {
                  const c = item.contractor || item
                  return (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* ============================================= */}
          {/* === SINGLE ACTIVITY MODE: direct % input === */}
          {/* ============================================= */}
          {isSingleMode && selectedActivity && (
            <div className="space-y-4 rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{selectedActivity.name}</p>
                  <p className="text-xs text-neutral-500">
                    Peso: {selectedActivity.weight}
                    {' | '}
                    Progresso atual: {Math.round(currentSingleProgress)}%
                  </p>
                </div>
                <Badge variant={currentSingleProgress >= 100 ? 'completed' : currentSingleProgress > 0 ? 'inProgress' : 'secondary'}>
                  {Math.round(currentSingleProgress)}%
                </Badge>
              </div>

              {/* Unit selector (for non-GENERAL activities when project has units) */}
              {selectedActivity?.scope !== 'GENERAL' && projectUnits.length > 0 && (
                <div>
                  <Label>Unidade</Label>
                  <Select
                    value={selectedUnitId}
                    onValueChange={(v) => {
                      setSelectedUnitId(v)
                      // Clear the old unitActivityId-based selection
                      setSelectedUnitActivityId('')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projectUnits.map((unit) => {
                        const ua = unitActivities.find((u) => u.unit?.id === unit.id)
                        const progress = ua ? Math.round(ua.progress) : 0
                        const isCompleted = progress >= 100
                        return (
                          <SelectItem
                            key={unit.id}
                            value={unit.id}
                            disabled={isCompleted}
                          >
                            {unit.code} - {isCompleted ? '100% (Concluída)' : `${progress}% atual`}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Progress input */}
              <div>
                <Label htmlFor="single-progress">Novo progresso (%)</Label>
                <div className="mt-1 flex items-center gap-3">
                  <Input
                    id="single-progress"
                    type="number"
                    min={0}
                    max={100}
                    value={singleProgress}
                    onChange={(e) => setSingleProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-24 text-center"
                  />
                  <div className="flex-1">
                    <Progress value={singleProgress} className="h-3" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSingleProgress(100)}
                    className="shrink-0"
                  >
                    100%
                  </Button>
                </div>
                {singleProgress !== currentSingleProgress && (
                  <p className="mt-1 text-xs text-neutral-500">
                    {Math.round(currentSingleProgress)}% &rarr; {Math.round(singleProgress)}%
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ============================== */}
          {/* === BATCH MODE: checklist  === */}
          {/* ============================== */}
          {isBatchMode && (
            <>
              {/* Stage progress */}
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

              {editableItems.length > 0 ? (
                <div className="space-y-2">
                  <Label>Atividades</Label>
                  <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
                    {Array.from(groupedByActivity.entries()).map(([actId, items]) =>
                      renderBatchRow(actId, items)
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center">
                  <p className="text-sm text-neutral-500">
                    Nenhuma atividade com unidades vinculadas
                  </p>
                </div>
              )}
            </>
          )}

          {/* === No selection yet === */}
          {!isSingleMode && !isBatchMode && (
            <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
              <p className="text-sm text-neutral-500">{emptyMessage}</p>
            </div>
          )}

          {/* === Photo upload (single mode only) === */}
          {isSingleMode && selectedActivity && (
            <div className="space-y-2">
              <Label>Fotos</Label>
              <div className="flex flex-wrap gap-2">
                {photoFiles.map((file, index) => (
                  <div key={index} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-neutral-200">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Foto ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoFiles((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute right-0.5 top-0.5 hidden rounded-full bg-black/60 p-0.5 text-white group-hover:flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photoFiles.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 text-neutral-400 transition-colors hover:border-primary hover:text-primary"
                  >
                    <Camera className="h-6 w-6" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  setPhotoFiles((prev) => {
                    const combined = [...prev, ...files]
                    return combined.slice(0, 5)
                  })
                  e.target.value = ''
                }}
              />
              {photoFiles.length > 0 && (
                <p className="text-xs text-neutral-500">{photoFiles.length}/5 foto(s)</p>
              )}
            </div>
          )}

          {/* === Notes === */}
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
