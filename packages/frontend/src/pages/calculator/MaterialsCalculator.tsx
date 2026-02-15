import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { levantamentoAPI, projectsAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calculator, Loader2, Home, Settings } from 'lucide-react'
import { AmbienteSidebar } from './AmbienteSidebar'
import { AmbienteDetail } from './AmbienteDetail'
import { AmbienteResumo } from './AmbienteResumo'
import { AmbienteForm } from './AmbienteForm'
import { ServicoTemplateAdmin } from './ServicoTemplateAdmin'

interface MaterialsCalculatorProps {
  projectId: string
}

export function MaterialsCalculator({ projectId }: MaterialsCalculatorProps) {
  const queryClient = useQueryClient()
  const canEdit = usePermission('projects:edit')

  const [selectedFloorPlanId, setSelectedFloorPlanId] = useState<string | null>(null)
  const [selectedAmbienteId, setSelectedAmbienteId] = useState<string | null>(null)

  // Ambiente form state
  const [ambienteFormOpen, setAmbienteFormOpen] = useState(false)
  const [editingAmbiente, setEditingAmbiente] = useState<any>(null)

  // Template admin
  const [templateAdminOpen, setTemplateAdminOpen] = useState(false)

  // Fetch floor plans
  const { data: floorPlans, isLoading: fpLoading } = useQuery({
    queryKey: ['floor-plans', projectId],
    queryFn: () => projectsAPI.listFloorPlans(projectId),
  })

  // Auto-select first floor plan
  useEffect(() => {
    if (!selectedFloorPlanId && floorPlans && floorPlans.length > 0) {
      setSelectedFloorPlanId(floorPlans[0].id)
    }
  }, [floorPlans, selectedFloorPlanId])

  // Get or create levantamento for selected floor plan
  const { data: levantamento, isLoading: levLoading } = useQuery({
    queryKey: ['levantamento-fp', projectId, selectedFloorPlanId],
    queryFn: () => levantamentoAPI.getForFloorPlan(projectId, selectedFloorPlanId!),
    enabled: !!selectedFloorPlanId,
  })

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

  // Auto-link activities to templates (fire-and-forget, idempotent)
  const autoLinkMutation = useMutation({
    mutationFn: () => levantamentoAPI.autoLinkActivities(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates-by-activity', projectId] })
    },
  })

  useEffect(() => {
    if (hasActivities) {
      autoLinkMutation.mutate()
    }
  }, [hasActivities]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch templates grouped by activity
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
      queryClient.invalidateQueries({ queryKey: ['levantamento-fp', projectId, selectedFloorPlanId] })
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
      queryClient.invalidateQueries({ queryKey: ['levantamento-fp', projectId, selectedFloorPlanId] })
      setAmbienteFormOpen(false)
      setEditingAmbiente(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteAmbienteMutation = useMutation({
    mutationFn: (id: string) => levantamentoAPI.deleteAmbiente(projectId, levantamento!.id, id),
    onSuccess: () => {
      toast.success('Ambiente removido')
      queryClient.invalidateQueries({ queryKey: ['levantamento-fp', projectId, selectedFloorPlanId] })
      if (selectedAmbienteId) setSelectedAmbienteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const fpList = floorPlans || []
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="h-5 w-5 text-neutral-500" />
          <h2 className="text-lg font-semibold">Calculadora de Materiais</h2>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setTemplateAdminOpen(true)} title="Configurar templates de servicos">
            <Settings className="h-4 w-4 mr-1.5" />
            Templates
          </Button>
        )}
      </div>

      {/* Floor plan tabs */}
      {fpLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : fpList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Home className="h-10 w-10 text-neutral-300" />
            <h3 className="mt-3 text-sm font-medium text-neutral-700">
              Nenhuma planta cadastrada
            </h3>
            <p className="mt-1 text-xs text-neutral-500 max-w-md text-center">
              Cadastre plantas (tipos de unidade) na aba "Unidades" do projeto
              para comecar o levantamento de materiais.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Floor plan selector */}
          <div className="flex gap-2 flex-wrap">
            {fpList.map((fp: any) => (
              <button
                key={fp.id}
                type="button"
                onClick={() => { setSelectedFloorPlanId(fp.id); setSelectedAmbienteId(null) }}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  selectedFloorPlanId === fp.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <span>{fp.name}</span>
                <Badge
                  variant={selectedFloorPlanId === fp.id ? 'secondary' : 'outline'}
                  className="ml-2 text-[10px]"
                >
                  {Number(fp.area).toFixed(0)} m²
                </Badge>
              </button>
            ))}
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
                  />
                )}
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Ambiente form dialog */}
      <AmbienteForm
        open={ambienteFormOpen}
        onOpenChange={(open) => { setAmbienteFormOpen(open); if (!open) setEditingAmbiente(null) }}
        onSubmit={handleAmbienteFormSubmit}
        isPending={createAmbienteMutation.isPending || updateAmbienteMutation.isPending}
        editData={editingAmbiente}
      />

      {/* Template admin dialog */}
      <ServicoTemplateAdmin
        open={templateAdminOpen}
        onOpenChange={setTemplateAdminOpen}
      />
    </div>
  )
}
