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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Save,
  Loader2,
  LayoutTemplate,
  Upload,
  FilePlus,
  Download,
  Lightbulb,
  Layers,
  ListTree,
  CheckSquare,
  ChevronRight,
} from 'lucide-react'
import {
  HierarchicalItemEditor,
  type TemplatePhase,
} from './HierarchicalItemEditor'
import { ImportTemplateDialog, type ParsedPhase } from './ImportTemplateDialog'
import { TEMPLATE_MODELS, TEMPLATE_CATEGORIES } from './template-models'

type StartingPoint = null | 'model' | 'import' | 'blank'

function modelRowsToPhases(rows: any[][]): TemplatePhase[] {
  const phaseMap = new Map<string, {
    percentageOfTotal: number
    color: string | null
    stageMap: Map<string, { name: string; order: number; weight: number; durationDays: number | null; dependencies: string[] | undefined }[]>
  }>()
  const phaseOrder: string[] = []

  for (const row of rows) {
    const [fase, percentual, cor, etapa, atividade, peso, duracao, deps] = row
    const faseName = String(fase ?? '').trim()
    const etapaName = String(etapa ?? '').trim()
    const atividadeName = String(atividade ?? '').trim()
    if (!faseName || !etapaName || !atividadeName) continue

    if (!phaseMap.has(faseName)) {
      phaseMap.set(faseName, {
        percentageOfTotal: Number(percentual) || 0,
        color: cor ? String(cor).trim() : null,
        stageMap: new Map(),
      })
      phaseOrder.push(faseName)
    }

    const phase = phaseMap.get(faseName)!
    if (!phase.stageMap.has(etapaName)) {
      phase.stageMap.set(etapaName, [])
    }

    const activities = phase.stageMap.get(etapaName)!
    const depsStr = String(deps ?? '').trim()
    const depsList = depsStr
      ? depsStr.split(';').map((d) => d.trim()).filter((d) => d.length > 0)
      : undefined

    activities.push({
      name: atividadeName,
      order: activities.length,
      weight: Number(peso) || 1,
      durationDays: duracao && !isNaN(Number(duracao)) ? Number(duracao) : null,
      dependencies: depsList,
    })
  }

  return phaseOrder.map((phaseName, pIdx) => {
    const p = phaseMap.get(phaseName)!
    const stageNames = Array.from(p.stageMap.keys())
    return {
      name: phaseName,
      order: pIdx,
      percentageOfTotal: p.percentageOfTotal,
      color: p.color,
      stages: stageNames.map((sName, sIdx) => ({
        name: sName,
        order: sIdx,
        activities: p.stageMap.get(sName)!,
      })),
    }
  })
}

function parsedToTemplatePhases(parsed: ParsedPhase[]): TemplatePhase[] {
  return parsed.map((p, pIdx) => ({
    name: p.name,
    order: pIdx,
    percentageOfTotal: p.percentageOfTotal,
    color: p.color,
    stages: p.stages.map((s, sIdx) => ({
      name: s.name,
      order: sIdx,
      activities: s.activities.map((a, aIdx) => ({
        name: a.name,
        order: aIdx,
        weight: a.weight,
        durationDays: a.durationDays,
        dependencies: a.dependencies ?? undefined,
      })),
    })),
  }))
}

