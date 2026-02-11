import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { brokersAPI } from '@/lib/api-client'
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

const brokerFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  document: z.string().min(11, 'CPF é obrigatório'),
  creci: z.string().optional(),
  commissionRate: z.coerce
    .number()
    .min(0, 'Mínimo 0')
    .max(100, 'Máximo 100'),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  loginEmail: z.string().email('E-mail inválido').optional().or(z.literal('')),
  loginPassword: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional().or(z.literal('')),
})

type BrokerFormValues = z.infer<typeof brokerFormSchema>

interface BrokerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  broker?: any
}

export function BrokerFormDialog({
  open,
  onOpenChange,
  broker,
}: BrokerFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!broker

  const form = useForm<BrokerFormValues>({
    resolver: zodResolver(brokerFormSchema),
    defaultValues: broker
      ? {
          name: broker.name,
          document: broker.document,
          creci: broker.creci || '',
          commissionRate: broker.commissionRate ?? 0,
          phone: broker.contacts?.phone || '',
          email: broker.contacts?.email || '',
          address: broker.contacts?.address || '',
        }
      : {
          name: '',
          document: '',
          creci: '',
          commissionRate: 0,
          phone: '',
          email: '',
          address: '',
          loginEmail: '',
          loginPassword: '',
        },
  })

  const mutation = useMutation({
    mutationFn: async (values: BrokerFormValues) => {
      const payload: any = {
        name: values.name,
        document: values.document,
        creci: values.creci || undefined,
        commissionRate: Number(values.commissionRate),
        contacts: {
          phone: values.phone || undefined,
          email: values.email || undefined,
          address: values.address || undefined,
        },
      }

      if (isEdit) {
        return brokersAPI.update(broker.id, payload)
      }

      if (values.loginEmail && values.loginPassword) {
        payload.loginEmail = values.loginEmail
        payload.loginPassword = values.loginPassword
      }

      return brokersAPI.create(payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Corretor atualizado!' : 'Corretor cadastrado!')
      queryClient.invalidateQueries({ queryKey: ['brokers'] })
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['broker', broker.id] })
      }
      onOpenChange(false)
      form.reset()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (values: BrokerFormValues) => {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Corretor' : 'Novo Corretor'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações do corretor.'
              : 'Preencha as informações para cadastrar um novo corretor.'}
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
                  placeholder="Nome do corretor"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="document">CPF *</Label>
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

              <div>
                <Label htmlFor="creci">CRECI</Label>
                <Input
                  id="creci"
                  {...form.register('creci')}
                  placeholder="Ex: 12345-F"
                />
              </div>

              <div>
                <Label htmlFor="commissionRate">Comissão (%) *</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  {...form.register('commissionRate')}
                  placeholder="Ex: 5.00"
                />
                {form.formState.errors.commissionRate && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.commissionRate.message}
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

          {/* Login Credentials (create only) */}
          {!isEdit && (
            <>
              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-neutral-700">
                  Acesso ao Sistema
                </h3>
                <p className="text-xs text-neutral-500">
                  Preencha para criar um login para o corretor acessar a plataforma.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="loginEmail">E-mail de Acesso</Label>
                    <Input
                      id="loginEmail"
                      type="email"
                      {...form.register('loginEmail')}
                      placeholder="login@exemplo.com"
                    />
                    {form.formState.errors.loginEmail && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.loginEmail.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="loginPassword">Senha</Label>
                    <Input
                      id="loginPassword"
                      type="password"
                      {...form.register('loginPassword')}
                      placeholder="Mínimo 6 caracteres"
                    />
                    {form.formState.errors.loginPassword && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.loginPassword.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

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
              {isEdit ? 'Salvar' : 'Cadastrar Corretor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
