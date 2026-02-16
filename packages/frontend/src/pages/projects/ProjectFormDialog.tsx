import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react'
import { TEMPLATE_MODELS, TEMPLATE_CATEGORIES } from '../settings/template-models'
import { rowsToPhases, injectSinapiMap } from '../settings/template-utils'
import type { ParsedPhase } from '../settings/template-utils'

const projectFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']),
  budget: z.coerce.number().positive('Orçamento deve ser positivo'),
  quantidadeUnidades: z.coerce.number().int().min(1, 'Mínimo 1').max(9999, 'Máximo 9999'),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
  street: z.string().min(2, 'Rua é obrigatória'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Bairro é obrigatório'),
  city: z.string().min(2, 'Cidade é obrigatória'),
  state: z.string().length(2, 'UF deve ter 2 caracteres'),
  zipCode: z.string().min(8, 'CEP é obrigatório'),
})

type ProjectFormValues = z.infer<typeof projectFormSchema>

interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: any // existing project for edit mode
}

const statusLabels: Record<string, string> = {
  PLANNING: 'Planejamento',
  IN_PROGRESS: 'Em Andamento',
  PAUSED: 'Pausado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

export function ProjectFormDialog({ open, onOpenChange, project }: ProjectFormDialogProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isEdit = !!project

  const [step, setStep] = useState(1)
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('')
  const [previewPhases, setPreviewPhases] = useState<ParsedPhase[]>([])
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: project
      ? {
          name: project.name,
          description: project.description || '',
          status: project.status,
          budget: project.budget,
          quantidadeUnidades: project.quantidadeUnidades || 1,
          startDate: project.startDate
            ? new Date(project.startDate).toISOString().split('T')[0]
            : '',
          expectedEndDate: project.expectedEndDate
            ? new Date(project.expectedEndDate).toISOString().split('T')[0]
            : '',
          street: project.address?.street || '',
          number: project.address?.number || '',
          complement: project.address?.complement || '',
          neighborhood: project.address?.neighborhood || '',
          city: project.address?.city || '',
          state: project.address?.state || '',
          zipCode: project.address?.zipCode || '',
        }
      : {
          name: '',
          description: '',
          status: 'PLANNING' as const,
          budget: 0,
          quantidadeUnidades: 1,
          startDate: '',
          expectedEndDate: '',
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
          zipCode: '',
        },
  })

  const mutation = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        status: values.status,
        budget: values.budget,
        quantidadeUnidades: values.quantidadeUnidades,
        startDate: values.startDate
          ? new Date(values.startDate).toISOString()
          : undefined,
        expectedEndDate: values.expectedEndDate
          ? new Date(values.expectedEndDate).toISOString()
          : undefined,
        address: {
          street: values.street,
          number: values.number,
          complement: values.complement || undefined,
          neighborhood: values.neighborhood,
          city: values.city,
          state: values.state,
          zipCode: values.zipCode,
        },
      }

      if (isEdit) {
        return projectsAPI.update(project.id, payload)
      }

      // Create project
      const newProject = await projectsAPI.create(payload)

      // If template selected, apply activities
      if (selectedTemplateKey) {
        const tpl = TEMPLATE_MODELS.find((t) => t.key === selectedTemplateKey)
        if (tpl) {
          const rows = tpl.rows.map((r) => [...r])
          const { phases } = rowsToPhases(rows, true)
          injectSinapiMap(phases, tpl.sinapiMap)

          await projectsAPI.createActivitiesFromHierarchy(newProject.id, {
            phases: phases.map((p) => ({
              name: p.name,
              order: p.order,
              percentageOfTotal: p.percentageOfTotal,
              color: p.color,
              stages: p.stages.map((s) => ({
                name: s.name,
                order: s.order,
                activities: s.activities.map((a) => ({
                  name: a.name,
                  order: a.order,
                  weight: a.weight,
                  durationDays: a.durationDays,
                  dependencies: a.dependencies,
                  sinapiCodigo: a.sinapiCodigo || null,
                  areaTipo: a.areaTipo || null,
                  tags: a.tags || [],
                  padrao: a.padrao ?? true,
                })),
              })),
            })),
          })
        }
      }

      return newProject
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Projeto atualizado!' : 'Projeto criado!')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      handleClose()
      if (!isEdit) {
        navigate('/?phase=1')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleClose = () => {
    setStep(1)
    setSelectedTemplateKey('')
    setPreviewPhases([])
    setExpandedPhases(new Set())
    form.reset()
    onOpenChange(false)
  }

  const handleSelectTemplate = (key: string) => {
    setSelectedTemplateKey(key)
    const tpl = TEMPLATE_MODELS.find((t) => t.key === key)
    if (tpl) {
      const rows = tpl.rows.map((r) => [...r])
      const { phases } = rowsToPhases(rows, true)
      injectSinapiMap(phases, tpl.sinapiMap)
      setPreviewPhases(phases)
      setExpandedPhases(new Set(phases.map((p) => p.name)))
    } else {
      setPreviewPhases([])
    }
  }

  const togglePhase = (name: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  // In edit mode, just show step 1 (no wizard)
  const totalSteps = isEdit ? 1 : 3

  const handleNextStep = async () => {
    if (step === 1) {
      // Validate form before proceeding
      const valid = await form.trigger()
      if (!valid) return
    }
    setStep(step + 1)
  }

  const handleSubmit = () => {
    form.handleSubmit((values) => mutation.mutate(values))()
  }

  const totalActivities = previewPhases.reduce(
    (s, p) => s + p.stages.reduce((ss, st) => ss + st.activities.length, 0),
    0,
  )
  const totalStages = previewPhases.reduce((s, p) => s + p.stages.length, 0)

  const selectedTemplate = TEMPLATE_MODELS.find((t) => t.key === selectedTemplateKey)

  const stepLabels = ['Dados do Projeto', 'Template', 'Revisar e Criar']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações do projeto.'
              : step === 1
              ? 'Preencha as informações do projeto.'
              : step === 2
              ? 'Escolha um template de atividades (opcional).'
              : 'Revise os dados e confirme a criação.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator (create mode only) */}
        {!isEdit && (
          <div className="flex items-center justify-center gap-2">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-medium ${
                      i + 1 < step
                        ? 'bg-primary text-primary-foreground'
                        : i + 1 === step
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-neutral-200 text-neutral-500'
                    }`}
                  >
                    {i + 1 < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-xs ${i + 1 <= step ? 'text-primary font-medium' : 'text-neutral-400'}`}>
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`h-px w-12 mb-5 ${i + 1 < step ? 'bg-primary' : 'bg-neutral-200'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── Step 1: Project data ─── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-700">Informações Básicas</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="name">Nome do Projeto *</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="Ex: Residencial Park"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Descrição do projeto..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.watch('status')}
                    onValueChange={(value) => form.setValue('status', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="budget">Orçamento (R$) *</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    {...form.register('budget')}
                    placeholder="0,00"
                  />
                  {form.formState.errors.budget && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.budget.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="quantidadeUnidades">Quantidade de Unidades</Label>
                  <Input
                    id="quantidadeUnidades"
                    type="number"
                    min={1}
                    max={9999}
                    {...form.register('quantidadeUnidades')}
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Para projetos com múltiplas unidades iguais (ex: condomínio).
                  </p>
                  {form.formState.errors.quantidadeUnidades && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.quantidadeUnidades.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...form.register('startDate')}
                  />
                </div>

                <div>
                  <Label htmlFor="expectedEndDate">Previsão de Conclusão</Label>
                  <Input
                    id="expectedEndDate"
                    type="date"
                    {...form.register('expectedEndDate')}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-700">Endereço</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="street">Rua *</Label>
                  <Input
                    id="street"
                    {...form.register('street')}
                    placeholder="Nome da rua"
                  />
                  {form.formState.errors.street && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.street.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="number">Número *</Label>
                  <Input
                    id="number"
                    {...form.register('number')}
                    placeholder="123"
                  />
                  {form.formState.errors.number && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.number.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    {...form.register('complement')}
                    placeholder="Apto, Sala..."
                  />
                </div>

                <div>
                  <Label htmlFor="neighborhood">Bairro *</Label>
                  <Input
                    id="neighborhood"
                    {...form.register('neighborhood')}
                    placeholder="Nome do bairro"
                  />
                  {form.formState.errors.neighborhood && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.neighborhood.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    {...form.register('city')}
                    placeholder="Nome da cidade"
                  />
                  {form.formState.errors.city && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.city.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="state">UF *</Label>
                  <Input
                    id="state"
                    {...form.register('state')}
                    placeholder="SP"
                    maxLength={2}
                  />
                  {form.formState.errors.state && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.state.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="zipCode">CEP *</Label>
                  <Input
                    id="zipCode"
                    {...form.register('zipCode')}
                    placeholder="00000-000"
                  />
                  {form.formState.errors.zipCode && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.zipCode.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 2: Template selection (create only) ─── */}
        {step === 2 && !isEdit && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Select value={selectedTemplateKey} onValueChange={handleSelectTemplate}>
                <SelectTrigger>
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

              {selectedTemplate && (
                <p className="text-xs text-neutral-500 italic">
                  {selectedTemplate.description}
                </p>
              )}
            </div>

            {/* Template preview */}
            {previewPhases.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-neutral-700">
                    {previewPhases.length} fase(s), {totalStages} etapa(s), {totalActivities} atividade(s)
                  </span>
                </div>

                <div className="max-h-[30vh] overflow-y-auto rounded-lg border">
                  {previewPhases.map((phase) => {
                    const isExpanded = expandedPhases.has(phase.name)
                    return (
                      <div key={phase.name} className="border-b last:border-b-0">
                        <button
                          type="button"
                          onClick={() => togglePhase(phase.name)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-neutral-50"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-neutral-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-neutral-400" />
                          )}
                          {phase.color && (
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: phase.color }}
                            />
                          )}
                          <span className="flex-1 text-sm font-semibold">{phase.name}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {phase.percentageOfTotal}%
                          </Badge>
                        </button>

                        {isExpanded && (
                          <div className="pb-2">
                            {phase.stages.map((stage) => (
                              <div key={stage.name} className="px-4">
                                <p className="py-1.5 pl-7 text-sm font-medium text-neutral-700">
                                  {stage.name}
                                </p>
                                {stage.activities.map((act) => (
                                  <div
                                    key={act.name}
                                    className="flex items-center gap-2 py-1 pl-14 text-sm text-neutral-600"
                                  >
                                    <span className="flex-1">{act.name}</span>
                                    <span className="text-xs text-neutral-400">
                                      Peso: {act.weight}
                                    </span>
                                    {act.durationDays && (
                                      <span className="text-xs text-neutral-400">
                                        {act.durationDays}d
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {!selectedTemplateKey && (
              <div className="rounded-lg border bg-neutral-50 p-6 text-center">
                <p className="text-sm text-neutral-500">
                  Selecione um template acima ou pule este passo para criar sem atividades.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 3: Review & Create ─── */}
        {step === 3 && !isEdit && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="text-sm font-medium text-neutral-700">Dados do Projeto</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-neutral-500">Nome:</span>
                <span className="font-medium">{form.getValues('name')}</span>
                <span className="text-neutral-500">Status:</span>
                <span>{statusLabels[form.getValues('status')]}</span>
                <span className="text-neutral-500">Orçamento:</span>
                <span>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    form.getValues('budget'),
                  )}
                </span>
                {form.getValues('quantidadeUnidades') > 1 && (
                  <>
                    <span className="text-neutral-500">Unidades:</span>
                    <span>{form.getValues('quantidadeUnidades')}</span>
                  </>
                )}
                <span className="text-neutral-500">Endereço:</span>
                <span>
                  {form.getValues('street')}, {form.getValues('number')}
                  {form.getValues('complement') ? ` - ${form.getValues('complement')}` : ''}
                  {' - '}
                  {form.getValues('neighborhood')}, {form.getValues('city')}/{form.getValues('state')}
                </span>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="text-sm font-medium text-neutral-700">Template de Atividades</h4>
              {selectedTemplate ? (
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">{selectedTemplate.label}</span>
                    <span className="text-neutral-500"> — {selectedTemplate.category}</span>
                  </p>
                  <p className="text-xs text-neutral-500">
                    {previewPhases.length} fase(s), {totalStages} etapa(s), {totalActivities} atividade(s)
                  </p>
                </div>
              ) : (
                <p className="text-sm text-neutral-500">
                  Nenhum template selecionado. O projeto será criado sem atividades.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 1 ? (
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
          )}

          <div className="flex-1" />

          {/* In edit mode or last step: submit */}
          {(isEdit || step === totalSteps) ? (
            <Button
              type="button"
              disabled={mutation.isPending}
              onClick={handleSubmit}
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEdit ? 'Salvar' : 'Criar Projeto'}
            </Button>
          ) : (
            <>
              {step === 2 && !selectedTemplateKey && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(3)}
                >
                  Pular
                </Button>
              )}
              <Button type="button" onClick={handleNextStep}>
                Próximo
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
