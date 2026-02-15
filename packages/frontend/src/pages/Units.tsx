import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { FormTooltip } from '@/components/ui/FormTooltip'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { UnitFormDialog } from './projects/UnitFormDialog'
import { FloorPlanManager } from './projects/FloorPlanManager'
import { BlockManager } from './projects/BlockManager'
import { BulkGenerateWizard } from './projects/BulkGenerateWizard'
import {
  Plus,
  Edit,
  Trash2,
  Home,
  Loader2,
  Search,
  Layers,
  X,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import { WorkflowStepper } from '@/components/WorkflowStepper'

const unitTypeLabel: Record<string, string> = {
  APARTMENT: 'Apartamento',
  HOUSE: 'Casa',
  COMMERCIAL: 'Comercial',
  LAND: 'Terreno',
}

const unitStatusLabel: Record<string, string> = {
  AVAILABLE: 'Disponível',
  RESERVED: 'Reservado',
  SOLD: 'Vendido',
  BLOCKED: 'Bloqueado',
}

const unitStatusVariant: Record<string, any> = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  SOLD: 'sold',
  BLOCKED: 'blocked',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function Units() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const phaseParam = searchParams.get('phase')
  const queryClient = useQueryClient()
  const canCreate = usePermission('units:create')
  const canEdit = usePermission('units:edit')
  const canDelete = usePermission('units:delete')

  const [selectedProject, setSelectedProject] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [blockFilter, setBlockFilter] = useState('')
  const [floorPlanFilter, setFloorPlanFilter] = useState('')
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [editingUnit, setEditingUnit] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [unitToDelete, setUnitToDelete] = useState<any>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  // Clear selection when filters or page change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [page, search, statusFilter, typeFilter, blockFilter, floorPlanFilter])

  // Reset filters when project changes
  useEffect(() => {
    setPage(1)
    setSearch('')
    setStatusFilter('')
    setTypeFilter('')
    setBlockFilter('')
    setFloorPlanFilter('')
    setSelectedIds(new Set())
  }, [selectedProject])

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list-all'],
    queryFn: () => projectsAPI.list({ limit: 100 }),
  })

  const projects = projectsData?.data || []

  const params: any = { page, limit: 50 }
  if (search) params.search = search
  if (statusFilter) params.status = statusFilter
  if (typeFilter) params.type = typeFilter
  if (blockFilter) params.blockId = blockFilter
  if (floorPlanFilter) params.floorPlanId = floorPlanFilter

  const { data: unitsData, isLoading } = useQuery({
    queryKey: ['standalone-units', selectedProject, page, search, statusFilter, typeFilter, blockFilter, floorPlanFilter],
    queryFn: () => projectsAPI.listUnits(selectedProject, params),
    enabled: !!selectedProject,
  })

  const { data: blocks = [] } = useQuery({
    queryKey: ['project-blocks', selectedProject],
    queryFn: () => projectsAPI.listBlocks(selectedProject),
    enabled: !!selectedProject,
  })

  const { data: floorPlans = [] } = useQuery({
    queryKey: ['project-floor-plans', selectedProject],
    queryFn: () => projectsAPI.listFloorPlans(selectedProject),
    enabled: !!selectedProject,
  })

  const units = unitsData?.data || []
  const pagination = unitsData?.pagination

  const deleteMutation = useMutation({
    mutationFn: (unitId: string) => projectsAPI.deleteUnit(selectedProject, unitId),
    onSuccess: () => {
      toast.success('Unidade excluída com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['standalone-units', selectedProject] })
      queryClient.invalidateQueries({ queryKey: ['project-units', selectedProject] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      setDeleteDialogOpen(false)
      setUnitToDelete(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir unidade')
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (unitIds: string[]) => projectsAPI.bulkDeleteUnits(selectedProject, unitIds),
    onSuccess: (result: any) => {
      toast.success(result.message || 'Unidades excluídas com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['standalone-units', selectedProject] })
      queryClient.invalidateQueries({ queryKey: ['project-units', selectedProject] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      setSelectedIds(new Set())
      setBulkDeleteDialogOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir unidades')
    },
  })

  const toggleSelectUnit = (unitId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(unitId)) {
        next.delete(unitId)
      } else {
        next.add(unitId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === units.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(units.map((u: any) => u.id)))
    }
  }

  const handleEdit = (unit: any) => {
    setEditingUnit(unit)
    setShowFormDialog(true)
  }

  const handleDeleteClick = (unit: any) => {
    setUnitToDelete(unit)
    setDeleteDialogOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    setShowFormDialog(open)
    if (!open) {
      setEditingUnit(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Workflow Stepper */}
      {phaseParam ? (
        <WorkflowStepper phase={parseInt(phaseParam, 10)} />
      ) : (
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </button>
      )}

      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Unidades</h1>
        <p className="text-neutral-500 mt-1">Gerencie plantas, blocos e unidades dos seus projetos.</p>
      </div>

      {/* Project Selector */}
      <div className="w-[300px]">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um projeto" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedProject ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-16">
          <Home className="h-12 w-12 text-neutral-300" />
          <h3 className="mt-4 text-lg font-medium text-neutral-900">Selecione um projeto</h3>
          <p className="mt-2 text-sm text-neutral-500">
            Escolha um projeto acima para gerenciar suas unidades.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="units" className="space-y-4">
          <TabsList>
            <TabsTrigger value="floor-plans">Plantas</TabsTrigger>
            <TabsTrigger value="blocks">Blocos</TabsTrigger>
            <TabsTrigger value="units">Unidades</TabsTrigger>
          </TabsList>

          <TabsContent value="floor-plans">
            <FloorPlanManager projectId={selectedProject} />
          </TabsContent>

          <TabsContent value="blocks">
            <BlockManager projectId={selectedProject} />
          </TabsContent>

          <TabsContent value="units" className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <h3 className="text-lg font-medium text-neutral-900">
                  Unidades {pagination ? `(${pagination.total})` : ''}
                </h3>
                <FormTooltip text="Código único da unidade dentro do projeto" />
              </div>
              <div className="flex gap-2">
                {canCreate && (
                  <>
                    <Button variant="outline" onClick={() => setShowWizard(true)}>
                      <Layers className="mr-2 h-4 w-4" />
                      Gerar em Lote
                    </Button>
                    <Button onClick={() => { setEditingUnit(null); setShowFormDialog(true) }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Unidade
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Buscar por código..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'ALL' ? '' : v); setPage(1) }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Status</SelectItem>
                  {Object.entries(unitStatusLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === 'ALL' ? '' : v); setPage(1) }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Tipos</SelectItem>
                  {Object.entries(unitTypeLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {blocks.length > 0 && (
                <Select value={blockFilter} onValueChange={(v) => { setBlockFilter(v === 'ALL' ? '' : v); setPage(1) }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Bloco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os Blocos</SelectItem>
                    {blocks.map((block: any) => (
                      <SelectItem key={block.id} value={block.id}>{block.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {floorPlans.length > 0 && (
                <Select value={floorPlanFilter} onValueChange={(v) => { setFloorPlanFilter(v === 'ALL' ? '' : v); setPage(1) }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Planta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas as Plantas</SelectItem>
                    {floorPlans.map((fp: any) => (
                      <SelectItem key={fp.id} value={fp.id}>{fp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Bulk Selection Action Bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
                <span className="text-sm font-medium text-neutral-700">
                  {selectedIds.size} unidade(s) selecionada(s)
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Selecionados
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <X className="mr-2 h-4 w-4" />
                  Limpar Seleção
                </Button>
              </div>
            )}

            {/* Table or Empty State */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : units.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-12">
                <Home className="h-12 w-12 text-neutral-300" />
                <h3 className="mt-4 text-lg font-medium text-neutral-900">
                  Nenhuma unidade cadastrada
                </h3>
                <p className="mt-2 text-sm text-neutral-500">
                  Nenhuma unidade cadastrada. Use 'Gerar em Lote' para criar várias unidades de uma vez.
                </p>
                {canCreate && (
                  <div className="mt-6 flex gap-3">
                    <Button variant="outline" onClick={() => setShowWizard(true)}>
                      <Layers className="mr-2 h-4 w-4" />
                      Gerar em Lote
                    </Button>
                    <Button onClick={() => { setEditingUnit(null); setShowFormDialog(true) }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Unidade
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {canDelete && (
                          <TableHead className="w-[40px]">
                            <Checkbox
                              checked={units.length > 0 && selectedIds.size === units.length}
                              onChange={toggleSelectAll}
                            />
                          </TableHead>
                        )}
                        <TableHead>
                          <div className="flex items-center gap-1">
                            Código
                            <FormTooltip text="Código único da unidade dentro do projeto" />
                          </div>
                        </TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Bloco</TableHead>
                        <TableHead>Planta</TableHead>
                        <TableHead>Andar</TableHead>
                        <TableHead>Área (m²)</TableHead>
                        <TableHead>Quartos</TableHead>
                        <TableHead>Preço</TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            Status
                            <FormTooltip text="Disponível = à venda · Reservado = com proposta · Vendido = contrato assinado · Bloqueado = indisponível" />
                          </div>
                        </TableHead>
                        {(canEdit || canDelete) && <TableHead>Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map((unit: any) => (
                        <TableRow key={unit.id}>
                          {canDelete && (
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(unit.id)}
                                onChange={() => toggleSelectUnit(unit.id)}
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{unit.code}</TableCell>
                          <TableCell>{unitTypeLabel[unit.type] || unit.type}</TableCell>
                          <TableCell>{unit.block?.name || '-'}</TableCell>
                          <TableCell>{unit.floorPlan?.name || '-'}</TableCell>
                          <TableCell>{unit.floor ?? '-'}</TableCell>
                          <TableCell>{unit.area}</TableCell>
                          <TableCell>{unit.bedrooms ?? '-'}</TableCell>
                          <TableCell>{formatCurrency(unit.price)}</TableCell>
                          <TableCell>
                            <Badge variant={unitStatusVariant[unit.status]}>
                              {unitStatusLabel[unit.status]}
                            </Badge>
                          </TableCell>
                          {(canEdit || canDelete) && (
                            <TableCell>
                              <div className="flex gap-1">
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEdit(unit)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-neutral-400 hover:text-destructive"
                                    onClick={() => handleDeleteClick(unit)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-500">
                      Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                      {pagination.total} unidades
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page <= 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => setPage(page + 1)}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Concluir button */}
          {phaseParam && (
            <div className="flex items-center justify-end pt-4 pb-2">
              <Button
                size="lg"
                className="gap-2 text-white font-semibold shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #b8a378, #9a8a6a)',
                }}
                onClick={() => {
                  const nextPhase = parseInt(phaseParam, 10) + 1
                  navigate(nextPhase <= 8 ? `/?phase=${nextPhase}` : '/')
                }}
              >
                <CheckCircle2 className="h-5 w-5" />
                Concluir Etapa
              </Button>
            </div>
          )}

          {/* Form Dialog */}
          <UnitFormDialog
            projectId={selectedProject}
            open={showFormDialog}
            onOpenChange={handleFormClose}
            unit={editingUnit}
          />

          {/* Bulk Generate Wizard */}
          <BulkGenerateWizard
            projectId={selectedProject}
            open={showWizard}
            onOpenChange={setShowWizard}
          />

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Excluir Unidade</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-neutral-600">
                Tem certeza que deseja excluir a unidade{' '}
                <strong>{unitToDelete?.code}</strong>? Esta ação não pode ser desfeita.
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false)
                    setUnitToDelete(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => unitToDelete && deleteMutation.mutate(unitToDelete.id)}
                >
                  {deleteMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Excluir
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Bulk Delete Confirmation Dialog */}
          <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Excluir Unidades em Lote</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-neutral-600">
                Tem certeza que deseja excluir{' '}
                <strong>{selectedIds.size} unidade(s)</strong>? Esta ação é irreversível
                e não pode ser desfeita.
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setBulkDeleteDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  disabled={bulkDeleteMutation.isPending}
                  onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
                >
                  {bulkDeleteMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Excluir {selectedIds.size} unidade(s)
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Tabs>
      )}
    </div>
  )
}
