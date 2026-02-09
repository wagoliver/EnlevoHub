import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { financialAPI } from '@/lib/api-client'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

const bankAccountFormSchema = z.object({
  bankName: z.string().min(2, 'Nome do banco é obrigatório'),
  accountNumber: z.string().min(1, 'Número da conta é obrigatório'),
  bankCode: z.string().optional(),
  agency: z.string().optional(),
  accountType: z.string().optional(),
  balance: z.coerce.number().default(0),
})

type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>

interface BankAccountFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: any
}

export function BankAccountFormDialog({
  open,
  onOpenChange,
  account,
}: BankAccountFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!account

  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountFormSchema),
    defaultValues: {
      bankName: '',
      accountNumber: '',
      bankCode: '',
      agency: '',
      accountType: '',
      balance: 0,
    },
  })

  useEffect(() => {
    if (open) {
      if (account) {
        form.reset({
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          bankCode: account.bankCode || '',
          agency: account.agency || '',
          accountType: account.accountType || '',
          balance: account.balance || 0,
        })
      } else {
        form.reset({
          bankName: '',
          accountNumber: '',
          bankCode: '',
          agency: '',
          accountType: '',
          balance: 0,
        })
      }
    }
  }, [open, account, form])

  const mutation = useMutation({
    mutationFn: async (values: BankAccountFormValues) => {
      const payload = {
        bankName: values.bankName,
        accountNumber: values.accountNumber,
        bankCode: values.bankCode || undefined,
        agency: values.agency || undefined,
        accountType: values.accountType || undefined,
        balance: values.balance,
      }
      if (isEdit) {
        return financialAPI.updateAccount(account.id, payload)
      }
      return financialAPI.createAccount(payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Conta atualizada com sucesso!' : 'Conta criada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['financial'] })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (values: BankAccountFormValues) => {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize os dados da conta bancária.' : 'Preencha os dados da nova conta bancária.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">Nome do Banco *</Label>
            <Input
              id="bankName"
              placeholder="Ex: Banco do Brasil, Itaú..."
              {...form.register('bankName')}
            />
            {form.formState.errors.bankName && (
              <p className="text-sm text-red-500">{form.formState.errors.bankName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankCode">Código do Banco</Label>
              <Input
                id="bankCode"
                placeholder="Ex: 001, 341..."
                {...form.register('bankCode')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agency">Agência</Label>
              <Input
                id="agency"
                placeholder="Ex: 1234"
                {...form.register('agency')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Número da Conta *</Label>
              <Input
                id="accountNumber"
                placeholder="Ex: 12345-6"
                {...form.register('accountNumber')}
              />
              {form.formState.errors.accountNumber && (
                <p className="text-sm text-red-500">{form.formState.errors.accountNumber.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountType">Tipo de Conta</Label>
              <Select
                value={form.watch('accountType') || ''}
                onValueChange={(v) => form.setValue('accountType', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHECKING">Corrente</SelectItem>
                  <SelectItem value="SAVINGS">Poupança</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">Saldo Inicial (R$)</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              {...form.register('balance')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar Conta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
