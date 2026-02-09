import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

const transactionFormSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().min(1, 'Categoria é obrigatória'),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  date: z.string().min(1, 'Data é obrigatória'),
  bankAccountId: z.string().optional(),
  paymentMethod: z.string().optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
})

type TransactionFormValues = z.infer<typeof transactionFormSchema>

const CATEGORIES = {
  INCOME: [
    'Venda de Unidade',
    'Receita de Aluguel',
    'Aporte de Capital',
    'Empréstimo Recebido',
    'Outras Receitas',
  ],
  EXPENSE: [
    'Material de Construção',
    'Mão de Obra',
    'Empreiteiro',
    'Equipamentos',
    'Taxas e Impostos',
    'Energia e Água',
    'Transporte',
    'Administrativo',
    'Outras Despesas',
  ],
}

interface TransactionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: any
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!transaction

  const { data: accounts } = useQuery({
    queryKey: ['financial', 'accounts'],
    queryFn: () => financialAPI.listAccounts(),
    enabled: open,
  })

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: 'EXPENSE',
      category: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      bankAccountId: '',
      paymentMethod: '',
      description: '',
      status: 'COMPLETED',
    },
  })

  const watchType = form.watch('type')

  useEffect(() => {
    if (open) {
      if (transaction) {
        form.reset({
          type: transaction.type,
          category: transaction.category,
          amount: transaction.amount,
          date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : '',
          bankAccountId: transaction.bankAccountId || '',
          paymentMethod: transaction.paymentMethod || '',
          description: transaction.description,
          status: transaction.status,
        })
      } else {
        form.reset({
          type: 'EXPENSE',
          category: '',
          amount: 0,
          date: new Date().toISOString().split('T')[0],
          bankAccountId: '',
          paymentMethod: '',
          description: '',
          status: 'COMPLETED',
        })
      }
    }
  }, [open, transaction, form])

  const mutation = useMutation({
    mutationFn: async (values: TransactionFormValues) => {
      const payload = {
        type: values.type,
        category: values.category,
        amount: values.amount,
        date: values.date,
        bankAccountId: values.bankAccountId || undefined,
        paymentMethod: values.paymentMethod || undefined,
        description: values.description,
        status: values.status,
      }
      if (isEdit) {
        return financialAPI.updateTransaction(transaction.id, payload)
      }
      return financialAPI.createTransaction(payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Transação atualizada!' : 'Transação criada!')
      queryClient.invalidateQueries({ queryKey: ['financial'] })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (values: TransactionFormValues) => {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize os dados da transação.' : 'Registre uma nova receita ou despesa.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(v) => {
                  form.setValue('type', v as 'INCOME' | 'EXPENSE')
                  form.setValue('category', '')
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Receita</SelectItem>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={form.watch('category')}
                onValueChange={(v) => form.setValue('category', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES[watchType].map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.category && (
                <p className="text-sm text-red-500">{form.formState.errors.category.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                {...form.register('amount')}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                {...form.register('date')}
              />
              {form.formState.errors.date && (
                <p className="text-sm text-red-500">{form.formState.errors.date.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Conta Bancária</Label>
              <Select
                value={form.watch('bankAccountId') || ''}
                onValueChange={(v) => form.setValue('bankAccountId', v === 'NONE' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Nenhuma</SelectItem>
                  {(accounts as any[] || []).map((acc: any) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.bankName} - {acc.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Método de Pagamento</Label>
              <Select
                value={form.watch('paymentMethod') || ''}
                onValueChange={(v) => form.setValue('paymentMethod', v === 'NONE' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Não informado</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="TED">TED</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              placeholder="Descreva a transação..."
              rows={3}
              {...form.register('description')}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.watch('status') || 'COMPLETED'}
              onValueChange={(v) => form.setValue('status', v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPLETED">Concluído</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="CANCELLED">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar Transação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
