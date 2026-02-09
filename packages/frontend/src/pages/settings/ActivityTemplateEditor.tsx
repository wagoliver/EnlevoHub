import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { activityTemplatesAPI } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Save,
  Loader2,
  GripVertical,
} from 'lucide-react'

interface TemplateItem {
  id?: string
  name: string
  weight: number
  order: number
}

export function ActivityTemplateEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!id && id !== 'new'

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<TemplateItem[]>([])

  // Fetch existing template when editing
  const { data: template, isLoading } = useQuery({
    queryKey: ['activity-template', id],
    queryFn: () => activityTemplatesAPI.getById(id!),
    enabled: isEditing,
  })

  // Populate form when template data loads
  useEffect(() => {
    if (template) {
      setName(template.name || '')
      setDescription(template.description || '')
      if (template.items && template.items.length > 0) {
        setItems(
          template.items
            .sort((a: any, b: any) => a.order - b.order)
            .map((item: any) => ({
              id: item.id,
              name: item.name,
              weight: item.weight ?? 1,
              order: item.order,
            }))
        )
      }
    }
  }, [template])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => activityTemplatesAPI.create(data),
    onSuccess: (result: any) => {
      toast.success('Template criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] })
      navigate(`/settings/templates/${result.id}`, { replace: true })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar template')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => activityTemplatesAPI.update(id!, data),
    onSuccess: () => {
      toast.success('Template atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] })
      queryClient.invalidateQueries({ queryKey: ['activity-template', id] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar template')
    },
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  // Item management
  const addItem = () => {
    const newOrder = items.length > 0 ? Math.max(...items.map((i) => i.order)) + 1 : 1
    setItems([...items, { name: '', weight: 1, order: newOrder }])
  }

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index)
    // Reassign order values
    setItems(updated.map((item, i) => ({ ...item, order: i + 1 })))
  }

  const updateItem = (index: number, field: keyof TemplateItem, value: string | number) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === items.length - 1)
    ) {
      return
    }

    const updated = [...items]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    // Swap items
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp

    // Reassign order values
    setItems(updated.map((item, i) => ({ ...item, order: i + 1 })))
  }

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('O nome do template é obrigatório')
      return
    }

    // Validate items have names
    const invalidItems = items.filter((item) => !item.name.trim())
    if (invalidItems.length > 0) {
      toast.error('Todos os itens devem ter um nome')
      return
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      items: items.map((item, index) => ({
        ...(item.id ? { id: item.id } : {}),
        name: item.name.trim(),
        weight: Number(item.weight) || 1,
        order: index + 1,
      })),
    }

    if (isEditing) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings/templates')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              {isEditing ? 'Editar Template' : 'Novo Template'}
            </h1>
            <p className="mt-1 text-neutral-600">
              {isEditing
                ? 'Altere as informações do template de atividades'
                : 'Crie um novo modelo reutilizável de atividades'}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar
        </Button>
      </div>

      {/* Template Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Ex: Construção Residencial Padrão"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o objetivo deste template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Template Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Itens do Template</CardTitle>
            <Button size="sm" variant="outline" onClick={addItem}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-neutral-50 p-12">
              <p className="text-sm text-neutral-500">
                Nenhum item adicionado. Clique em "Adicionar Item" para começar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-[40px_1fr_100px_80px_80px] items-center gap-3 px-2 text-sm font-medium text-neutral-500">
                <span className="text-center">#</span>
                <span>Nome da Atividade</span>
                <span className="text-center">Peso</span>
                <span className="text-center">Ordem</span>
                <span className="text-center">Ações</span>
              </div>

              <Separator />

              {/* Items */}
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[40px_1fr_100px_80px_80px] items-center gap-3 rounded-md border bg-white px-2 py-2"
                >
                  <div className="flex items-center justify-center text-neutral-400">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <Input
                    placeholder="Nome da atividade"
                    value={item.name}
                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                  />
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="Peso"
                    value={item.weight}
                    onChange={(e) =>
                      updateItem(index, 'weight', parseFloat(e.target.value) || 0)
                    }
                    className="text-center"
                  />
                  <div className="flex items-center justify-center text-sm text-neutral-500">
                    {item.order}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === 0}
                      onClick={() => moveItem(index, 'up')}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === items.length - 1}
                      onClick={() => moveItem(index, 'down')}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <Separator />
              <div className="flex items-center justify-between px-2 text-sm text-neutral-500">
                <span>
                  {items.length} {items.length === 1 ? 'item' : 'itens'} no
                  template
                </span>
                <span>
                  Peso total:{' '}
                  {items
                    .reduce((sum, item) => sum + (Number(item.weight) || 0), 0)
                    .toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
