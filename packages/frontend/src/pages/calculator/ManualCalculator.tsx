import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { levantamentoAPI, sinapiAPI } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Plus, Trash2, Loader2, Save, List, Layers, GitBranch, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ComposicaoTree } from './ComposicaoTree'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface ManualCalculatorProps {
  projectId: string
  levantamentoId: string
  itens: any[]
  ambienteId?: string
  etapas?: string[]
  activityGroups?: any
}

interface EditingItem {
  id?: string
  nome: string
  unidade: string
  quantidade: string
  precoUnitario: string
  etapa: string
}

const emptyItem: EditingItem = { nome: '', unidade: 'UN', quantidade: '', precoUnitario: '', etapa: '' }

export function ManualCalculator({ projectId, levantamentoId, itens, ambienteId, etapas = [], activityGroups }: ManualCalculatorProps) {
  const queryClient = useQueryClient()

  // Derive dropdown options from activityGroups (STAGE names) or fallback to etapas
  // value = "activityId::name" when activity exists, or plain "name" for fallback
  const etapaOptions = useMemo(() => {
    if (activityGroups?.activityGroups?.length > 0) {
      return activityGroups.activityGroups.map((g: any) => ({
        value: `${g.activity.id}::${g.activity.name}`,
        label: g.activity.parentName ? `${g.activity.parentName} > ${g.activity.name}` : g.activity.name,
      }))
    }
    return etapas.map((e: string) => ({ value: e, label: e }))
  }, [activityGroups, etapas])

  // Parse etapa dropdown value into { etapa, projectActivityId }
  const parseEtapaValue = (v: string): { etapa: string; projectActivityId: string | null } => {
    if (v === '_none' || !v) return { etapa: '', projectActivityId: null }
    const sep = v.indexOf('::')
    if (sep > 0) {
      return { etapa: v.substring(sep + 2), projectActivityId: v.substring(0, sep) }
    }
    return { etapa: v, projectActivityId: null }
  }

  // Build the reverse: from etapa string or projectActivityId -> dropdown value
  const toEtapaValue = (etapa: string, projectActivityId?: string | null): string => {
    if (!etapa && !projectActivityId) return '_none'
    if (projectActivityId) {
      const found = etapaOptions.find((o: any) => o.value.startsWith(projectActivityId + '::'))
      if (found) return found.value
    }
    // Try match by name
    const found = etapaOptions.find((o: any) => {
      const parsed = parseEtapaValue(o.value)
      return parsed.etapa === etapa
    })
    return found?.value || etapa || '_none'
  }

  const [viewMode, setViewMode] = useState<'simple' | 'grouped' | 'detailed'>('simple')
  const [newItem, setNewItem] = useState<EditingItem>({ ...emptyItem })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<EditingItem>({ ...emptyItem })

  // Group items by etapa for "completa" view
  const groupedItens = useMemo(() => {
    const groups: { key: string; label: string; items: any[]; total: number }[] = []
    const map = new Map<string, any[]>()

    for (const item of itens) {
      const key = item.etapa || '_sem_etapa'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }

    for (const [key, items] of map) {
      const total = items.reduce((s: number, i: any) => s + Number(i.quantidade) * Number(i.precoUnitario), 0)
      groups.push({ key, label: key === '_sem_etapa' ? 'Sem etapa' : key, items, total })
    }

    return groups
  }, [itens])

  // SINAPI params for detailed view
  const [sinapiUf, setSinapiUf] = useState('SP')
  const [sinapiMes, setSinapiMes] = useState('')
  const [expandedTreeId, setExpandedTreeId] = useState<string | null>(null)
  const [treeCache, setTreeCache] = useState<Record<string, any>>({})
  const [treeLoading, setTreeLoading] = useState<string | null>(null)

  // Fetch available SINAPI months (only for detailed view)
  const { data: mesesDisponiveis } = useQuery({
    queryKey: ['sinapi-meses'],
    queryFn: () => sinapiAPI.getMesesReferencia(),
    enabled: viewMode === 'detailed',
    staleTime: 10 * 60 * 1000,
  })

  // Auto-select most recent month
  useEffect(() => {
    if (mesesDisponiveis && mesesDisponiveis.length > 0 && !sinapiMes) {
      setSinapiMes(mesesDisponiveis[0])
    }
  }, [mesesDisponiveis, sinapiMes])

  // Collect unique composicaoIds from items
  const composicaoIds = useMemo(() => {
    const ids = new Set<string>()
    for (const item of itens) {
      if (item.sinapiComposicaoId) ids.add(item.sinapiComposicaoId)
    }
    return ids
  }, [itens])

  const hasComposicoes = composicaoIds.size > 0

  // Fetch tree for a specific composicao
  const fetchTree = async (composicaoId: string) => {
    if (treeCache[composicaoId]) return
    if (!sinapiMes) {
      toast.warning('Aguarde o carregamento dos meses SINAPI')
      return
    }
    setTreeLoading(composicaoId)
    try {
      const tree = await sinapiAPI.getComposicaoTree(composicaoId, {
        uf: sinapiUf,
        mesReferencia: sinapiMes,
      })
      setTreeCache((prev) => ({ ...prev, [composicaoId]: tree }))
    } catch {
      toast.error('Erro ao carregar composição SINAPI')
    } finally {
      setTreeLoading(null)
    }
  }

  const toggleTree = (itemId: string, composicaoId: string) => {
    if (expandedTreeId === itemId) {
      setExpandedTreeId(null)
    } else {
      setExpandedTreeId(itemId)
      fetchTree(composicaoId)
    }
  }

  const addMutation = useMutation({
    mutationFn: (data: any) => levantamentoAPI.addItem(projectId, levantamentoId, data),
    onSuccess: () => {
      toast.success('Item adicionado')
      queryClient.invalidateQueries({ queryKey: ['levantamento-project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['workflow-check', 'levantamento-items'] })
      setNewItem({ ...emptyItem })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: any }) =>
      levantamentoAPI.updateItem(projectId, levantamentoId, itemId, data),
    onSuccess: () => {
      toast.success('Item atualizado')
      queryClient.invalidateQueries({ queryKey: ['levantamento-project', projectId] })
      setEditingId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => levantamentoAPI.deleteItem(projectId, levantamentoId, itemId),
    onSuccess: () => {
      toast.success('Item removido')
      queryClient.invalidateQueries({ queryKey: ['levantamento-project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['workflow-check', 'levantamento-items'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleAdd = () => {
    const qtd = parseFloat(newItem.quantidade)
    const preco = parseFloat(newItem.precoUnitario)
    if (!newItem.nome || isNaN(qtd) || isNaN(preco)) {
      toast.error('Preencha nome, quantidade e preço')
      return
    }
    const parsed = parseEtapaValue(newItem.etapa)
    addMutation.mutate({
      nome: newItem.nome,
      unidade: newItem.unidade || 'UN',
      quantidade: qtd,
      precoUnitario: preco,
      etapa: parsed.etapa || undefined,
      projectActivityId: parsed.projectActivityId || undefined,
      ambienteId: ambienteId || undefined,
    })
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    const qtd = parseFloat(editingData.quantidade)
    const preco = parseFloat(editingData.precoUnitario)
    if (!editingData.nome || isNaN(qtd) || isNaN(preco)) {
      toast.error('Preencha nome, quantidade e preço')
      return
    }
    const parsed = parseEtapaValue(editingData.etapa)
    updateMutation.mutate({
      itemId: editingId,
      data: {
        nome: editingData.nome,
        unidade: editingData.unidade,
        quantidade: qtd,
        precoUnitario: preco,
        etapa: parsed.etapa || null,
        projectActivityId: parsed.projectActivityId || null,
      },
    })
  }

  const startEdit = (item: any) => {
    setEditingId(item.id)
    setEditingData({
      id: item.id,
      nome: item.nome,
      unidade: item.unidade,
      quantidade: String(item.quantidade),
      precoUnitario: String(item.precoUnitario),
      etapa: toEtapaValue(item.etapa || '', item.projectActivityId),
    })
  }

  const totalGeral = itens.reduce(
    (sum, item) => sum + Number(item.quantidade) * Number(item.precoUnitario),
    0,
  )

  const renderItemRow = (item: any) => {
    const isEditing = editingId === item.id
    const total = Number(item.quantidade) * Number(item.precoUnitario)

    if (isEditing) {
      return (
        <TableRow key={item.id}>
          <TableCell><Input className="h-7 text-xs" value={editingData.nome} onChange={(e) => setEditingData({ ...editingData, nome: e.target.value })} /></TableCell>
          <TableCell><Input className="h-7 text-xs" value={editingData.unidade} onChange={(e) => setEditingData({ ...editingData, unidade: e.target.value })} /></TableCell>
          <TableCell><Input className="h-7 text-xs text-right" type="number" value={editingData.quantidade} onChange={(e) => setEditingData({ ...editingData, quantidade: e.target.value })} /></TableCell>
          <TableCell><Input className="h-7 text-xs text-right" type="number" step="0.01" value={editingData.precoUnitario} onChange={(e) => setEditingData({ ...editingData, precoUnitario: e.target.value })} /></TableCell>
          <TableCell className="text-xs text-right font-medium">-</TableCell>
          {viewMode === 'simple' && (
            <TableCell>
              <Select value={editingData.etapa || '_none'} onValueChange={(v) => setEditingData({ ...editingData, etapa: v === '_none' ? '' : v })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {etapaOptions.map((opt: any) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
          )}
          <TableCell>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-neutral-400" onClick={() => setEditingId(null)}>
                ✕
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )
    }

    return (
      <TableRow key={item.id} className="cursor-pointer hover:bg-neutral-50" onDoubleClick={() => startEdit(item)}>
        <TableCell className="text-xs">
          {item.nome}
          {item.sinapiInsumoId && (
            <span className="ml-1 text-[10px] text-blue-500">SINAPI</span>
          )}
        </TableCell>
        <TableCell className="text-xs">{item.unidade}</TableCell>
        <TableCell className="text-xs text-right font-mono">{Number(item.quantidade).toFixed(2)}</TableCell>
        <TableCell className="text-xs text-right font-mono">{formatCurrency(Number(item.precoUnitario))}</TableCell>
        <TableCell className="text-xs text-right font-mono font-medium">{formatCurrency(total)}</TableCell>
        {viewMode === 'simple' && (
          <TableCell className="text-xs text-neutral-500">{item.etapa || '-'}</TableCell>
        )}
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
            onClick={() => {
              if (confirm('Remover este item?')) deleteMutation.mutate(item.id)
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </TableCell>
      </TableRow>
    )
  }

  const renderNewItemRow = () => (
    <TableRow className="bg-neutral-50/50">
      <TableCell>
        <Input
          className="h-7 text-xs"
          placeholder="Nome do material/serviço"
          value={newItem.nome}
          onChange={(e) => setNewItem({ ...newItem, nome: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
      </TableCell>
      <TableCell>
        <Input className="h-7 text-xs" placeholder="UN" value={newItem.unidade} onChange={(e) => setNewItem({ ...newItem, unidade: e.target.value })} />
      </TableCell>
      <TableCell>
        <Input className="h-7 text-xs text-right" type="number" placeholder="0" value={newItem.quantidade} onChange={(e) => setNewItem({ ...newItem, quantidade: e.target.value })} />
      </TableCell>
      <TableCell>
        <Input className="h-7 text-xs text-right" type="number" step="0.01" placeholder="0,00" value={newItem.precoUnitario} onChange={(e) => setNewItem({ ...newItem, precoUnitario: e.target.value })} />
      </TableCell>
      <TableCell />
      {viewMode === 'simple' && (
        <TableCell>
          <Select value={newItem.etapa || '_none'} onValueChange={(v) => setNewItem({ ...newItem, etapa: v === '_none' ? '' : v })}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Etapa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">—</SelectItem>
              {etapaOptions.map((opt: any) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
      )}
      <TableCell>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600" onClick={handleAdd} disabled={addMutation.isPending}>
          {addMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        </Button>
      </TableCell>
    </TableRow>
  )

  return (
    <div className="space-y-4">
      {/* View mode toggle */}
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => setViewMode('simple')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            viewMode === 'simple'
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-500 hover:bg-neutral-100',
          )}
        >
          <List className="h-3.5 w-3.5" />
          Simples
        </button>
        <button
          type="button"
          onClick={() => setViewMode('grouped')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            viewMode === 'grouped'
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-500 hover:bg-neutral-100',
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          Completa
        </button>
        {hasComposicoes && (
          <button
            type="button"
            onClick={() => setViewMode('detailed')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              viewMode === 'detailed'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-500 hover:bg-neutral-100',
            )}
          >
            <GitBranch className="h-3.5 w-3.5" />
            Detalhada
          </button>
        )}
      </div>

      {/* Simple view — flat table */}
      {viewMode === 'simple' && (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs min-w-[200px]">Material / Serviço</TableHead>
                <TableHead className="text-xs w-20">Unidade</TableHead>
                <TableHead className="text-xs w-24 text-right">Qtd</TableHead>
                <TableHead className="text-xs w-28 text-right">Preço Unit.</TableHead>
                <TableHead className="text-xs w-28 text-right">Total</TableHead>
                <TableHead className="text-xs w-32">Etapa</TableHead>
                <TableHead className="text-xs w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map(renderItemRow)}
              {renderNewItemRow()}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Grouped view — items grouped by etapa with subtotals */}
      {viewMode === 'grouped' && (
        <div className="space-y-3">
          {groupedItens.map((group) => (
            <div key={group.key} className="border rounded-lg overflow-hidden">
              {/* Group header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 border-b">
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-neutral-400" />
                  <span className="text-sm font-semibold text-neutral-800">{group.label}</span>
                  <span className="text-xs text-neutral-400">
                    {group.items.length} ite{group.items.length === 1 ? 'm' : 'ns'}
                  </span>
                </div>
                <span className="text-sm font-bold text-green-700">{formatCurrency(group.total)}</span>
              </div>

              {/* Group items */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs min-w-[200px]">Material / Serviço</TableHead>
                    <TableHead className="text-xs w-20">Unidade</TableHead>
                    <TableHead className="text-xs w-24 text-right">Qtd</TableHead>
                    <TableHead className="text-xs w-28 text-right">Preço Unit.</TableHead>
                    <TableHead className="text-xs w-28 text-right">Total</TableHead>
                    <TableHead className="text-xs w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map(renderItemRow)}
                </TableBody>
              </Table>
            </div>
          ))}

          {/* New item row (outside groups) */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableBody>
                {renderNewItemRow()}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Detailed view — items with expandable SINAPI composition trees */}
      {viewMode === 'detailed' && (
        <div className="space-y-3">
          {/* SINAPI params bar */}
          <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-xs font-medium text-blue-700">SINAPI:</span>
            <Select value={sinapiUf} onValueChange={(v) => { setSinapiUf(v); setTreeCache({}); setExpandedTreeId(null) }}>
              <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sinapiMes} onValueChange={(v) => { setSinapiMes(v); setTreeCache({}); setExpandedTreeId(null) }}>
              <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Mês ref..." /></SelectTrigger>
              <SelectContent>
                {(mesesDisponiveis || []).map((m: string) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {groupedItens.map((group) => (
            <div key={group.key} className="border rounded-lg overflow-hidden">
              {/* Group header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 border-b">
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-neutral-400" />
                  <span className="text-sm font-semibold text-neutral-800">{group.label}</span>
                  <span className="text-xs text-neutral-400">
                    {group.items.length} ite{group.items.length === 1 ? 'm' : 'ns'}
                  </span>
                </div>
                <span className="text-sm font-bold text-green-700">{formatCurrency(group.total)}</span>
              </div>

              {/* Items with expandable trees */}
              <div className="divide-y">
                {group.items.map((item: any) => {
                  const total = Number(item.quantidade) * Number(item.precoUnitario)
                  const hasTree = !!item.sinapiComposicaoId
                  const isExpanded = expandedTreeId === item.id
                  const isLoadingTree = treeLoading === item.sinapiComposicaoId
                  const treeData = hasTree ? treeCache[item.sinapiComposicaoId] : null

                  return (
                    <div key={item.id}>
                      <div
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5 text-xs',
                          hasTree ? 'cursor-pointer hover:bg-neutral-50' : '',
                        )}
                        onClick={() => hasTree && toggleTree(item.id, item.sinapiComposicaoId)}
                      >
                        {/* Expand icon */}
                        <div className="w-4 flex-shrink-0">
                          {hasTree && (
                            isLoadingTree && expandedTreeId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
                            ) : isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
                            )
                          )}
                        </div>

                        {/* Item info */}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-neutral-800">{item.nome}</span>
                          {hasTree && (
                            <span className="ml-1.5 text-[10px] text-blue-500 font-medium">SINAPI</span>
                          )}
                        </div>
                        <span className="text-neutral-500 w-12 text-center flex-shrink-0">{item.unidade}</span>
                        <span className="font-mono text-neutral-600 w-16 text-right flex-shrink-0">{Number(item.quantidade).toFixed(2)}</span>
                        <span className="font-mono text-neutral-600 w-24 text-right flex-shrink-0">{formatCurrency(Number(item.precoUnitario))}</span>
                        <span className="font-mono font-medium text-neutral-800 w-24 text-right flex-shrink-0">{formatCurrency(total)}</span>
                        <div className="w-8 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('Remover este item?')) deleteMutation.mutate(item.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Expanded composition tree */}
                      {isExpanded && treeData && (
                        <div className="px-4 pb-3 pt-1 bg-neutral-50/50 border-t border-dashed border-neutral-200">
                          <ComposicaoTree data={treeData} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 rounded-lg border">
        <span className="text-sm font-medium text-neutral-600">
          {itens.length} ite{itens.length === 1 ? 'm' : 'ns'}
        </span>
        <div className="text-right">
          <span className="text-sm text-neutral-500 mr-3">Total:</span>
          <span className="text-lg font-bold text-green-700">{formatCurrency(totalGeral)}</span>
        </div>
      </div>

      <p className="text-xs text-neutral-400">
        Dica: clique duas vezes em uma linha para editar.
      </p>
    </div>
  )
}
