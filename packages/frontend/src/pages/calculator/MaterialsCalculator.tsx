import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { levantamentoAPI, projectsAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Loader2, Calculator } from 'lucide-react'
import { AmbienteSidebar } from './AmbienteSidebar'
import { AmbienteDetail } from './AmbienteDetail'
import { AmbienteResumo } from './AmbienteResumo'
import { AmbienteForm } from './AmbienteForm'

interface MaterialsCalculatorProps {
  projectId: string
}

export function MaterialsCalculator({ projectId }: MaterialsCalculatorProps) {
  const queryClient = useQueryClient()
  const canEdit = usePermission('projects:edit')

  const [selectedAmbienteId, setSelectedAmbienteId] = useState<string | null>(null)

  // Ambiente form state
  const [ambienteFormOpen, setAmbienteFormOpen] = useState(false)
  const [editingAmbiente, setEditingAmbiente] = useState<any>(null)

  // Get or create levantamento for this project (project-level, no FloorPlan)
  const { data: levantamento, isLoading: levLoading } = useQuery({
    queryKey: ['levantamento-project', projectId],
    queryFn: () => levantamentoAPI.getForProject(projectId),
  })

  // Fetch project data for quantidadeUnidades
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsAPI.getById(projectId),
    staleTime: 5 * 60 * 1000,
  })

  const quantidadeUnidades = project?.quantidadeUnidades ?? 1

  // Buscar atividades do projeto para extrair etapas (PHASE/STAGE)
  const { data: activities } = useQuery({
    queryKey: ['project-activities', projectId],
    queryFn: () => projectsAPI.listActivities(projectId),
    staleTime: 5 * 60 * 1000,
  })

  const etapas = useMemo(() => {
    if (!activities || !Array.isArray(activities)) return []
    const nomes: string[] = []
    function extract(items: any[]) {
      for (const item of items) {
        if (item.level === 'PHASE' || item.level === 'STAGE') {
          nomes.push(item.name)
        }
        if (item.children?.length) extract(item.children)
      }
    }
    extract(activities)
    return nomes
  }, [activities])

  // Check if project has STAGE activities
  const hasActivities = useMemo(() => {
    if (!activities || !Array.isArray(activities)) return false
    function hasStages(items: any[]): boolean {
      for (const item of items) {
        if (item.level === 'STAGE') return true
        if (item.children?.length && hasStages(item.children)) return true
      }
      return false
    }
    return hasStages(activities)
  }, [activities])

  // Fetch templates grouped by activity (includes phases hierarchy)
  const { data: activityGroupsData } = useQuery({
    queryKey: ['templates-by-activity', projectId],
    queryFn: () => levantamentoAPI.getTemplatesByActivity(projectId),
    enabled: hasActivities,
    staleTime: 2 * 60 * 1000,
  })

  // Ambiente mutations
  const createAmbienteMutation = useMutation({
    mutationFn: (data: any) => levantamentoAPI.createAmbiente(projectId, levantamento!.id, data),
    onSuccess: (data) => {
      toast.success('Ambiente criado')
      queryClient.invalidateQueries({ queryKey: ['levantamento-project', projectId] })
      setAmbienteFormOpen(false)
      setEditingAmbiente(null)
      setSelectedAmbienteId(data.id)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateAmbienteMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      levantamentoAPI.updateAmbiente(projectId, levantamento!.id, id, data),
    onSuccess: () => {
      toast.success('Ambiente atualizado')
      queryClient.invalidateQueries({ queryKey: ['levantamento-project', projectId] })
      setAmbienteFormOpen(false)
      setEditingAmbiente(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteAmbienteMutation = useMutation({
    mutationFn: (id: string) => levantamentoAPI.deleteAmbiente(projectId, levantamento!.id, id),
    onSuccess: () => {
      toast.success('Ambiente removido')
      queryClient.invalidateQueries({ queryKey: ['levantamento-project', projectId] })
      if (selectedAmbienteId) setSelectedAmbienteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const ambientes = levantamento?.ambientes || []
  const itens = levantamento?.itens || []
  const selectedAmbiente = ambientes.find((a: any) => a.id === selectedAmbienteId)

  const handleAmbienteFormSubmit = (data: any) => {
    if (editingAmbiente) {
      updateAmbienteMutation.mutate({ id: editingAmbiente.id, data })
    } else {
      createAmbienteMutation.mutate(data)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calculator className="h-5 w-5 text-neutral-500" />
        <h2 className="text-lg font-semibold">Calculadora de Materiais</h2>
      </div>

      {/* Loading levantamento */}
      {levLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : levantamento ? (
        /* Sidebar + Content layout */
        <div className="flex gap-0 border rounded-lg overflow-hidden bg-white min-h-[500px]">
          {/* Sidebar */}
          <div className="w-56 flex-shrink-0 border-r bg-neutral-50/50">
            <AmbienteSidebar
              ambientes={ambientes}
              itens={itens}
              selectedId={selectedAmbienteId}
              onSelect={setSelectedAmbienteId}
              onAdd={() => { setEditingAmbiente(null); setAmbienteFormOpen(true) }}
              onEdit={(amb) => { setEditingAmbiente(amb); setAmbienteFormOpen(true) }}
              onDelete={(id) => deleteAmbienteMutation.mutate(id)}
              canEdit={canEdit}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {selectedAmbiente ? (
              <AmbienteDetail
                ambiente={selectedAmbiente}
                projectId={projectId}
                levantamentoId={levantamento.id}
                itens={itens}
                etapas={etapas}
                activityGroups={activityGroupsData}
              />
            ) : (
              <AmbienteResumo
                ambientes={ambientes}
                itens={itens}
                activityGroups={activityGroupsData}
                quantidadeUnidades={quantidadeUnidades}
              />
            )}
          </div>
        </div>
      ) : null}

      {/* Ambiente form dialog */}
      <AmbienteForm
        open={ambienteFormOpen}
        onOpenChange={(open) => { setAmbienteFormOpen(open); if (!open) setEditingAmbiente(null) }}
        onSubmit={handleAmbienteFormSubmit}
        isPending={createAmbienteMutation.isPending || updateAmbienteMutation.isPending}
        editData={editingAmbiente}
      />
    </div>
  )
}
