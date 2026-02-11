import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { projectsAPI } from '@/lib/api-client'
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function Units() {
  const navigate = useNavigate()
  const [selectedProject, setSelectedProject] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list-all'],
    queryFn: () => projectsAPI.list({ limit: 100 }),
  })

  const projects = projectsData?.data || []

  const params: any = { page, limit: 50 }
  if (search) params.search = search
  if (statusFilter) params.status = statusFilter

  const { data: unitsData, isLoading } = useQuery({
    queryKey: ['standalone-units', selectedProject, page, search, statusFilter],
    queryFn: () => projectsAPI.listUnits(selectedProject, params),
    enabled: !!selectedProject,
  })

  const units = unitsData?.data || []
  const pagination = unitsData?.pagination

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Unidades</h1>
        <p className="text-neutral-500 mt-1">Visualize e gerencie as unidades de todos os projetos.</p>
      </div>

      {/* Project Selector */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-[300px]">
          <Select value={selectedProject} onValueChange={(v) => { setSelectedProject(v); setPage(1) }}>
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

        {selectedProject && (
          <>
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
                <SelectItem value="ALL">Todos</SelectItem>
                {Object.entries(unitStatusLabel).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${selectedProject}`)}>
              Ver Projeto
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {!selectedProject ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-16">
          <Home className="h-12 w-12 text-neutral-300" />
          <h3 className="mt-4 text-lg font-medium text-neutral-900">Selecione um projeto</h3>
          <p className="mt-2 text-sm text-neutral-500">
            Escolha um projeto acima para visualizar suas unidades.
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : units.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-12">
          <Home className="h-12 w-12 text-neutral-300" />
          <h3 className="mt-4 text-lg font-medium text-neutral-900">Nenhuma unidade encontrada</h3>
          <p className="mt-2 text-sm text-neutral-500">
            Este projeto ainda não possui unidades. Acesse o projeto para criar unidades.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => navigate(`/projects/${selectedProject}`)}>
            Ir para o Projeto
          </Button>
        </div>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Bloco</TableHead>
                  <TableHead>Planta</TableHead>
                  <TableHead>Andar</TableHead>
                  <TableHead>Área (m²)</TableHead>
                  <TableHead>Quartos</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit: any) => (
                  <TableRow key={unit.id}>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

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
