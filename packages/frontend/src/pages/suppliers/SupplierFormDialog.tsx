import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { suppliersAPI } from '@/lib/api-client'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

const supplierFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  document: z.string().min(1, 'Documento é obrigatório'),
  type: z.enum(['MATERIALS', 'SERVICES', 'BOTH'], { required_error: 'Tipo é obrigatório' }),
  rating: z.coerce
    .number()
    .min(0, 'Avaliação mínima é 0')
    .max(5, 'Avaliação máxima é 5')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
})

type SupplierFormValues = z.infer<typeof supplierFormSchema>

interface SupplierFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier?: any
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
}: SupplierFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!supplier

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: supplier
      ? {
          name: supplier.name,
          document: supplier.document,
          type: supplier.type,
          rating: supplier.rating ?? '',
          phone: supplier.contacts?.phone || '',
          email: supplier.contacts?.email || '',
          address: supplier.contacts?.address || '',
          contactPerson: supplier.contacts?.contactPerson || '',
        }
      : {
          name: '',
          document: '',
          type: undefined as any,
          rating: '',
          phone: '',
          email: '',
          address: '',
          contactPerson: '',
        },
  })

  const mutation = useMutation({
    mutationFn: async (values: SupplierFormValues) => {
      const payload: any = {
        name: values.name,
        document: values.document.replace(/\D/g, ''),
        type: values.type,
        rating:
          values.rating !== '' && values.rating !== undefined
            ? Number(values.rating)
            : undefined,
        contacts: {
          phone: values.phone || undefined,
          email: values.email || undefined,
          address: values.address || undefined,
          contactPerson: values.contactPerson || undefined,
        },
      }

      if (isEdit) {
        return suppliersAPI.update(supplier.id, payload)
      }
      return suppliersAPI.create(payload)
    },
    onSuccess: () => {
      toast.success(
        isEdit ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!'
      )
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      if (isEdit) {
        queryClient.invalidateQueries({
          queryKey: ['supplier', supplier.id],
        })
      }
      onOpenChange(false)
      form.reset()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (values: SupplierFormValues) => {
    mutation.mutate(values)
  }

  const typeLabels: Record<string, string> = {
    MATERIALS: 'Materiais',
    SERVICES: 'Serviços',
    BOTH: 'Ambos',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações do fornecedor.'
              : 'Preencha as informações para cadastrar um novo fornecedor.'}
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
                  placeholder="Nome do fornecedor"
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
                  placeholder="00.000.000/0001-00"
                />
                {form.formState.errors.document && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.document.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={form.watch('type')}
                  onValueChange={(value) => form.setValue('type', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.type && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.type.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="rating">Avaliação (0-5)</Label>
                <Input
                  id="rating"
                  type="number"
                  min={0}
                  max={5}
                  step={0.5}
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
                <Label htmlFor="contactPerson">Pessoa de Contato</Label>
                <Input
                  id="contactPerson"
                  {...form.register('contactPerson')}
                  placeholder="Nome da pessoa de contato"
                />
              </div>

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

              <div>
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
              {isEdit ? 'Salvar' : 'Cadastrar Fornecedor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
