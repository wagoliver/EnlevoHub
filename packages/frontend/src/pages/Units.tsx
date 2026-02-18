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
import { Separator } from '@/components/ui/separator'
import { UnitFormDialog } from './projects/UnitFormDialog'
import { FloorPlanManager } from './projects/FloorPlanManager'
import { BlockManager } from './projects/BlockManager'
import { BulkGenerateWizard } from './projects/BulkGenerateWizard'
import {
  Edit,
  Trash2,
  Home,
  Loader2,
  Search,
  Layers,
  X,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  FileImage,
  Building2,
  MapPin,
  FolderOpen,
} from 'lucide-react'
import { WorkflowStepper } from '@/components/WorkflowStepper'

const statusLabels: Record<string, string> = {
  PLANNING: 'Planejamento',
  IN_PROGRESS: 'Em Andamento',
  PAUSED: 'Pausado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

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

export function Units() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const phaseParam = searchParams.get('phase')
  const queryClient = useQueryClient()
  const canCreate = usePermission('units:create')
  const canEdit = usePermission('units:edit')
  const canDelete = usePermission('units:delete')

  const projectParam = searchParams.get('project')

  const [selectedProject, setSelectedProject] = useState(projectParam || '')
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
  const [wizardStep, setWizardStep] = useState(1) // 1=Plantas, 2=Blocos, 3=Unidades
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
        <h1 className="text-2xl font-bold text-neutral-900">Plantas, Blocos e Unidades</h1>
        <p className="text-neutral-500 mt-1">Defina a estrutura do projeto — modelos de planta, blocos/torres e unidades individuais.</p>
      </div>

      {!selectedProject ? (
        <div>
          <div className="text-center mb-6">
            <FolderOpen className="h-12 w-12 text-neutral-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-neutral-900">Selecione um projeto</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Escolha um projeto para gerenciar suas plantas, blocos e unidades.
            </p>
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-12">
              <Home className="h-10 w-10 text-neutral-300" />
              <p className="mt-3 text-sm text-neutral-500">
                Nenhum projeto cadastrado. Crie um projeto primeiro no Dashboard.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/?phase=1')}
              >
                Ir para o Dashboard
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProject(p.id)}
                  className="flex flex-col items-start gap-3 rounded-xl border-2 border-neutral-200 bg-white p-5 text-left transition-all duration-200 hover:border-[#b8a378] hover:shadow-md hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#b8a378]/10 flex items-center justify-center">
                      <Home className="h-5 w-5 text-[#b8a378]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-neutral-900 truncate">{p.name}</h4>
                      <Badge variant="secondary" className="text-[10px] mt-0.5">
                        {statusLabels[p.status as string] || p.status}
                      </Badge>
                    </div>
                  </div>
                  {p.address && (
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {p.address.neighborhood && `${p.address.neighborhood}, `}{p.address.city}/{p.address.state}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-neutral-400">
                    {(p._count?.units ?? 0) > 0 && (
                      <span>{p._count.units} unidade{p._count.units > 1 ? 's' : ''}</span>
                    )}
                    {(p._count?.units ?? 0) === 0 && (
                      <span>Sem unidades</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selected project indicator */}
          <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50/50 px-4 py-2.5">
            <Home className="h-4 w-4 text-[#b8a378] flex-shrink-0" />
            <span className="text-sm font-medium text-neutral-800 flex-1 truncate">
              {projects.find((p: any) => p.id === selectedProject)?.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-neutral-500 hover:text-neutral-700 flex-shrink-0 h-7"
              onClick={() => { setSelectedProject(''); setWizardStep(1) }}
            >
              Trocar projeto
            </Button>
          </div>

          {/* Wizard Stepper */}
          <div className="flex items-center justify-center gap-2">
            {[
              { step: 1, label: 'Plantas', icon: FileImage, count: floorPlans.length },
              { step: 2, label: 'Blocos', icon: Building2, count: blocks.length },
              { step: 3, label: 'Unidades', icon: Home, count: pagination?.total ?? units.length },
            ].map((s, idx) => {
              const isActive = wizardStep === s.step
              const isDone = wizardStep > s.step
              const StepIcon = s.icon
              return (
                <div key={s.step} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep(s.step)}
                    className="flex flex-col items-center gap-1.5 focus:outline-none group"
                  >
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                        ${isActive
                          ? 'bg-gradient-to-br from-[#b8a378] to-[#9a8a6a] text-white shadow-md scale-110'
                          : isDone
                            ? 'bg-gradient-to-br from-[#b8a378] to-[#9a8a6a] text-white'
                            : 'border-2 border-dashed border-neutral-300 bg-white text-neutral-400 group-hover:border-neutral-400'
                        }
                      `}
                    >
                      {isDone
                        ? <CheckCircle2 className="h-4 w-4" />
                        : isActive
                          ? <StepIcon className="h-4 w-4" />
                          : <span className="text-xs font-bold">{s.step}</span>
                      }
                    </div>
                    <span className={`text-xs font-medium transition-colors ${
                      isActive
                        ? 'text-neutral-900'
                        : isDone
                          ? 'text-neutral-600'
                          : 'text-neutral-400'
                    }`}>
                      {s.label}
                    </span>
                    {s.count > 0 && (
                      <span className={`text-[10px] -mt-1 ${isDone || isActive ? 'text-[#b8a378]' : 'text-neutral-400'}`}>
                        {s.count} cadastrado(s)
                      </span>
                    )}
                  </button>
                  {idx < 2 && (
                    <div className={`h-px w-12 mb-7 ${isDone ? 'bg-[#b8a378]' : 'bg-neutral-200'}`} />
                  )}
                </div>
              )
            })}
          </div>

          <Separator />

          {/* Step 1: Plantas */}
          {wizardStep === 1 && (
            <FloorPlanManager projectId={selectedProject} />
          )}

          {/* Step 2: Blocos */}
          {wizardStep === 2 && (
            <BlockManager projectId={selectedProject} />
          )}

          {/* Step 3: Unidades */}
          {wizardStep === 3 && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <h3 className="text-lg font-medium text-neutral-900">
                  Unidades {pagination ? `(${pagination.total})` : ''}
                </h3>
                <FormTooltip text="Código único da unidade dentro do projeto" />
              </div>
              {canCreate && (
                <Button variant="outline" onClick={() => setShowWizard(true)}>
                  <Layers className="mr-2 h-4 w-4" />
                  Gerar em Lote
                </Button>
              )}
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
                  <Button className="mt-6" variant="outline" onClick={() => setShowWizard(true)}>
                    <Layers className="mr-2 h-4 w-4" />
                    Gerar em Lote
                  </Button>
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
                        <TableHead>Planta</TableHead>
                        <TableHead>Bloco</TableHead>
                        <TableHead>Andar</TableHead>
                        <TableHead>Área (m²)</TableHead>
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
                          <TableCell>{unit.floorPlan?.name || '-'}</TableCell>
                          <TableCell>{unit.block?.name || '-'}</TableCell>
                          <TableCell>{unit.floor ?? '-'}</TableCell>
                          <TableCell>{unit.area ?? '-'}</TableCell>
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
          </div>
          )}

          {/* Wizard Navigation */}
          <Separator />
          <div className="flex items-center justify-between">
            {wizardStep > 1 ? (
              <Button
                variant="outline"
                size="default"
                className="gap-1.5 border-2 border-neutral-300 text-neutral-600 hover:border-[#b8a378] hover:text-neutral-800 font-medium"
                onClick={() => setWizardStep(wizardStep - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
            ) : (
              <div />
            )}
            {wizardStep < 3 ? (
              <Button
                size="default"
                className="gap-1.5 text-white font-semibold border-2 shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, #b8a378, #9a8a6a)',
                  borderColor: '#9a8a6a',
                }}
                onClick={() => setWizardStep(wizardStep + 1)}
              >
                Próximo
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : phaseParam ? (
              <Button
                size="default"
                className="gap-2 text-white font-semibold shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, #b8a378, #9a8a6a)',
                }}
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['workflow-check'] })
                  navigate(`/?phase=${phaseParam}`)
                }}
              >
                <CheckCircle2 className="h-5 w-5" />
                Concluir Etapa
              </Button>
            ) : (
              <div />
            )}
          </div>

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
        </div>
      )}
    </div>
  )
}
