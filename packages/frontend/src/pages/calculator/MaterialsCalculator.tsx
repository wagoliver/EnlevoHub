import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { levantamentoAPI, projectsAPI } from '@/lib/api-client'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActivitySidebar } from './ActivitySidebar'
import { ActivityDetail } from './ActivityDetail'
import { ActivityResumo } from './ActivityResumo'

interface MaterialsCalculatorProps {
  projectId: string
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

export function MaterialsCalculator({ projectId }: MaterialsCalculatorProps) {
  const navigate = useNavigate()

  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)

  // Get or create levantamento for this project (project-level, no FloorPlan)
  const { data: levantamento, isLoading: levLoading } = useQuery({
    queryKey: ['levantamento-project', projectId],
    queryFn: () => levantamentoAPI.getForProject(projectId),
  })

  // Fetch project data (uses _count.units as multiplier)
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsAPI.getById(projectId),
    staleTime: 5 * 60 * 1000,
  })

  const quantidadeUnidades = project?._count?.units ?? 1

  // Buscar atividades do projeto
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['project-activities', projectId],
    queryFn: () => projectsAPI.listActivities(projectId),
    staleTime: 5 * 60 * 1000,
  })

  // Check if project has STAGE activities
  const hasActivities = useMemo(() => {
    if (!activities || !Array.isArray(activities)) return false
    return collectStages(activities).length > 0
  }, [activities])

  // Fetch templates grouped by activity
  const { data: activityGroupsData } = useQuery({
    queryKey: ['templates-by-activity', projectId],
    queryFn: () => levantamentoAPI.getTemplatesByActivity(projectId),
    enabled: hasActivities,
    staleTime: 2 * 60 * 1000,
  })

  const itens = levantamento?.itens || []

  // Find selected activity from the tree
  const selectedActivity = useMemo(() => {
    if (!selectedActivityId || !activities) return null
    const stages = collectStages(activities)
    return stages.find((s) => s.id === selectedActivityId) || null
  }, [selectedActivityId, activities])

  const isLoading = levLoading || activitiesLoading

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : !hasActivities ? (
        /* Empty state — no activities */
        <div className="rounded-lg border-2 border-dashed border-amber-200 bg-amber-50 p-8 text-center">
          <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
          <h3 className="mt-3 text-sm font-semibold text-neutral-700">
            Nenhuma atividade cadastrada
          </h3>
          <p className="mt-1 text-xs text-neutral-500 max-w-md mx-auto">
            Cadastre as atividades do projeto na Fase 01 (Planejamento) para iniciar o levantamento de materiais.
          </p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => navigate('/?phase=1')}
          >
            Ir para Planejamento
          </Button>
        </div>
      ) : levantamento ? (
        /* Sidebar + Content layout */
        <div className="flex gap-0 border rounded-lg overflow-hidden bg-white min-h-[500px]">
          {/* Sidebar */}
          <div className="w-56 flex-shrink-0 border-r bg-neutral-50/50">
            <ActivitySidebar
              activities={activities || []}
              itens={itens}
              selectedActivityId={selectedActivityId}
              onSelect={setSelectedActivityId}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {selectedActivity ? (
              <ActivityDetail
                activity={selectedActivity}
                projectId={projectId}
                levantamentoId={levantamento.id}
                itens={itens}
                activityGroups={activityGroupsData}
              />
            ) : (
              <ActivityResumo
                activities={activities || []}
                itens={itens}
                quantidadeUnidades={quantidadeUnidades}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
