import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { levantamentoAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Calculator, Plus, Trash2, Loader2, FileText } from 'lucide-react'
import { ManualCalculator } from './ManualCalculator'
import { SinapiCalculator } from './SinapiCalculator'
import { LevantamentoSummary } from './LevantamentoSummary'

interface MaterialsCalculatorProps {
  projectId: string
}

export function MaterialsCalculator({ projectId }: MaterialsCalculatorProps) {
  const queryClient = useQueryClient()
  const canEdit = usePermission('projects:edit')
  const [selectedLevId, setSelectedLevId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTipo, setNewTipo] = useState<'MANUAL' | 'SINAPI'>('MANUAL')

  const { data: levantamentos, isLoading } = useQuery({
    queryKey: ['levantamentos', projectId],
    queryFn: () => levantamentoAPI.list(projectId, { limit: 100 }),
  })

  const { data: selectedLev } = useQuery({
    queryKey: ['levantamento', projectId, selectedLevId],
    queryFn: () => levantamentoAPI.getById(projectId, selectedLevId!),
    enabled: !!selectedLevId,
  })

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
      toast.success('Levantamento excluído')
      queryClient.invalidateQueries({ queryKey: ['levantamentos', projectId] })
      setSelectedLevId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const levList = levantamentos?.data || []

  // Auto-select first levantamento
  if (!selectedLevId && levList.length > 0 && !isLoading) {
    setSelectedLevId(levList[0].id)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="h-5 w-5 text-neutral-500" />
          <h2 className="text-lg font-semibold">Calculadora de Materiais</h2>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Levantamento
          </Button>
        )}
      </div>

      {/* Levantamento selector */}
      {levList.length > 0 ? (
        <div className="flex items-center gap-3">
          <Select
            value={selectedLevId ?? ''}
            onValueChange={setSelectedLevId}
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
              Crie um levantamento para começar a listar materiais e serviços.
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

      {/* Selected levantamento content */}
      {selectedLev && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {selectedLev.nome}
                <span className="text-xs font-normal text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
                  {selectedLev.tipo}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="manual">
                <TabsList>
                  <TabsTrigger value="manual">Manual</TabsTrigger>
                  <TabsTrigger value="sinapi">SINAPI</TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="mt-4">
                  <ManualCalculator
                    projectId={projectId}
                    levantamentoId={selectedLev.id}
                    itens={selectedLev.itens || []}
                  />
                </TabsContent>

                <TabsContent value="sinapi" className="mt-4">
                  <SinapiCalculator
                    projectId={projectId}
                    levantamentoId={selectedLev.id}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <LevantamentoSummary
            projectId={projectId}
            levantamentoId={selectedLev.id}
          />
        </div>
      )}

      {/* Create dialog */}
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
                  ? 'Adicione materiais livremente com preços próprios.'
                  : 'Use composições SINAPI como referência de preços.'}
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
    </div>
  )
}
