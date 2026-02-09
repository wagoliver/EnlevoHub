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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

const projectFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']),
  budget: z.coerce.number().positive('Orçamento deve ser positivo'),
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
  const isEdit = !!project

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: project
      ? {
          name: project.name,
          description: project.description || '',
          status: project.status,
          budget: project.budget,
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
      return projectsAPI.create(payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Projeto atualizado!' : 'Projeto criado!')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      onOpenChange(false)
      form.reset()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (values: ProjectFormValues) => {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações do projeto.'
              : 'Preencha as informações para criar um novo projeto.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
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

          {/* Address */}
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEdit ? 'Salvar' : 'Criar Projeto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
