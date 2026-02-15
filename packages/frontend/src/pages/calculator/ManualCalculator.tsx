import { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { levantamentoAPI } from '@/lib/api-client'
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
import { Plus, Trash2, Loader2, Save } from 'lucide-react'

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
  const etapaOptions = useMemo(() => {
    if (activityGroups?.activityGroups?.length > 0) {
      return activityGroups.activityGroups.map((g: any) => ({
        value: g.activity.name,
        label: g.activity.parentName ? `${g.activity.parentName} > ${g.activity.name}` : g.activity.name,
      }))
    }
    return etapas.map((e: string) => ({ value: e, label: e }))
  }, [activityGroups, etapas])

  const [newItem, setNewItem] = useState<EditingItem>({ ...emptyItem })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<EditingItem>({ ...emptyItem })

  const addMutation = useMutation({
    mutationFn: (data: any) => levantamentoAPI.addItem(projectId, levantamentoId, data),
    onSuccess: () => {
      toast.success('Item adicionado')
      queryClient.invalidateQueries({ queryKey: ['levantamento-fp', projectId] })
      setNewItem({ ...emptyItem })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: any }) =>
      levantamentoAPI.updateItem(projectId, levantamentoId, itemId, data),
    onSuccess: () => {
      toast.success('Item atualizado')
      queryClient.invalidateQueries({ queryKey: ['levantamento-fp', projectId] })
      setEditingId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => levantamentoAPI.deleteItem(projectId, levantamentoId, itemId),
    onSuccess: () => {
      toast.success('Item removido')
      queryClient.invalidateQueries({ queryKey: ['levantamento-fp', projectId] })
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
    addMutation.mutate({
      nome: newItem.nome,
      unidade: newItem.unidade || 'UN',
      quantidade: qtd,
      precoUnitario: preco,
      etapa: newItem.etapa || undefined,
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
    updateMutation.mutate({
      itemId: editingId,
      data: {
        nome: editingData.nome,
        unidade: editingData.unidade,
        quantidade: qtd,
        precoUnitario: preco,
        etapa: editingData.etapa || null,
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
      etapa: item.etapa || '',
    })
  }

  const totalGeral = itens.reduce(
    (sum, item) => sum + Number(item.quantidade) * Number(item.precoUnitario),
    0,
  )

  return (
    <div className="space-y-4">
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
            {itens.map((item: any) => {
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
                    <TableCell>
                      <Select value={editingData.etapa || '_none'} onValueChange={(v) => setEditingData({ ...editingData, etapa: v === '_none' ? '' : v })}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">—</SelectItem>
                          {etapaOptions.map((opt: any) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
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
                  <TableCell className="text-xs text-neutral-500">{item.etapa || '-'}</TableCell>
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
            })}

            {/* New item row */}
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
                <Input
                  className="h-7 text-xs"
                  placeholder="UN"
                  value={newItem.unidade}
                  onChange={(e) => setNewItem({ ...newItem, unidade: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Input
                  className="h-7 text-xs text-right"
                  type="number"
                  placeholder="0"
                  value={newItem.quantidade}
                  onChange={(e) => setNewItem({ ...newItem, quantidade: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Input
                  className="h-7 text-xs text-right"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={newItem.precoUnitario}
                  onChange={(e) => setNewItem({ ...newItem, precoUnitario: e.target.value })}
                />
              </TableCell>
              <TableCell />
              <TableCell>
                <Select value={newItem.etapa || '_none'} onValueChange={(v) => setNewItem({ ...newItem, etapa: v === '_none' ? '' : v })}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    {etapas.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-green-600"
                  onClick={handleAdd}
                  disabled={addMutation.isPending}
                >
                  {addMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

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
