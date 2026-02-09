import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { financialAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BankAccountFormDialog } from './BankAccountFormDialog'
import { ImportDialog } from './ImportDialog'
import {
  Plus,
  Landmark,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  FileText,
} from 'lucide-react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING: 'Corrente',
  SAVINGS: 'Poupança',
}

export function BankAccountList() {
  const canCreate = usePermission('financial:create')
  const canEdit = usePermission('financial:edit')
  const canDelete = usePermission('financial:delete')
  const queryClient = useQueryClient()

  const [showFormDialog, setShowFormDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [editingAccount, setEditingAccount] = useState<any>(null)

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['financial', 'accounts'],
    queryFn: () => financialAPI.listAccounts(),
  })

  const { data: imports, isLoading: loadingImports } = useQuery({
    queryKey: ['financial', 'imports'],
    queryFn: () => financialAPI.listImports(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financialAPI.deleteAccount(id),
    onSuccess: () => {
      toast.success('Conta removida!')
      queryClient.invalidateQueries({ queryKey: ['financial'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteImportMutation = useMutation({
    mutationFn: (id: string) => financialAPI.deleteImportBatch(id),
    onSuccess: () => {
      toast.success('Importação e transações removidas!')
      queryClient.invalidateQueries({ queryKey: ['financial'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const accountList = (accounts as any[]) || []
  const importList = (imports as any[]) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          Gerencie suas contas bancárias e importe extratos.
        </p>
        <div className="flex gap-2">
          {canCreate && (
            <>
              <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Importar Extrato
              </Button>
              <Button onClick={() => { setEditingAccount(null); setShowFormDialog(true) }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Accounts */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : accountList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-16">
          <Landmark className="h-16 w-16 text-neutral-300" />
          <h3 className="mt-4 text-lg font-medium text-neutral-900">Nenhuma conta cadastrada</h3>
          <p className="mt-2 text-neutral-500">Cadastre sua primeira conta bancária.</p>
          {canCreate && (
            <Button className="mt-6" onClick={() => setShowFormDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Conta
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accountList.map((account: any) => (
            <Card key={account.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{account.bankName}</CardTitle>
                  </div>
                  <Badge variant={account.isActive ? 'default' : 'secondary'}>
                    {account.isActive ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-neutral-500">
                  {account.agency && <span>Ag: {account.agency} | </span>}
                  Conta: {account.accountNumber}
                  {account.accountType && (
                    <span> | {ACCOUNT_TYPE_LABELS[account.accountType] || account.accountType}</span>
                  )}
                </div>

                <div>
                  <p className="text-xs text-neutral-400">Saldo</p>
                  <p className={`text-lg font-bold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(account.balance)}
                  </p>
                </div>

                {account._count && (
                  <div className="flex gap-4 text-xs text-neutral-500">
                    <span>{account._count.transactions} transações</span>
                    <span>{account._count.importBatches} importações</span>
                  </div>
                )}

                {(canEdit || canDelete) && (
                  <div className="flex gap-2 pt-2">
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => { setEditingAccount(account); setShowFormDialog(true) }}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Editar
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Remover esta conta bancária?')) {
                            deleteMutation.mutate(account.id)
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Import History */}
      {importList.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900">Histórico de Importações</h3>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-center">Formato</TableHead>
                    <TableHead className="text-center">Importadas</TableHead>
                    <TableHead className="text-center">Duplicadas</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Importado por</TableHead>
                    <TableHead>Data</TableHead>
                    {canDelete && <TableHead className="text-right w-[80px]">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importList.map((batch: any) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-neutral-400" />
                          <span className="text-sm">{batch.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-neutral-600">
                        {batch.bankAccount?.bankName} - {batch.bankAccount?.accountNumber}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">{batch.fileType}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm font-medium text-green-600">
                        {batch.importedCount}
                      </TableCell>
                      <TableCell className="text-center text-sm text-neutral-500">
                        {batch.duplicateCount}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-500">
                        {batch.periodStart && batch.periodEnd
                          ? `${new Date(batch.periodStart).toLocaleDateString('pt-BR')} - ${new Date(batch.periodEnd).toLocaleDateString('pt-BR')}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-sm text-neutral-500">
                        {batch.user?.name || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-500">
                        {formatDate(batch.createdAt)}
                      </TableCell>
                      {canDelete && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deleteImportMutation.isPending}
                            onClick={() => {
                              if (confirm(`Excluir esta importação?\n\nArquivo: ${batch.fileName}\nTransações: ${batch.importedCount}\n\nTodas as ${batch.importedCount} transações importadas serão removidas.`)) {
                                deleteImportMutation.mutate(batch.id)
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {loadingImports && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      )}

      <BankAccountFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        account={editingAccount}
      />

      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />
    </div>
  )
}
