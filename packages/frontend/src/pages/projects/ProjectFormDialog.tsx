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
import {
  Loader2,
  Building2,
  MapPin,
  CalendarDays,
  FileText,
} from 'lucide-react'

const projectFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  budget: z.coerce.number().optional(),
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

export function ProjectFormDialog({ open, onOpenChange, project }: ProjectFormDialogProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isEdit = !!project

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: project
      ? {
          name: project.name,
          description: project.description || '',
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
      const payload: any = {
        name: values.name,
        description: values.description || undefined,
        budget: values.budget || undefined,
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
    form.reset()
    onOpenChange(false)
  }

  const handleSubmit = () => {
    form.handleSubmit((values) => mutation.mutate(values))()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header with gradient background */}
        <div className="relative overflow-hidden rounded-t-lg bg-gradient-to-br from-[#b8a378]/10 via-amber-50/50 to-white px-6 pt-6 pb-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#b8a378]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-[#b8a378]/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#b8a378]/15">
                <Building2 className="h-5 w-5 text-[#b8a378]" />
              </div>
              <div>
                <DialogTitle className="text-lg">{isEdit ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
                <DialogDescription className="mt-0.5">
                  {isEdit
                    ? 'Atualize as informações do projeto.'
                    : 'Preencha as informações para criar o projeto.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-2 space-y-6">
          {/* ─── Informações Básicas ─── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#b8a378]" />
              <h3 className="text-sm font-semibold text-neutral-700">Informações Básicas</h3>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 space-y-4">
              {/* Nome — full width */}
              <div>
                <Label htmlFor="name">Nome do Projeto *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Ex: Residencial Park"
                  className="mt-1.5 bg-white"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              {/* Descrição — full width */}
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Breve descrição do projeto..."
                  rows={2}
                  className="mt-1.5 bg-white resize-none"
                />
              </div>

              {/* Data Início | Previsão — 2 colunas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startDate" className="flex items-center gap-1.5">
                    <CalendarDays className="h-3 w-3 text-neutral-400" />
                    Início
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...form.register('startDate')}
                    className="mt-1.5 bg-white"
                  />
                </div>

                <div>
                  <Label htmlFor="expectedEndDate" className="flex items-center gap-1.5">
                    <CalendarDays className="h-3 w-3 text-neutral-400" />
                    Previsão
                  </Label>
                  <Input
                    id="expectedEndDate"
                    type="date"
                    {...form.register('expectedEndDate')}
                    className="mt-1.5 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ─── Endereço ─── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#b8a378]" />
              <h3 className="text-sm font-semibold text-neutral-700">Endereço</h3>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 space-y-4">
              {/* Rua | Número — 3:1 */}
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <Label htmlFor="street">Rua *</Label>
                  <Input
                    id="street"
                    {...form.register('street')}
                    placeholder="Nome da rua"
                    className="mt-1.5 bg-white"
                  />
                  {form.formState.errors.street && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.street.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="number">Nº *</Label>
                  <Input
                    id="number"
                    {...form.register('number')}
                    placeholder="123"
                    className="mt-1.5 bg-white"
                  />
                  {form.formState.errors.number && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.number.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Complemento | Bairro — 1:1 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    {...form.register('complement')}
                    placeholder="Apto, Sala..."
                    className="mt-1.5 bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="neighborhood">Bairro *</Label>
                  <Input
                    id="neighborhood"
                    {...form.register('neighborhood')}
                    placeholder="Nome do bairro"
                    className="mt-1.5 bg-white"
                  />
                  {form.formState.errors.neighborhood && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.neighborhood.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Cidade | UF | CEP — 5:1:2 */}
              <div className="grid grid-cols-8 gap-3">
                <div className="col-span-4">
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    {...form.register('city')}
                    placeholder="Nome da cidade"
                    className="mt-1.5 bg-white"
                  />
                  {form.formState.errors.city && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.city.message}
                    </p>
                  )}
                </div>
                <div className="col-span-1">
                  <Label htmlFor="state">UF *</Label>
                  <Input
                    id="state"
                    {...form.register('state')}
                    placeholder="SP"
                    maxLength={2}
                    className="mt-1.5 bg-white text-center"
                  />
                  {form.formState.errors.state && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.state.message}
                    </p>
                  )}
                </div>
                <div className="col-span-3">
                  <Label htmlFor="zipCode">CEP *</Label>
                  <Input
                    id="zipCode"
                    {...form.register('zipCode')}
                    placeholder="00000-000"
                    className="mt-1.5 bg-white"
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
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-neutral-50/80 gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <div className="flex-1" />
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
