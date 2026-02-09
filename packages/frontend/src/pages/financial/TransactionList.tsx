import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { financialAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TransactionFormDialog } from './TransactionFormDialog'
import {
  Plus,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR')
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

const RECONCILIATION_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  AUTO_MATCHED: 'Auto',
  MANUAL_MATCHED: 'Manual',
  IGNORED: 'Ignorado',
}

export function TransactionList() {
  const canCreate = usePermission('financial:create')
  const canEdit = usePermission('financial:edit')
  const canDelete = usePermission('financial:delete')
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['financial', 'transactions', { page, search, type: typeFilter, status: statusFilter, dateFrom, dateTo }],
    queryFn: () =>
      financialAPI.listTransactions({
        page,
        limit: 20,
        search: search || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financialAPI.deleteTransaction(id),
    onSuccess: () => {
      toast.success('Transação removida!')
      queryClient.invalidateQueries({ queryKey: ['financial'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const transactions = (data as any)?.data || []
  const pagination = (data as any)?.pagination || { page: 1, totalPages: 1, total: 0 }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Buscar por descrição..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Buscar
          </Button>
        </form>

        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === 'ALL' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="INCOME">Receitas</SelectItem>
              <SelectItem value="EXPENSE">Despesas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'ALL' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="COMPLETED">Concluído</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="CANCELLED">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="w-[140px]"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="w-[140px]"
          />
        </div>

        {canCreate && (
          <Button onClick={() => { setEditingTransaction(null); setShowFormDialog(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-16">
          <h3 className="text-lg font-medium text-neutral-900">Nenhuma transação encontrada</h3>
          <p className="mt-2 text-neutral-500">
            {search ? 'Tente ajustar os filtros.' : 'Registre sua primeira transação ou importe um extrato.'}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Conciliação</TableHead>
                  {(canEdit || canDelete) && <TableHead className="text-right w-[100px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">{formatDate(tx.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {tx.type === 'INCOME' ? (
                          <ArrowUpCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <span className="text-sm line-clamp-1">{tx.description}</span>
                      </div>
                      {tx.linkedEntityName && (
                        <p className="text-xs text-primary ml-6">{tx.linkedEntityName}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-600">{tx.category}</TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {tx.bankAccount?.bankName || '-'}
                    </TableCell>
                    <TableCell className={`text-right text-sm font-medium ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={tx.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-xs">
                        {STATUS_LABELS[tx.status] || tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          tx.reconciliationStatus === 'AUTO_MATCHED' || tx.reconciliationStatus === 'MANUAL_MATCHED'
                            ? 'border-green-300 text-green-700'
                            : tx.reconciliationStatus === 'IGNORED'
                            ? 'border-neutral-300 text-neutral-500'
                            : 'border-amber-300 text-amber-700'
                        }`}
                      >
                        {RECONCILIATION_LABELS[tx.reconciliationStatus] || tx.reconciliationStatus}
                      </Badge>
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEditingTransaction(tx); setShowFormDialog(true) }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Remover esta transação?')) {
                                  deleteMutation.mutate(tx.id)
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                Mostrando {transactions.length} de {pagination.total} transações
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-sm text-neutral-600">
                  {page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <TransactionFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        transaction={editingTransaction}
      />
    </div>
  )
}
