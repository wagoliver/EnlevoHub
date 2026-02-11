import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { financialAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Link as LinkIcon,
  X,
  Loader2,
  CheckCircle,
  ChevronRight,
  Search,
  RefreshCw,
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

const STATUS_STYLES: Record<string, { bg: string; border: string; badge: string; badgeLabel: string }> = {
  PENDING: {
    bg: '',
    border: '',
    badge: 'border-amber-300 text-amber-700 bg-amber-50',
    badgeLabel: 'Pendente',
  },
  AUTO_MATCHED: {
    bg: 'bg-green-50/50',
    border: 'border-green-200',
    badge: 'border-green-300 text-green-700 bg-green-50',
    badgeLabel: 'Auto',
  },
  MANUAL_MATCHED: {
    bg: 'bg-blue-50/50',
    border: 'border-blue-200',
    badge: 'border-blue-300 text-blue-700 bg-blue-50',
    badgeLabel: 'Manual',
  },
  IGNORED: {
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    badge: 'border-neutral-300 text-neutral-500 bg-neutral-50',
    badgeLabel: 'Ignorado',
  },
}

export function ReconciliationView() {
  const canEdit = usePermission('financial:edit')
  const queryClient = useQueryClient()
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)
  const [manualSearch, setManualSearch] = useState('')
  const [manualSearchQuery, setManualSearchQuery] = useState('')
  const [filter, setFilter] = useState('PENDING')

  const { data: allTx, isLoading } = useQuery({
    queryKey: ['financial', 'reconciliation', 'pending', filter],
    queryFn: () => financialAPI.getPendingReconciliation(filter),
  })

  const { data: suggestions, isLoading: loadingSuggestions } = useQuery({
    queryKey: ['financial', 'reconciliation', 'suggestions', selectedTxId],
    queryFn: () => financialAPI.getSuggestions(selectedTxId!),
    enabled: !!selectedTxId,
  })

  const { data: searchResults, isLoading: loadingSearch } = useQuery({
    queryKey: ['financial', 'reconciliation', 'search', manualSearchQuery],
    queryFn: () => financialAPI.searchEntities(manualSearchQuery),
    enabled: manualSearchQuery.length >= 2,
  })

  const matchMutation = useMutation({
    mutationFn: (data: { transactionId: string; linkedEntityType: string; linkedEntityId: string; linkedEntityName: string }) =>
      financialAPI.matchTransaction(data),
    onSuccess: () => {
      toast.success('Transação vinculada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['financial'] })
      setSelectedTxId(null)
      setManualSearch('')
      setManualSearchQuery('')
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

  const unlinkMutation = useMutation({
    mutationFn: (id: string) => financialAPI.unlinkTransaction(id),
    onSuccess: () => {
      toast.success('Transação desvinculada. Agora pode re-conciliar.')
      queryClient.invalidateQueries({ queryKey: ['financial'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const rerunMutation = useMutation({
    mutationFn: () => financialAPI.rerunReconciliation(),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['financial'] })
      setSelectedTxId(null)
      if (data.matched > 0) {
        toast.success(data.message)
      } else {
        toast.info('Nenhuma nova conciliação encontrada.')
      }
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const transactions = (allTx as any[]) || []
  const suggestionList = (suggestions as any[]) || []
  const entityResults = (searchResults as any[]) || []
  const selectedTx = transactions.find((tx: any) => tx.id === selectedTxId)
  const isPending = selectedTx?.reconciliationStatus === 'PENDING'

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setManualSearchQuery(manualSearch)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-800">
          <strong>Como conciliar:</strong> Selecione uma transação à esquerda. À direita aparecerão sugestões automáticas
          (se houver). Você também pode buscar manualmente por nome ou CNPJ de fornecedor/empreiteiro para vincular.
        </p>
      </div>

      {/* Filter + Rerun */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-neutral-600">Filtrar:</span>
        <Select value={filter} onValueChange={(v) => { setFilter(v); setSelectedTxId(null) }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pendentes</SelectItem>
            <SelectItem value="MATCHED">Vinculadas</SelectItem>
            <SelectItem value="IGNORED">Ignoradas</SelectItem>
            <SelectItem value="ALL">Todas</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-neutral-400">
          {transactions.length} transação(ões)
        </span>
        <div className="flex-1" />
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => rerunMutation.mutate()}
            disabled={rerunMutation.isPending}
          >
            {rerunMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Re-conciliar
          </Button>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-16">
          <CheckCircle className="h-16 w-16 text-green-400" />
          <h3 className="mt-4 text-lg font-medium text-neutral-900">
            {filter === 'PENDING' ? 'Tudo conciliado!' : 'Nenhuma transação encontrada'}
          </h3>
          <p className="mt-2 text-neutral-500">
            {filter === 'PENDING'
              ? 'Não há transações importadas pendentes de conciliação.'
              : 'Nenhuma transação com esse filtro.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Transactions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide">
              Transações ({transactions.length})
            </h3>
            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-2">
              {transactions.map((tx: any) => {
                const style = STATUS_STYLES[tx.reconciliationStatus] || STATUS_STYLES.PENDING
                const isLinked = tx.reconciliationStatus === 'AUTO_MATCHED' || tx.reconciliationStatus === 'MANUAL_MATCHED'
                const isIgnored = tx.reconciliationStatus === 'IGNORED'

                return (
                  <Card
                    key={tx.id}
                    className={`cursor-pointer transition-all ${
                      selectedTxId === tx.id
                        ? 'ring-2 ring-primary shadow-md'
                        : 'hover:shadow-sm'
                    } ${style.bg} ${style.border ? `border ${style.border}` : ''}`}
                    onClick={() => {
                      setSelectedTxId(tx.id)
                      setManualSearch('')
                      setManualSearchQuery('')
                    }}
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
                            <p className={`text-sm font-medium truncate ${isIgnored ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
                              {tx.rawDescription || tx.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-neutral-500">{formatDate(tx.date)}</span>
                              {tx.bankAccount && (
                                <span className="text-xs text-neutral-400">{tx.bankAccount.bankName}</span>
                              )}
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${style.badge}`}>
                                {style.badgeLabel}
                              </Badge>
                            </div>
                            {isLinked && tx.linkedEntityName && (
                              <div className="flex items-center gap-1 mt-1.5">
                                <LinkIcon className="h-3 w-3 text-green-600" />
                                <span className="text-xs font-medium text-green-700">{tx.linkedEntityName}</span>
                                {tx.linkedEntityType && (
                                  <span className="text-[10px] text-neutral-400">
                                    ({ENTITY_TYPE_LABELS[tx.linkedEntityType] || tx.linkedEntityType})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-3 flex items-center gap-2">
                          <p className={`text-sm font-bold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </p>
                          {selectedTxId === tx.id && (
                            <ChevronRight className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Right: Suggestions + Manual Search */}
          <div className="space-y-3">
            {!selectedTxId ? (
              <>
                <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide">
                  Selecione uma transação
                </h3>
                <div className="flex items-center justify-center rounded-lg border bg-neutral-50 p-16">
                  <p className="text-neutral-400">Clique em uma transação à esquerda para conciliar.</p>
                </div>
              </>
            ) : loadingSuggestions ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
                {/* Already linked info */}
                {!isPending && selectedTx && (
                  <div className={`rounded-lg border p-4 ${
                    selectedTx.reconciliationStatus === 'IGNORED'
                      ? 'bg-neutral-50 border-neutral-200'
                      : 'bg-green-50 border-green-200'
                  }`}>
                    {selectedTx.reconciliationStatus === 'IGNORED' ? (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-neutral-600">
                          Esta transação foi <strong>ignorada</strong>.
                        </p>
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unlinkMutation.mutate(selectedTx.id)}
                            disabled={unlinkMutation.isPending}
                          >
                            {unlinkMutation.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                            Restaurar
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <p className="text-sm font-medium text-green-800">
                              Vinculada ({selectedTx.reconciliationStatus === 'AUTO_MATCHED' ? 'automático' : 'manual'})
                            </p>
                          </div>
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => unlinkMutation.mutate(selectedTx.id)}
                              disabled={unlinkMutation.isPending}
                            >
                              {unlinkMutation.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                              Desvincular
                            </Button>
                          )}
                        </div>
                        {selectedTx.linkedEntityName && (
                          <p className="text-sm text-green-700 mt-1">
                            {ENTITY_TYPE_LABELS[selectedTx.linkedEntityType] || selectedTx.linkedEntityType}: <strong>{selectedTx.linkedEntityName}</strong>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Auto suggestions (only for PENDING) */}
                {isPending && suggestionList.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide">
                      Sugestões Automáticas ({suggestionList.length})
                    </h3>
                    {suggestionList.map((suggestion: any, index: number) => (
                      <Card key={index} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {ENTITY_TYPE_LABELS[suggestion.entityType] || suggestion.entityType}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    suggestion.confidence >= 80
                                      ? 'border-green-300 text-green-700 bg-green-50'
                                      : suggestion.confidence >= 50
                                      ? 'border-amber-300 text-amber-700 bg-amber-50'
                                      : 'border-neutral-300 text-neutral-600'
                                  }`}
                                >
                                  {suggestion.confidence}% confiança
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
                    ))}
                  </div>
                )}

                {isPending && suggestionList.length === 0 && (
                  <div className="rounded-lg border bg-neutral-50 p-4 text-center">
                    <p className="text-sm text-neutral-500">Nenhuma sugestão automática encontrada.</p>
                    <p className="text-xs text-neutral-400 mt-1">Use a busca manual abaixo para vincular.</p>
                  </div>
                )}

                {/* Manual search (only for PENDING) */}
                {isPending && canEdit && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide">
                        Busca Manual
                      </h3>
                      <form onSubmit={handleManualSearch} className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                          <Input
                            placeholder="Buscar por nome ou CNPJ..."
                            value={manualSearch}
                            onChange={(e) => setManualSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <Button type="submit" variant="secondary" size="sm" disabled={manualSearch.length < 2}>
                          Buscar
                        </Button>
                      </form>

                      {loadingSearch && (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      )}

                      {manualSearchQuery.length >= 2 && !loadingSearch && entityResults.length === 0 && (
                        <p className="text-sm text-neutral-400 text-center py-2">
                          Nenhum fornecedor ou empreiteiro encontrado para "{manualSearchQuery}".
                        </p>
                      )}

                      {entityResults.length > 0 && (
                        <div className="space-y-2">
                          {entityResults.map((entity: any) => (
                            <Card key={`${entity.entityType}-${entity.entityId}`} className="hover:shadow-sm transition-shadow">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {ENTITY_TYPE_LABELS[entity.entityType] || entity.entityType}
                                      </Badge>
                                    </div>
                                    <p className="mt-1 text-sm font-medium text-neutral-900">{entity.entityName}</p>
                                    {entity.document && (
                                      <p className="text-xs text-neutral-400">{entity.document}</p>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      matchMutation.mutate({
                                        transactionId: selectedTxId!,
                                        linkedEntityType: entity.entityType,
                                        linkedEntityId: entity.entityId,
                                        linkedEntityName: entity.entityName,
                                      })
                                    }
                                    disabled={matchMutation.isPending}
                                  >
                                    <LinkIcon className="mr-1 h-3.5 w-3.5" />
                                    Vincular
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Ignore button (only for PENDING) */}
                {isPending && canEdit && (
                  <>
                    <Separator />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => ignoreMutation.mutate(selectedTxId!)}
                      disabled={ignoreMutation.isPending}
                    >
                      {ignoreMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <X className="mr-2 h-4 w-4" />
                      Ignorar esta Transação
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
