import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { contractorsAPI } from '@/lib/api-client'
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
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'

const contractorFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  document: z.string().min(1, 'Documento é obrigatório'),
  specialties: z.string().optional(),
  teamSize: z.coerce.number().int().min(0).optional().or(z.literal('')),
  rating: z.coerce
    .number()
    .min(0, 'Avaliação mínima é 0')
    .max(5, 'Avaliação máxima é 5')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  address: z.string().optional(),
})

type ContractorFormValues = z.infer<typeof contractorFormSchema>

interface ContractorFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractor?: any // existing contractor for edit mode
}

export function ContractorFormDialog({
  open,
  onOpenChange,
  contractor,
}: ContractorFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!contractor

  const form = useForm<ContractorFormValues>({
    resolver: zodResolver(contractorFormSchema),
    defaultValues: contractor
      ? {
          name: contractor.name,
          document: contractor.document,
          specialties: contractor.specialties
            ? contractor.specialties.join(', ')
            : '',
          teamSize: contractor.teamSize ?? '',
          rating: contractor.rating ?? '',
          phone: contractor.contacts?.phone || '',
          email: contractor.contacts?.email || '',
          address: contractor.contacts?.address || '',
        }
      : {
          name: '',
          document: '',
          specialties: '',
          teamSize: '',
          rating: '',
          phone: '',
          email: '',
          address: '',
        },
  })

  const mutation = useMutation({
    mutationFn: async (values: ContractorFormValues) => {
      const specialtiesArray = values.specialties
        ? values.specialties
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : []

      const payload: any = {
        name: values.name,
        document: values.document,
        specialties: specialtiesArray,
        teamSize:
          values.teamSize !== '' && values.teamSize !== undefined
            ? Number(values.teamSize)
            : undefined,
        rating:
          values.rating !== '' && values.rating !== undefined
            ? Number(values.rating)
            : undefined,
        contacts: {
          phone: values.phone || undefined,
          email: values.email || undefined,
          address: values.address || undefined,
        },
      }

      if (isEdit) {
        return contractorsAPI.update(contractor.id, payload)
      }
      return contractorsAPI.create(payload)
    },
    onSuccess: () => {
      toast.success(
        isEdit ? 'Empreiteiro atualizado!' : 'Empreiteiro cadastrado!'
      )
      queryClient.invalidateQueries({ queryKey: ['contractors'] })
      if (isEdit) {
        queryClient.invalidateQueries({
          queryKey: ['contractor', contractor.id],
        })
      }
      onOpenChange(false)
      form.reset()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (values: ContractorFormValues) => {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Empreiteiro' : 'Novo Empreiteiro'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações do empreiteiro.'
              : 'Preencha as informações para cadastrar um novo empreiteiro.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-neutral-700">
              Informações Básicas
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Nome do empreiteiro"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="document">Documento (CPF/CNPJ) *</Label>
                <Input
                  id="document"
                  {...form.register('document')}
                  placeholder="000.000.000-00"
                />
                {form.formState.errors.document && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.document.message}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="specialties">
                  Especialidades (separadas por vírgula)
                </Label>
                <Input
                  id="specialties"
                  {...form.register('specialties')}
                  placeholder="Alvenaria, Elétrica, Hidráulica"
                />
              </div>

              <div>
                <Label htmlFor="teamSize">Tamanho da Equipe</Label>
                <Input
                  id="teamSize"
                  type="number"
                  min={0}
                  {...form.register('teamSize')}
                  placeholder="Ex: 10"
                />
              </div>

              <div>
                <Label htmlFor="rating">Avaliação (0-5)</Label>
                <Input
                  id="rating"
                  type="number"
                  min={0}
                  max={5}
                  step={1}
                  {...form.register('rating')}
                  placeholder="0 a 5"
                />
                {form.formState.errors.rating && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.rating.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Contacts */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-neutral-700">Contato</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  {...form.register('phone')}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="email@exemplo.com"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  {...form.register('address')}
                  placeholder="Endereço completo"
                />
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
              {isEdit ? 'Salvar' : 'Cadastrar Empreiteiro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
