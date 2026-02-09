import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { activityTemplatesAPI } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Save,
  Loader2,
} from 'lucide-react'
import {
  HierarchicalItemEditor,
  type TemplatePhase,
} from './HierarchicalItemEditor'

export function ActivityTemplateEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!id && id !== 'new'

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [phases, setPhases] = useState<TemplatePhase[]>([])

  // Fetch existing template when editing
  const { data: template, isLoading } = useQuery({
    queryKey: ['activity-template', id],
    queryFn: () => activityTemplatesAPI.getById(id!),
    enabled: isEditing,
  })

  // Populate form when template data loads
  useEffect(() => {
    if (template) {
      setName(template.name || '')
      setDescription(template.description || '')

      // If template has hierarchical phases, use them
      if (template.phases && template.phases.length > 0) {
        setPhases(
          template.phases.map((phase: any, pIdx: number) => ({
            name: phase.name,
            order: phase.order ?? pIdx,
            percentageOfTotal: phase.percentageOfTotal ?? 0,
            color: phase.color || null,
            stages: (phase.children || []).map((stage: any, sIdx: number) => ({
              name: stage.name,
              order: stage.order ?? sIdx,
              activities: (stage.children || []).map((act: any, aIdx: number) => ({
                name: act.name,
                order: act.order ?? aIdx,
                weight: act.weight ?? 1,
                durationDays: act.durationDays || null,
                dependencies: act.dependencies || undefined,
              })),
            })),
          }))
        )
      } else if (template.items && template.items.length > 0) {
        // Legacy flat items - convert to single phase
        const hasPhases = template.items.some((i: any) => i.level === 'PHASE')
        if (!hasPhases) {
          // Create a single phase with a single stage containing all items as activities
          setPhases([{
            name: 'Fase Única',
            order: 0,
            percentageOfTotal: 100,
            color: '#3B82F6',
            stages: [{
              name: 'Etapa Principal',
              order: 0,
              activities: template.items
                .sort((a: any, b: any) => a.order - b.order)
                .map((item: any, idx: number) => ({
                  name: item.name,
                  order: idx,
                  weight: item.weight ?? 1,
                  durationDays: null,
                })),
            }],
          }])
        }
      }
    }
  }, [template])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => activityTemplatesAPI.create(data),
    onSuccess: (result: any) => {
      toast.success('Template criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] })
      navigate(`/settings/templates/${result.id}`, { replace: true })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar template')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => activityTemplatesAPI.update(id!, data),
    onSuccess: () => {
      toast.success('Template atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] })
      queryClient.invalidateQueries({ queryKey: ['activity-template', id] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar template')
    },
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('O nome do template é obrigatório')
      return
    }

    if (phases.length === 0) {
      toast.error('Adicione pelo menos uma fase')
      return
    }

    // Validate percentages sum to 100
    const totalPct = phases.reduce((sum, p) => sum + (p.percentageOfTotal || 0), 0)
    if (Math.abs(totalPct - 100) >= 0.1) {
      toast.error('Os percentuais das fases devem somar 100%')
      return
    }

    // Validate all names are filled
    for (const phase of phases) {
      if (!phase.name.trim()) {
        toast.error('Todas as fases devem ter um nome')
        return
      }
      for (const stage of phase.stages) {
        if (!stage.name.trim()) {
          toast.error('Todas as etapas devem ter um nome')
          return
        }
        for (const act of stage.activities) {
          if (!act.name.trim()) {
            toast.error('Todas as atividades devem ter um nome')
            return
          }
        }
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      phases: phases.map((phase, pIdx) => ({
        name: phase.name.trim(),
        order: pIdx,
        percentageOfTotal: phase.percentageOfTotal,
        color: phase.color || undefined,
        stages: phase.stages.map((stage, sIdx) => ({
          name: stage.name.trim(),
          order: sIdx,
          activities: stage.activities.map((act, aIdx) => ({
            name: act.name.trim(),
            order: aIdx,
            weight: Number(act.weight) || 1,
            durationDays: act.durationDays || undefined,
            dependencies: act.dependencies?.length ? act.dependencies : undefined,
          })),
        })),
      })),
    }

    if (isEditing) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings/templates')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              {isEditing ? 'Editar Template' : 'Novo Template'}
            </h1>
            <p className="mt-1 text-neutral-600">
              {isEditing
                ? 'Altere as informações do template de atividades'
                : 'Crie um novo modelo hierárquico: Fases > Etapas > Atividades'}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar
        </Button>
      </div>

      {/* Template Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Ex: Construção Residencial Padrão"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o objetivo deste template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Hierarchical Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estrutura do Template</CardTitle>
        </CardHeader>
        <CardContent>
          <HierarchicalItemEditor phases={phases} onChange={setPhases} />
        </CardContent>
      </Card>
    </div>
  )
}
