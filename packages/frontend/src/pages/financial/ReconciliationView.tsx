import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { financialAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Link as LinkIcon,
  X,
  Loader2,
  CheckCircle,
  ChevronRight,
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

const ENTITY_TYPE_LABELS: Record<string, string> = {
  supplier: 'Fornecedor',
  contractor: 'Empreiteiro',
  purchase: 'Ordem de Compra',
  contract: 'Contrato',
}

export function ReconciliationView() {
  const canEdit = usePermission('financial:edit')
  const queryClient = useQueryClient()
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)

  const { data: pendingTx, isLoading } = useQuery({
    queryKey: ['financial', 'reconciliation', 'pending'],
    queryFn: () => financialAPI.getPendingReconciliation(),
  })

  const { data: suggestions, isLoading: loadingSuggestions } = useQuery({
    queryKey: ['financial', 'reconciliation', 'suggestions', selectedTxId],
    queryFn: () => financialAPI.getSuggestions(selectedTxId!),
    enabled: !!selectedTxId,
  })

  const matchMutation = useMutation({
    mutationFn: (data: { transactionId: string; linkedEntityType: string; linkedEntityId: string; linkedEntityName: string }) =>
      financialAPI.matchTransaction(data),
    onSuccess: () => {
      toast.success('Transação vinculada!')
      queryClient.invalidateQueries({ queryKey: ['financial'] })
      setSelectedTxId(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const ignoreMutation = useMutation({
    mutationFn: (id: string) => financialAPI.ignoreTransaction(id),
    onSuccess: () => {
      toast.success('Transação ignorada.')
      queryClient.invalidateQueries({ queryKey: ['financial'] })
      setSelectedTxId(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const transactions = (pendingTx as any[]) || []
  const suggestionList = (suggestions as any[]) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-16">
        <CheckCircle className="h-16 w-16 text-green-400" />
        <h3 className="mt-4 text-lg font-medium text-neutral-900">Tudo conciliado!</h3>
        <p className="mt-2 text-neutral-500">
          Não há transações importadas pendentes de conciliação.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Pending transactions */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide">
          Transações Pendentes ({transactions.length})
        </h3>
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
          {transactions.map((tx: any) => (
            <Card
              key={tx.id}
              className={`cursor-pointer transition-all ${
                selectedTxId === tx.id
                  ? 'ring-2 ring-primary shadow-md'
                  : 'hover:shadow-sm'
              }`}
              onClick={() => setSelectedTxId(tx.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {tx.type === 'INCOME' ? (
                      <ArrowUpCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <ArrowDownCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {tx.rawDescription || tx.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-neutral-500">{formatDate(tx.date)}</span>
                        {tx.bankAccount && (
                          <span className="text-xs text-neutral-400">{tx.bankAccount.bankName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <p className={`text-sm font-bold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                </div>
                {selectedTxId === tx.id && (
                  <div className="mt-2 flex justify-end">
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Right: Suggestions */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide">
          {selectedTxId ? 'Sugestões de Vínculo' : 'Selecione uma transação'}
        </h3>

        {!selectedTxId ? (
          <div className="flex items-center justify-center rounded-lg border bg-neutral-50 p-16">
            <p className="text-neutral-400">Clique em uma transação à esquerda para ver sugestões.</p>
          </div>
        ) : loadingSuggestions ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {suggestionList.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-neutral-500">Nenhuma sugestão encontrada para esta transação.</p>
                  <p className="text-sm text-neutral-400 mt-1">
                    Você pode ignorar esta transação ou vinculá-la manualmente mais tarde.
                  </p>
                </CardContent>
              </Card>
            ) : (
              suggestionList.map((suggestion: any, index: number) => (
                <Card key={index} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {ENTITY_TYPE_LABELS[suggestion.entityType] || suggestion.entityType}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              suggestion.confidence >= 80
                                ? 'border-green-300 text-green-700'
                                : suggestion.confidence >= 50
                                ? 'border-amber-300 text-amber-700'
                                : 'border-neutral-300 text-neutral-600'
                            }`}
                          >
                            {suggestion.confidence}%
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm font-medium text-neutral-900">{suggestion.entityName}</p>
                        <p className="text-xs text-neutral-500 mt-1">{suggestion.reason}</p>
                      </div>
                      {canEdit && (
                        <Button
                          size="sm"
                          onClick={() =>
                            matchMutation.mutate({
                              transactionId: selectedTxId!,
                              linkedEntityType: suggestion.entityType,
                              linkedEntityId: suggestion.entityId,
                              linkedEntityName: suggestion.entityName,
                            })
                          }
                          disabled={matchMutation.isPending}
                        >
                          <LinkIcon className="mr-1 h-3.5 w-3.5" />
                          Vincular
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {/* Ignore button */}
            {canEdit && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => ignoreMutation.mutate(selectedTxId!)}
                disabled={ignoreMutation.isPending}
              >
                <X className="mr-2 h-4 w-4" />
                Ignorar esta Transação
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
