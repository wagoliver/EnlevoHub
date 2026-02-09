import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { contractorsAPI, projectsAPI } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface ContractorActivitiesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractorId: string
  projectId: string
  projectName: string
}

interface ActivityNode {
  id: string
  name: string
  level: string
  parentId: string | null
  order: number
  children?: ActivityNode[]
}

/**
 * Flatten a hierarchical activity tree into a flat list.
 */
function flattenTree(nodes: ActivityNode[]): ActivityNode[] {
  const result: ActivityNode[] = []
  for (const node of nodes) {
    result.push(node)
    if (node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children))
    }
  }
  return result
}

/**
 * Build a tree from flat activities (they may come as flat or already as tree).
 */
function buildTree(activities: ActivityNode[]): ActivityNode[] {
  // Check if already a tree (items have children arrays)
  if (activities.some(a => a.children && a.children.length > 0)) {
    return activities
  }

  const map = new Map<string, ActivityNode & { children: ActivityNode[] }>()
  activities.forEach(a => map.set(a.id, { ...a, children: [] }))

  const roots: ActivityNode[] = []
  for (const item of map.values()) {
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(item)
    } else {
      roots.push(item)
    }
  }

  return roots
}

export function ContractorActivitiesDialog({
  open,
  onOpenChange,
  contractorId,
  projectId,
  projectName,
}: ContractorActivitiesDialogProps) {
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Fetch all project activities
  const { data: allActivities, isLoading: loadingActivities } = useQuery({
    queryKey: ['project-activities', projectId],
    queryFn: () => projectsAPI.listActivities(projectId),
    enabled: open,
  })

  // Fetch currently assigned activities
  const { data: assignedActivities, isLoading: loadingAssigned } = useQuery({
    queryKey: ['contractor-activities', contractorId, projectId],
    queryFn: () => contractorsAPI.listActivitiesByProject(contractorId, projectId),
    enabled: open,
  })

  // Initialize selected IDs from assigned activities
  useEffect(() => {
    if (assignedActivities) {
      const ids = new Set(
        (assignedActivities as any[]).map((a: any) => a.projectActivityId || a.id)
      )
      setSelectedIds(ids)
    }
  }, [assignedActivities])

  // Parse activity tree and get leaf activities
  const { tree, leafActivities } = useMemo(() => {
    if (!allActivities) return { tree: [] as ActivityNode[], leafActivities: [] as ActivityNode[] }

    const rawData = Array.isArray(allActivities) ? allActivities : []
    const builtTree = buildTree(rawData)
    const flat = flattenTree(builtTree)
    const leaves = flat.filter(a => a.level === 'ACTIVITY')

    return { tree: builtTree, leafActivities: leaves }
  }, [allActivities])

  const toggleActivity = (activityId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(activityId)) {
        next.delete(activityId)
      } else {
        next.add(activityId)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(leafActivities.map(a => a.id)))
  }

  const selectNone = () => {
    setSelectedIds(new Set())
  }

  const syncMutation = useMutation({
    mutationFn: (activityIds: string[]) =>
      contractorsAPI.syncActivities(contractorId, projectId, activityIds),
    onSuccess: () => {
      toast.success('Atividades atualizadas com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['contractor-activities', contractorId, projectId] })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSave = () => {
    syncMutation.mutate(Array.from(selectedIds))
  }

  const isLoading = loadingActivities || loadingAssigned

  /**
   * Render activity tree recursively with indentation.
   * Only ACTIVITY-level items get checkboxes; phases/stages are headers.
   */
  const renderActivityNode = (node: ActivityNode, depth: number = 0) => {
    const isLeaf = node.level === 'ACTIVITY'
    const children = node.children || []

    // Count how many leaf descendants are selected
    const getLeafDescendants = (n: ActivityNode): string[] => {
      if (n.level === 'ACTIVITY') return [n.id]
      return (n.children || []).flatMap(getLeafDescendants)
    }

    const leafDescendantIds = isLeaf ? [] : getLeafDescendants(node)
    const selectedCount = leafDescendantIds.filter(id => selectedIds.has(id)).length

    return (
      <div key={node.id}>
        {isLeaf ? (
          <label
            className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-neutral-50 cursor-pointer"
            style={{ paddingLeft: `${depth * 24 + 12}px` }}
          >
            <Checkbox
              checked={selectedIds.has(node.id)}
              onChange={() => toggleActivity(node.id)}
            />
            <span className="text-sm">{node.name}</span>
          </label>
        ) : (
          <div
            className="flex items-center gap-2 px-3 py-2 mt-1"
            style={{ paddingLeft: `${depth * 24 + 12}px` }}
          >
            <span className="text-sm font-semibold text-neutral-700">
              {node.name}
            </span>
            {leafDescendantIds.length > 0 && (
              <span className="text-xs text-neutral-400">
                ({selectedCount}/{leafDescendantIds.length})
              </span>
            )}
          </div>
        )}
        {children.map(child => renderActivityNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Atividades do Empreiteiro</DialogTitle>
          <DialogDescription>
            Selecione as atividades atribuídas ao empreiteiro no projeto{' '}
            <strong>{projectName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : leafActivities.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500">
            Nenhuma atividade encontrada neste projeto.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <span className="text-xs text-neutral-500">
                {selectedIds.size} de {leafActivities.length} selecionadas
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
                  Selecionar todas
                </Button>
                <Button variant="ghost" size="sm" onClick={selectNone} className="text-xs h-7">
                  Limpar
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 max-h-[400px] -mx-2 px-2">
              {tree.map(node => renderActivityNode(node))}
            </div>
          </>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            disabled={syncMutation.isPending || isLoading}
            onClick={handleSave}
          >
            {syncMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