export function ActivityTemplateEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!id && id !== 'new'
  const isNew = id === 'new'

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [phases, setPhases] = useState<TemplatePhase[]>([])
  const [startingPoint, setStartingPoint] = useState<StartingPoint>(null)
  const [selectedModel, setSelectedModel] = useState('')
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const showStartingPoint = isNew && startingPoint === null

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
        const hasPhases = template.items.some((i: any) => i.level === 'PHASE')
        if (!hasPhases) {
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
      toast.success('Planejamento criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] })
      navigate(`/settings/planejamentos/${result.id}`, { replace: true })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar planejamento')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => activityTemplatesAPI.update(id!, data),
    onSuccess: () => {
      toast.success('Planejamento atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] })
      queryClient.invalidateQueries({ queryKey: ['activity-template', id] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar planejamento')
    },
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('O nome do planejamento é obrigatório')
      return
    }

    if (phases.length === 0) {
      toast.error('Adicione pelo menos uma fase')
      return
    }

    const totalPct = phases.reduce((sum, p) => sum + (p.percentageOfTotal || 0), 0)
    if (Math.abs(totalPct - 100) >= 0.1) {
      toast.error('Os percentuais das fases devem somar 100%')
      return
    }

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

  const handleLoadModel = () => {
    const tpl = TEMPLATE_MODELS.find((t) => t.key === selectedModel)
    if (!tpl) return
    const parsed = modelRowsToPhases(tpl.rows.map((r) => [...r]))
    setPhases(parsed)
    if (!name) setName(tpl.label)
  }

  const handleDownloadModel = () => {
    const tpl = TEMPLATE_MODELS.find((t) => t.key === selectedModel)
    if (!tpl) return
    // Dynamic import to avoid bundling XLSX in the editor
    import('xlsx').then((XLSX) => {
      const HEADERS = ['Fase', 'Percentual (%)', 'Cor', 'Etapa', 'Atividade', 'Peso (1-5)', 'Duração (dias)', 'Dependências']
      const data = [HEADERS, ...tpl.rows]
      const ws = XLSX.utils.aoa_to_sheet(data)
      ws['!cols'] = [
        { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 20 },
        { wch: 22 }, { wch: 8 }, { wch: 16 }, { wch: 22 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Template')
      XLSX.writeFile(wb, `modelo-${tpl.key}.xlsx`)
    })
  }

  const handleImportLoad = (data: { name: string; phases: ParsedPhase[] }) => {
    setPhases(parsedToTemplatePhases(data.phases))
    if (!name) setName(data.name)
    setImportDialogOpen(false)
  }

  const handleBackToCards = () => {
    setStartingPoint(null)
    setName('')
    setDescription('')
    setPhases([])
    setSelectedModel('')
  }

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Starting point selection for new templates
  if (showStartingPoint) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings/planejamentos')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              Novo Planejamento
            </h1>
            <p className="mt-1 text-neutral-600">
              Como deseja começar?
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => setStartingPoint('model')}
            className="group flex flex-col items-center gap-3 rounded-xl border-2 border-neutral-200 bg-white p-8 text-center transition-all hover:border-primary hover:shadow-md"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
              <LayoutTemplate className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">
              A partir de modelo
            </h3>
            <p className="text-sm text-neutral-500">
              Escolha um dos 20 modelos pré-prontos por tipo de obra
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setStartingPoint('import')
              setImportDialogOpen(true)
            }}
            className="group flex flex-col items-center gap-3 rounded-xl border-2 border-neutral-200 bg-white p-8 text-center transition-all hover:border-primary hover:shadow-md"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
              <Upload className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">
              Importar planilha
            </h3>
            <p className="text-sm text-neutral-500">
              Faça upload de um arquivo XLSX ou CSV
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStartingPoint('blank')}
            className="group flex flex-col items-center gap-3 rounded-xl border-2 border-neutral-200 bg-white p-8 text-center transition-all hover:border-primary hover:shadow-md"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
              <FilePlus className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">
              Em branco
            </h3>
            <p className="text-sm text-neutral-500">
              Comece do zero adicionando fases e atividades
            </p>
          </button>
        </div>

        {/* How it works - Visual hierarchy explanation */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Como funciona a estrutura
          </h3>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-0">
            {/* Phase */}
            <div className="flex flex-col items-center gap-1.5 px-6 py-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Layers className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold text-neutral-800">Fases</span>
              <span className="max-w-[140px] text-center text-xs text-neutral-500">
                Grandes etapas da obra (ex: Fundação, Estrutura)
              </span>
            </div>
            {/* Arrow */}
            <ChevronRight className="hidden h-5 w-5 shrink-0 text-neutral-300 sm:block" />
            {/* Stage */}
            <div className="flex flex-col items-center gap-1.5 px-6 py-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <ListTree className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold text-neutral-800">Etapas</span>
              <span className="max-w-[140px] text-center text-xs text-neutral-500">
                Subdivisões de cada fase (ex: Alvenaria, Reboco)
              </span>
            </div>
            {/* Arrow */}
            <ChevronRight className="hidden h-5 w-5 shrink-0 text-neutral-300 sm:block" />
            {/* Activity */}
            <div className="flex flex-col items-center gap-1.5 px-6 py-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <CheckSquare className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold text-neutral-800">Atividades</span>
              <span className="max-w-[140px] text-center text-xs text-neutral-500">
                Tarefas específicas com peso e duração
              </span>
            </div>
          </div>
        </div>

        {/* Tips section */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-amber-900">Qual opção escolher?</h4>
              <ul className="space-y-1.5 text-sm text-amber-800">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 font-bold text-amber-600">&bull;</span>
                  <span><strong>A partir de modelo</strong> — Ideal para quem está começando. Escolha entre 20 modelos prontos por tipo de obra e personalize conforme sua necessidade.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 font-bold text-amber-600">&bull;</span>
                  <span><strong>Importar planilha</strong> — Perfeito se você já tem um cronograma em Excel ou CSV. O sistema identifica fases, etapas e atividades automaticamente.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 font-bold text-amber-600">&bull;</span>
                  <span><strong>Em branco</strong> — Para quem prefere montar a estrutura do zero, com total liberdade na organização.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Import dialog for the import card */}
        <ImportTemplateDialog
          open={importDialogOpen}
          onOpenChange={(open) => {
            setImportDialogOpen(open)
            if (!open && phases.length === 0) {
              setStartingPoint(null)
            }
          }}
          onLoad={handleImportLoad}
        />
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
            onClick={() => navigate('/settings/planejamentos')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              {isEditing ? 'Editar Planejamento' : 'Novo Planejamento'}
            </h1>
            <p className="mt-1 text-neutral-600">
              {isEditing
                ? 'Altere as informações do planejamento'
                : 'Crie um novo planejamento hierárquico: Fases > Etapas > Atividades'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isNew && startingPoint && (
            <Button variant="outline" onClick={handleBackToCards}>
              Escolher outro método
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {/* Model selector - shown when starting from model */}
      {startingPoint === 'model' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modelo de Planejamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione o tipo de obra..." />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((category) => (
                    <SelectGroup key={category}>
                      <SelectLabel>{category}</SelectLabel>
                      {TEMPLATE_MODELS
                        .filter((t) => t.category === category)
                        .map((t) => (
                          <SelectItem key={t.key} value={t.key}>
                            {t.label}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!selectedModel}
                onClick={handleLoadModel}
              >
                <Upload className="mr-2 h-4 w-4" />
                Carregar
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedModel}
                onClick={handleDownloadModel}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar
              </Button>
            </div>
            {selectedModel && (
              <p className="mt-2 text-xs text-neutral-500 italic">
                {TEMPLATE_MODELS.find((t) => t.key === selectedModel)?.description}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Template Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do Planejamento</CardTitle>
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
              placeholder="Descreva o objetivo deste planejamento..."
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
          <CardTitle className="text-base">Estrutura do Planejamento</CardTitle>
        </CardHeader>
        <CardContent>
          <HierarchicalItemEditor phases={phases} onChange={setPhases} />
        </CardContent>
      </Card>
    </div>
  )
}
