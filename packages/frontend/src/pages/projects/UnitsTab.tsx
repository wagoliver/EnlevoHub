import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { projectsAPI } from '@/lib/api-client'
import { useRole } from '@/hooks/usePermission'
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
  Home,
  Loader2,
  Search,
  ArrowRight,
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

const activityStatusLabel: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
}

const activityStatusVariant: Record<string, string> = {
  PENDING: 'secondary',
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'completed',
}

const activityLevelLabel: Record<string, string> = {
  PHASE: 'Fase',
  STAGE: 'Etapa',
  ACTIVITY: 'Atividade',
}

interface UnitsTabProps {
  projectId: string
}

export function UnitsTab({ projectId }: UnitsTabProps) {
  const navigate = useNavigate()
  const role = useRole()
  const isContractor = role === 'CONTRACTOR'

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [blockFilter, setBlockFilter] = useState('')
  const [floorPlanFilter, setFloorPlanFilter] = useState('')

  const params: any = { page, limit: 50 }
  if (search) params.search = search
  if (statusFilter) params.status = statusFilter
  if (typeFilter) params.type = typeFilter
  if (blockFilter) params.blockId = blockFilter
  if (floorPlanFilter) params.floorPlanId = floorPlanFilter

  const { data, isLoading } = useQuery({
    queryKey: ['project-units', projectId, page, search, statusFilter, typeFilter, blockFilter, floorPlanFilter],
    queryFn: () => projectsAPI.listUnits(projectId, params),
  })

  const { data: blocks = [] } = useQuery({
    queryKey: ['project-blocks', projectId],
    queryFn: () => projectsAPI.listBlocks(projectId),
  })

  const { data: floorPlans = [] } = useQuery({
    queryKey: ['project-floor-plans', projectId],
    queryFn: () => projectsAPI.listFloorPlans(projectId),
  })

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
        <Button variant="outline" size="sm" onClick={() => navigate('/units')}>
          Gerenciar Unidades
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
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

      {/* Table or Empty State */}
      {units.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-12">
          <Home className="h-12 w-12 text-neutral-300" />
          <h3 className="mt-4 text-lg font-medium text-neutral-900">
            Nenhuma unidade cadastrada
          </h3>
          <p className="mt-2 text-sm text-neutral-500">
            Este projeto ainda não possui unidades. Acesse a página de Unidades para criar.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => navigate('/units')}>
            Gerenciar Unidades
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Planta</TableHead>
                  <TableHead>Bloco</TableHead>
                  <TableHead>Andar</TableHead>
                  <TableHead>Área (m²)</TableHead>
                  {isContractor ? (
                    <>
                      <TableHead>Tipo de Atividade</TableHead>
                      <TableHead>Status</TableHead>
                    </>
                  ) : (
                    <TableHead>Status</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit: any) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.code}</TableCell>
                    <TableCell>{unit.floorPlan?.name || '-'}</TableCell>
                    <TableCell>{unit.block?.name || '-'}</TableCell>
                    <TableCell>{unit.floor ?? '-'}</TableCell>
                    <TableCell>{unit.area ?? '-'}</TableCell>
                    {isContractor ? (
                      <>
                        <TableCell>
                          {unit.unitActivities?.length > 0
                            ? unit.unitActivities.map((ua: any) => (
                                <span key={ua.id} className="block text-sm">
                                  {ua.activity?.name}
                                  <span className="ml-1 text-xs text-neutral-400">
                                    ({activityLevelLabel[ua.activity?.level] || ua.activity?.level})
                                  </span>
                                </span>
                              ))
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {unit.unitActivities?.length > 0
                            ? unit.unitActivities.map((ua: any) => (
                                <span key={ua.id} className="block">
                                  <Badge variant={activityStatusVariant[ua.status] as any}>
                                    {activityStatusLabel[ua.status] || ua.status}
                                  </Badge>
                                </span>
                              ))
                            : '-'}
                        </TableCell>
                      </>
                    ) : (
                      <TableCell>
                        <Badge variant={unitStatusVariant[unit.status]}>
                          {unitStatusLabel[unit.status]}
                        </Badge>
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
  )
}
