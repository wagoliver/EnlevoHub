import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { UnitFormDialog } from './UnitFormDialog'
import {
  Plus,
  Edit,
  Trash2,
  Home,
  Loader2,
  Search,
} from 'lucide-react'

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
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

interface UnitsTabProps {
  projectId: string
}

export function UnitsTab({ projectId }: UnitsTabProps) {
  const queryClient = useQueryClient()
  const canCreate = usePermission('units:create')
  const canEdit = usePermission('units:edit')
  const canDelete = usePermission('units:delete')

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [editingUnit, setEditingUnit] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [unitToDelete, setUnitToDelete] = useState<any>(null)

  const params: any = { page, limit: 50 }
  if (search) params.search = search
  if (statusFilter) params.status = statusFilter
  if (typeFilter) params.type = typeFilter

  const { data, isLoading } = useQuery({
    queryKey: ['project-units', projectId, page, search, statusFilter, typeFilter],
    queryFn: () => projectsAPI.listUnits(projectId, params),
  })

  const deleteMutation = useMutation({
    mutationFn: (unitId: string) => projectsAPI.deleteUnit(projectId, unitId),
    onSuccess: () => {
      toast.success('Unidade excluída com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['project-units', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      queryClient.invalidateQueries({ queryKey: ['project-stats'] })
      setDeleteDialogOpen(false)
      setUnitToDelete(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir unidade')
    },
  })

  const handleEdit = (unit: any) => {
    setEditingUnit(unit)
    setShowFormDialog(true)
  }

  const handleDeleteClick = (unit: any) => {
    setUnitToDelete(unit)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (unitToDelete) {
      deleteMutation.mutate(unitToDelete.id)
    }
  }

  const handleFormClose = (open: boolean) => {
    setShowFormDialog(open)
    if (!open) {
      setEditingUnit(null)
    }
  }

  const units = data?.data || []
  const pagination = data?.pagination

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-neutral-900">
          Unidades {pagination ? `(${pagination.total})` : ''}
        </h3>
        {canCreate && (
          <Button onClick={() => { setEditingUnit(null); setShowFormDialog(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Unidade
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
      </div>

      {/* Table or Empty State */}
      {units.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-12">
          <Home className="h-12 w-12 text-neutral-300" />
          <h3 className="mt-4 text-lg font-medium text-neutral-900">
            Nenhuma unidade cadastrada
          </h3>
          <p className="mt-2 text-sm text-neutral-500">
            Adicione unidades para gerenciar os imóveis deste projeto.
          </p>
          {canCreate && (
            <Button className="mt-6" onClick={() => { setEditingUnit(null); setShowFormDialog(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeira Unidade
            </Button>
          )}
        </div>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Andar</TableHead>
                  <TableHead>Área (m²)</TableHead>
                  <TableHead>Quartos</TableHead>
                  <TableHead>Banheiros</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  {(canEdit || canDelete) && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit: any) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.code}</TableCell>
                    <TableCell>{unitTypeLabel[unit.type] || unit.type}</TableCell>
                    <TableCell>{unit.floor ?? '-'}</TableCell>
                    <TableCell>{unit.area}</TableCell>
                    <TableCell>{unit.bedrooms ?? '-'}</TableCell>
                    <TableCell>{unit.bathrooms ?? '-'}</TableCell>
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

      {/* Form Dialog */}
      <UnitFormDialog
        projectId={projectId}
        open={showFormDialog}
        onOpenChange={handleFormClose}
        unit={editingUnit}
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
              onClick={confirmDelete}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
