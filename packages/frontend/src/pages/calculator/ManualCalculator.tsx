import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { levantamentoAPI, sinapiAPI } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Loader2, Save, List, Layers, GitBranch, ChevronRight, ChevronDown, Lightbulb, PackagePlus } from 'lucide-react'
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
  fixedActivityId?: string
  fixedActivityName?: string
  childActivities?: any[]
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

export function ManualCalculator({ projectId, levantamentoId, itens, ambienteId, etapas = [], activityGroups, fixedActivityId, fixedActivityName, childActivities }: ManualCalculatorProps) {
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
    if (fixedActivityId) {
      addMutation.mutate({
        nome: newItem.nome,
        unidade: newItem.unidade || 'UN',
        quantidade: qtd,
        precoUnitario: preco,
        etapa: fixedActivityName || undefined,
        projectActivityId: fixedActivityId,
        ambienteId: ambienteId || undefined,
      })
    } else {
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
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    const qtd = parseFloat(editingData.quantidade)
    const preco = parseFloat(editingData.precoUnitario)
    if (!editingData.nome || isNaN(qtd) || isNaN(preco)) {
      toast.error('Preencha nome, quantidade e preço')
      return
    }
    if (fixedActivityId) {
      updateMutation.mutate({
        itemId: editingId,
        data: {
          nome: editingData.nome,
          unidade: editingData.unidade,
          quantidade: qtd,
          precoUnitario: preco,
          etapa: fixedActivityName || null,
          projectActivityId: fixedActivityId,
        },
      })
    } else {
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
          {viewMode === 'simple' && !fixedActivityId && (
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
        {viewMode === 'simple' && !fixedActivityId && (
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
      {viewMode === 'simple' && !fixedActivityId && (
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

  // === SINAPI Suggestions ===
  const childSinapiCodigos = useMemo(() => {
    if (!childActivities?.length) return []
    return childActivities
      .filter((c: any) => c.level === 'ACTIVITY' && c.sinapiCodigo)
      .map((c: any) => ({ name: c.name, sinapiCodigo: c.sinapiCodigo, id: c.id }))
  }, [childActivities])

  const childrenWithoutSinapi = useMemo(() => {
    if (!childActivities?.length) return []
    return childActivities.filter((c: any) => c.level === 'ACTIVITY' && !c.sinapiCodigo)
  }, [childActivities])

  // Fetch composition details (with insumos) for each child SINAPI code
  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['sinapi-suggestions', childSinapiCodigos.map(c => c.sinapiCodigo).join(',')],
    queryFn: async () => {
      // Step 1: find composition IDs by code
      const resolvedComps = await Promise.all(
        childSinapiCodigos.map(async (item) => {
          try {
            const res = await sinapiAPI.searchComposicoes({ search: item.sinapiCodigo, limit: 5 })
            const data = (res as any).data ?? (res as any).composicoes ?? res
            const list = Array.isArray(data) ? data : []
            const match = list.find((c: any) => c.codigo === item.sinapiCodigo) || list[0]
            return match ? { ...item, composicaoId: match.id, composicaoDesc: match.descricao } : null
          } catch {
            return null
          }
        })
      )
      const valid = resolvedComps.filter(Boolean) as { name: string; sinapiCodigo: string; id: string; composicaoId: string; composicaoDesc: string }[]

      // Step 2: fetch full composition details (with insumos) for each
      const details = await Promise.all(
        valid.map(async (comp) => {
          try {
            const detail = await sinapiAPI.getComposicao(comp.composicaoId)
            return {
              activityName: comp.name,
              sinapiCodigo: comp.sinapiCodigo,
              composicaoDesc: comp.composicaoDesc,
              itens: (detail.itens || []).map((item: any) => ({
                insumoId: item.insumo?.id || item.insumoId,
                codigo: item.insumo?.codigo || item.codigo,
                descricao: item.insumo?.descricao || item.descricao,
                unidade: item.insumo?.unidade || item.unidade || 'UN',
                tipo: item.insumo?.tipo || item.tipo,
                coeficiente: Number(item.coeficiente) || 0,
              })),
            }
          } catch {
            return null
          }
        })
      )
      return details.filter(Boolean)
    },
    enabled: childSinapiCodigos.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  // Suggestions state: track selected items and user-adjusted values
  interface SuggestionItem {
    key: string
    selected: boolean
    descricao: string
    unidade: string
    quantidade: string
    precoUnitario: string
    activityName: string
    sinapiCodigo: string
    insumoId?: string
  }

  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [suggestionsInitialized, setSuggestionsInitialized] = useState(false)
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true)

  // Initialize suggestions when data loads
  useEffect(() => {
    if (!suggestionsData?.length || suggestionsInitialized) return
    const items: SuggestionItem[] = []
    for (const comp of suggestionsData) {
      if (!comp) continue
      for (const insumo of comp.itens) {
        items.push({
          key: `${comp.sinapiCodigo}_${insumo.codigo}`,
          selected: false,
          descricao: insumo.descricao,
          unidade: insumo.unidade,
          quantidade: insumo.coeficiente > 0 ? String(insumo.coeficiente) : '',
          precoUnitario: '',
          activityName: comp.activityName,
          sinapiCodigo: comp.sinapiCodigo,
          insumoId: insumo.insumoId,
        })
      }
    }
    setSuggestions(items)
    setSuggestionsInitialized(true)
  }, [suggestionsData, suggestionsInitialized])

  // Reset suggestions when child activities change
  useEffect(() => {
    setSuggestionsInitialized(false)
    setSuggestions([])
  }, [childSinapiCodigos.map(c => c.sinapiCodigo).join(',')])

  const toggleSuggestion = (key: string) => {
    setSuggestions(prev => prev.map(s => s.key === key ? { ...s, selected: !s.selected } : s))
  }

  const toggleAllSuggestions = (selected: boolean) => {
    setSuggestions(prev => prev.map(s => ({ ...s, selected })))
  }

  const updateSuggestionField = (key: string, field: 'quantidade' | 'precoUnitario', value: string) => {
    setSuggestions(prev => prev.map(s => s.key === key ? { ...s, [field]: value } : s))
  }

  const selectedSuggestions = suggestions.filter(s => s.selected)

  const addSuggestionsMutation = useMutation({
    mutationFn: async (items: SuggestionItem[]) => {
      const results = []
      for (const item of items) {
        const qtd = parseFloat(item.quantidade)
        const preco = parseFloat(item.precoUnitario)
        if (!item.descricao || isNaN(qtd) || qtd <= 0) continue
        results.push(
          levantamentoAPI.addItem(projectId, levantamentoId, {
            nome: item.descricao,
            unidade: item.unidade,
            quantidade: qtd,
            precoUnitario: isNaN(preco) ? 0 : preco,
            sinapiInsumoId: item.insumoId || undefined,
            projectActivityId: fixedActivityId || undefined,
            etapa: fixedActivityName || undefined,
            ambienteId: ambienteId || undefined,
          })
        )
      }
      return Promise.all(results)
    },
    onSuccess: (results) => {
      toast.success(`${results.length} ite${results.length === 1 ? 'm adicionado' : 'ns adicionados'}`)
      queryClient.invalidateQueries({ queryKey: ['levantamento-project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['workflow-check', 'levantamento-items'] })
      // Uncheck added items
      const addedKeys = new Set(selectedSuggestions.map(s => s.key))
      setSuggestions(prev => prev.map(s => addedKeys.has(s.key) ? { ...s, selected: false } : s))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleAddSuggestions = () => {
    const valid = selectedSuggestions.filter(s => {
      const qtd = parseFloat(s.quantidade)
      return s.descricao && !isNaN(qtd) && qtd > 0
    })
    if (valid.length === 0) {
      toast.error('Preencha a quantidade dos itens selecionados')
      return
    }
    addSuggestionsMutation.mutate(valid)
  }

  // Group suggestions by activity name
  const groupedSuggestions = useMemo(() => {
    const groups: { activityName: string; sinapiCodigo: string; items: SuggestionItem[] }[] = []
    const map = new Map<string, SuggestionItem[]>()
    const order: string[] = []
    for (const s of suggestions) {
      const key = `${s.activityName}__${s.sinapiCodigo}`
      if (!map.has(key)) { map.set(key, []); order.push(key) }
      map.get(key)!.push(s)
    }
    for (const key of order) {
      const items = map.get(key)!
      groups.push({ activityName: items[0].activityName, sinapiCodigo: items[0].sinapiCodigo, items })
    }
    return groups
  }, [suggestions])

  const hasSuggestions = suggestions.length > 0 || suggestionsLoading || childSinapiCodigos.length > 0

  return (
    <div className="space-y-4">
      {/* SINAPI Suggestions */}
      {hasSuggestions && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 overflow-hidden">
          <button
            type="button"
            className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-amber-50 transition-colors"
            onClick={() => setSuggestionsExpanded(e => !e)}
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Sugestões de materiais
              </span>
              {suggestions.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {suggestions.length} ite{suggestions.length === 1 ? 'm' : 'ns'}
                </Badge>
              )}
            </div>
            {suggestionsExpanded
              ? <ChevronDown className="h-4 w-4 text-amber-500" />
              : <ChevronRight className="h-4 w-4 text-amber-500" />
            }
          </button>

          {suggestionsExpanded && (
            <div className="border-t border-amber-200 px-4 py-3 space-y-3">
              {suggestionsLoading ? (
                <div className="flex items-center gap-2 text-sm text-amber-600 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando sugestões na base SINAPI...
                </div>
              ) : suggestions.length === 0 && childSinapiCodigos.length > 0 ? (
                <p className="text-xs text-amber-600">Nenhum insumo encontrado para as composições vinculadas.</p>
              ) : (
                <>
                  {/* Select all / Deselect all */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-xs text-amber-700 underline hover:text-amber-900"
                        onClick={() => toggleAllSuggestions(true)}
                      >
                        Selecionar todos
                      </button>
                      <button
                        type="button"
                        className="text-xs text-amber-700 underline hover:text-amber-900"
                        onClick={() => toggleAllSuggestions(false)}
                      >
                        Limpar seleção
                      </button>
                    </div>
                    {selectedSuggestions.length > 0 && (
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleAddSuggestions}
                        disabled={addSuggestionsMutation.isPending}
                      >
                        {addSuggestionsMutation.isPending ? (
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        ) : (
                          <PackagePlus className="h-3 w-3 mr-1.5" />
                        )}
                        Adicionar {selectedSuggestions.length} selecionado{selectedSuggestions.length !== 1 ? 's' : ''}
                      </Button>
                    )}
                  </div>

                  {/* Grouped suggestions */}
                  {groupedSuggestions.map((group) => (
                    <div key={`${group.activityName}_${group.sinapiCodigo}`} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-neutral-700">{group.activityName}</span>
                        <Badge variant="outline" className="text-[9px] border-blue-300 text-blue-600">
                          SINAPI {group.sinapiCodigo}
                        </Badge>
                      </div>
                      <div className="rounded border border-amber-100 bg-white divide-y divide-amber-100">
                        {group.items.map((s) => (
                          <div key={s.key} className="flex items-center gap-2 px-3 py-1.5">
                            <Checkbox
                              checked={s.selected}
                              onChange={() => toggleSuggestion(s.key)}
                              className="h-3.5 w-3.5"
                            />
                            <span className={cn(
                              "flex-1 text-xs min-w-0 truncate",
                              s.selected ? 'text-neutral-800' : 'text-neutral-500'
                            )} title={s.descricao}>
                              {s.descricao}
                            </span>
                            <span className="text-[10px] text-neutral-400 w-8 text-center shrink-0">{s.unidade}</span>
                            <Input
                              type="number"
                              className="h-6 w-20 text-xs text-right shrink-0"
                              placeholder="Qtd"
                              value={s.quantidade}
                              onChange={(e) => updateSuggestionField(s.key, 'quantidade', e.target.value)}
                              min="0"
                              step="0.01"
                            />
                            <Input
                              type="number"
                              className="h-6 w-24 text-xs text-right shrink-0"
                              placeholder="R$ Preço"
                              value={s.precoUnitario}
                              onChange={(e) => updateSuggestionField(s.key, 'precoUnitario', e.target.value)}
                              min="0"
                              step="0.01"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Activities without SINAPI (context only) */}
      {childrenWithoutSinapi.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 space-y-1.5">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            Atividades sem referência SINAPI
          </span>
          <div className="space-y-0.5">
            {childrenWithoutSinapi.map((child: any) => (
              <div key={child.id} className="flex items-center gap-2">
                <span className="text-xs text-neutral-600">{child.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
                {!fixedActivityId && <TableHead className="text-xs w-32">Etapa</TableHead>}
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
