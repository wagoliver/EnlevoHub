import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { projectsAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProjectFormDialog } from './projects/ProjectFormDialog'
import {
  Plus,
  Search,
  Building2,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FolderOpen,
} from 'lucide-react'

const statusVariant: Record<string, any> = {
  PLANNING: 'planning',
  IN_PROGRESS: 'inProgress',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

const statusLabel: Record<string, string> = {
  PLANNING: 'Planejamento',
  IN_PROGRESS: 'Em Andamento',
  PAUSED: 'Pausado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function Projects() {
  const navigate = useNavigate()
  const canCreate = usePermission('projects:create')

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { page, search, status: statusFilter }],
    queryFn: () =>
      projectsAPI.list({
        page,
        limit: 9,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
  })

  const projects = data?.data || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Projetos</h1>
          <p className="mt-1 text-neutral-600">
            Gerencie seus projetos de construção
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Projeto
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Buscar projetos..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value === 'ALL' ? '' : value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            {Object.entries(statusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-16">
          <FolderOpen className="h-16 w-16 text-neutral-300" />
          <h3 className="mt-4 text-xl font-medium text-neutral-900">
            {search || statusFilter
              ? 'Nenhum projeto encontrado'
              : 'Nenhum projeto cadastrado'}
          </h3>
          <p className="mt-2 text-neutral-500">
            {search || statusFilter
              ? 'Tente ajustar os filtros de busca.'
              : 'Comece criando seu primeiro projeto.'}
          </p>
          {canCreate && !search && !statusFilter && (
            <Button className="mt-6" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Projeto
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Project Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: any) => {
              const progress =
                project.evolutions && project.evolutions.length > 0
                  ? project.evolutions[0].percentage
                  : 0

              return (
                <Card
                  key={project.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base line-clamp-1">
                          {project.name}
                        </CardTitle>
                      </div>
                      <Badge variant={statusVariant[project.status]}>
                        {statusLabel[project.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {project.description && (
                      <p className="text-sm text-neutral-600 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    <div className="flex items-center gap-1 text-sm text-neutral-500">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="line-clamp-1">
                        {project.address?.city}/{project.address?.state}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500">
                        {formatCurrency(project.budget)}
                      </span>
                      <span className="text-neutral-500">
                        {project._count?.units || 0} unid.
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-3">
                      <Progress value={progress} className="flex-1 h-2" />
                      <span className="text-sm font-medium text-neutral-700">
                        {progress}%
                      </span>
                    </div>

                    {project.startDate && (
                      <div className="flex items-center gap-1 text-xs text-neutral-400">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Início:{' '}
                          {new Date(project.startDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                Mostrando {projects.length} de {pagination.total} projetos
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-sm text-neutral-600">
                  {page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Dialog */}
      <ProjectFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  )
}
