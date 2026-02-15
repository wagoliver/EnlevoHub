import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { levantamentoAPI, projectsAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Calculator, Plus, Trash2, Loader2, FileText, Settings } from 'lucide-react'
import { AmbienteSidebar } from './AmbienteSidebar'
import { AmbienteDetail } from './AmbienteDetail'
import { AmbienteResumo } from './AmbienteResumo'
import { AmbienteForm } from './AmbienteForm'
import { ServicoTemplateAdmin } from './ServicoTemplateAdmin'

interface MaterialsCalculatorProps {
  projectId: string
}

export function MaterialsCalculator({ projectId }: MaterialsCalculatorProps) {
  const queryClient = useQueryClient()
  const canEdit = usePermission('projects:edit')
  const [selectedLevId, setSelectedLevId] = useState<string | null>(null)
  const [selectedAmbienteId, setSelectedAmbienteId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTipo, setNewTipo] = useState<'MANUAL' | 'SINAPI'>('MANUAL')

  // Ambiente form state
  const [ambienteFormOpen, setAmbienteFormOpen] = useState(false)
  const [editingAmbiente, setEditingAmbiente] = useState<any>(null)

  // Template admin
  const [templateAdminOpen, setTemplateAdminOpen] = useState(false)

  const { data: levantamentos, isLoading } = useQuery({
    queryKey: ['levantamentos', projectId],
    queryFn: () => levantamentoAPI.list(projectId, { limit: 100 }),
  })

  const { data: selectedLev } = useQuery({
    queryKey: ['levantamento', projectId, selectedLevId],
    queryFn: () => levantamentoAPI.getById(projectId, selectedLevId!),
    enabled: !!selectedLevId,
  })

  // Buscar atividades do projeto para extrair etapas (PHASE/STAGE)
  const { data: activities } = useQuery({
    queryKey: ['project-activities', projectId],
    queryFn: () => projectsAPI.listActivities(projectId),
    staleTime: 5 * 60 * 1000,
  })

  const etapas = useMemo(() => {
    if (!activities || !Array.isArray(activities)) return []
    const nomes: string[] = []
    function extract(items: any[]) {
      for (const item of items) {
        if (item.level === 'PHASE' || item.level === 'STAGE') {
          nomes.push(item.name)
        }
        if (item.children?.length) extract(item.children)
      }
    }
    extract(activities)
    return nomes
  }, [activities])

  const createMutation = useMutation({
    mutationFn: (data: any) => levantamentoAPI.create(projectId, data),
    onSuccess: (data) => {
      toast.success('Levantamento criado')
      queryClient.invalidateQueries({ queryKey: ['levantamentos', projectId] })
      setSelectedLevId(data.id)
      setCreateOpen(false)
      setNewName('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => levantamentoAPI.delete(projectId, id),
    onSuccess: () => {
      toast.success('Levantamento excluido')
      queryClient.invalidateQueries({ queryKey: ['levantamentos', projectId] })
      setSelectedLevId(null)
      setSelectedAmbienteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Ambiente mutations
  const createAmbienteMutation = useMutation({
    mutationFn: (data: any) => levantamentoAPI.createAmbiente(projectId, selectedLevId!, data),
    onSuccess: (data) => {
      toast.success('Ambiente criado')
      queryClient.invalidateQueries({ queryKey: ['levantamento', projectId, selectedLevId] })
      setAmbienteFormOpen(false)
      setEditingAmbiente(null)
      setSelectedAmbienteId(data.id)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateAmbienteMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      levantamentoAPI.updateAmbiente(projectId, selectedLevId!, id, data),
    onSuccess: () => {
      toast.success('Ambiente atualizado')
      queryClient.invalidateQueries({ queryKey: ['levantamento', projectId, selectedLevId] })
      setAmbienteFormOpen(false)
      setEditingAmbiente(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteAmbienteMutation = useMutation({
    mutationFn: (id: string) => levantamentoAPI.deleteAmbiente(projectId, selectedLevId!, id),
    onSuccess: () => {
      toast.success('Ambiente removido')
      queryClient.invalidateQueries({ queryKey: ['levantamento', projectId, selectedLevId] })
      if (selectedAmbienteId) setSelectedAmbienteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const levList = levantamentos?.data || []

  // Auto-select first levantamento
  if (!selectedLevId && levList.length > 0 && !isLoading) {
    setSelectedLevId(levList[0].id)
  }

  const ambientes = selectedLev?.ambientes || []
  const itens = selectedLev?.itens || []
  const selectedAmbiente = ambientes.find((a: any) => a.id === selectedAmbienteId)

  const handleAmbienteFormSubmit = (data: any) => {
    if (editingAmbiente) {
      updateAmbienteMutation.mutate({ id: editingAmbiente.id, data })
    } else {
      createAmbienteMutation.mutate(data)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="h-5 w-5 text-neutral-500" />
          <h2 className="text-lg font-semibold">Calculadora de Materiais</h2>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setTemplateAdminOpen(true)} title="Configurar templates de servicos">
              <Settings className="h-4 w-4" />
            </Button>
          )}
          {canEdit && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Levantamento
            </Button>
          )}
        </div>
      </div>

      {/* Levantamento selector */}
      {levList.length > 0 ? (
        <div className="flex items-center gap-3">
          <Select
            value={selectedLevId ?? ''}
            onValueChange={(v) => { setSelectedLevId(v); setSelectedAmbienteId(null) }}
          >
            <SelectTrigger className="w-80">
              <SelectValue placeholder="Selecionar levantamento" />
            </SelectTrigger>
            <SelectContent>
              {levList.map((lev: any) => (
                <SelectItem key={lev.id} value={lev.id}>
                  {lev.nome} ({lev.tipo}) - {lev._count?.itens ?? 0} itens
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedLevId && canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-600"
              onClick={() => {
                if (confirm('Excluir este levantamento e todos os itens?')) {
                  deleteMutation.mutate(selectedLevId)
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-10 w-10 text-neutral-300" />
            <h3 className="mt-3 text-sm font-medium text-neutral-700">
              Nenhum levantamento
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Crie um levantamento para comecar a listar materiais e servicos.
            </p>
            {canEdit && (
              <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Criar Levantamento
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sidebar + Content layout */}
      {selectedLev && (
        <div className="flex gap-0 border rounded-lg overflow-hidden bg-white min-h-[500px]">
          {/* Sidebar */}
          <div className="w-56 flex-shrink-0 border-r bg-neutral-50/50">
            <AmbienteSidebar
              ambientes={ambientes}
              itens={itens}
              selectedId={selectedAmbienteId}
              onSelect={setSelectedAmbienteId}
              onAdd={() => { setEditingAmbiente(null); setAmbienteFormOpen(true) }}
              onEdit={(amb) => { setEditingAmbiente(amb); setAmbienteFormOpen(true) }}
              onDelete={(id) => deleteAmbienteMutation.mutate(id)}
              canEdit={canEdit}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {selectedAmbiente ? (
              <AmbienteDetail
                ambiente={selectedAmbiente}
                projectId={projectId}
                levantamentoId={selectedLev.id}
                itens={itens}
                etapas={etapas}
              />
            ) : (
              <AmbienteResumo
                ambientes={ambientes}
                itens={itens}
              />
            )}
          </div>
        </div>
      )}

      {/* Create levantamento dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Levantamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Levantamento Fase 1 - Estrutura"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={newTipo} onValueChange={(v) => setNewTipo(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="SINAPI">SINAPI</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-neutral-400 mt-1">
                {newTipo === 'MANUAL'
                  ? 'Adicione materiais livremente com precos proprios.'
                  : 'Use composicoes SINAPI como referencia de precos.'}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => createMutation.mutate({ nome: newName, tipo: newTipo })}
                disabled={!newName || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ambiente form dialog */}
      <AmbienteForm
        open={ambienteFormOpen}
        onOpenChange={(open) => { setAmbienteFormOpen(open); if (!open) setEditingAmbiente(null) }}
        onSubmit={handleAmbienteFormSubmit}
        isPending={createAmbienteMutation.isPending || updateAmbienteMutation.isPending}
        editData={editingAmbiente}
      />

      {/* Template admin dialog */}
      <ServicoTemplateAdmin
        open={templateAdminOpen}
        onOpenChange={setTemplateAdminOpen}
      />
    </div>
  )
}
