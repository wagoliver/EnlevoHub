import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { projectsAPI } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProjectFormDialog } from './ProjectFormDialog'
import { ActivitiesTab } from './ActivitiesTab'
import { MeasurementsTab } from './MeasurementsTab'
import { ProgressOverview } from './ProgressOverview'
import {
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  DollarSign,
  Home,
  Loader2,
  TrendingUp,
  ShoppingCart,
  Landmark,
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

const unitTypeLabel: Record<string, string> = {
  APARTMENT: 'Apartamento',
  HOUSE: 'Casa',
  COMMERCIAL: 'Comercial',
  LAND: 'Terreno',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const canDelete = user?.role === 'ADMIN'
  const [showEditDialog, setShowEditDialog] = useState(false)

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsAPI.getById(id!),
    enabled: !!id,
  })

  const { data: stats } = useQuery({
    queryKey: ['project-stats', id],
    queryFn: () => projectsAPI.getStatistics(id!),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () => projectsAPI.delete(id!),
    onSuccess: () => {
      toast.success('Projeto excluído!')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      navigate('/projects')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h2 className="text-xl font-bold">Projeto não encontrado</h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/projects')}
        >
          Voltar para Projetos
        </Button>
      </div>
    )
  }

  const currentProgress = stats?.currentProgress ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/projects')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-900">
                {project.name}
              </h1>
              <Badge variant={statusVariant[project.status]}>
                {statusLabel[project.status]}
              </Badge>
            </div>
            {project.description && (
              <p className="mt-1 text-neutral-600">{project.description}</p>
            )}
          </div>
        </div>

        {(canEdit || canDelete) && (
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir este projeto?')) {
                    deleteMutation.mutate()
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso</CardTitle>
            <TrendingUp className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Progress value={currentProgress} className="flex-1 h-2" />
              <span className="text-lg font-bold">{currentProgress}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orçamento</CardTitle>
            <DollarSign className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatCurrency(project.budget)}
            </div>
            {stats && (
              <p className="text-xs text-neutral-500 mt-1">
                Gasto: {formatCurrency(stats.totalSpent)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unidades</CardTitle>
            <Home className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{project._count?.units || 0}</div>
            {stats && (
              <p className="text-xs text-neutral-500 mt-1">
                {stats.units.sold} vendida(s)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos de Compra</CardTitle>
            <ShoppingCart className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {stats?.purchaseOrders || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
          <TabsTrigger value="measurements">Medições</TabsTrigger>
          <TabsTrigger value="units">Unidades ({project._count?.units || 0})</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações do Projeto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium">Endereço</p>
                    <p className="text-sm text-neutral-600">
                      {project.address?.street}, {project.address?.number}
                      {project.address?.complement
                        ? ` - ${project.address.complement}`
                        : ''}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {project.address?.neighborhood} - {project.address?.city}/
                      {project.address?.state}
                    </p>
                    <p className="text-sm text-neutral-600">
                      CEP: {project.address?.zipCode}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium">Datas</p>
                    <div className="mt-1 space-y-1">
                      <p className="text-sm text-neutral-600">
                        Início:{' '}
                        {project.startDate
                          ? format(new Date(project.startDate), 'dd/MM/yyyy')
                          : 'Não definido'}
                      </p>
                      <p className="text-sm text-neutral-600">
                        Previsão:{' '}
                        {project.expectedEndDate
                          ? format(
                              new Date(project.expectedEndDate),
                              'dd/MM/yyyy'
                            )
                          : 'Não definida'}
                      </p>
                      {project.actualEndDate && (
                        <p className="text-sm text-neutral-600">
                          Conclusão:{' '}
                          {format(
                            new Date(project.actualEndDate),
                            'dd/MM/yyyy'
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <DollarSign className="mt-0.5 h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium">Orçamento</p>
                    <p className="text-lg font-bold text-neutral-900">
                      {formatCurrency(project.budget)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress Overview */}
            <ProgressOverview projectId={id!} />
          </div>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="mt-6">
          <ActivitiesTab projectId={id!} />
        </TabsContent>

        {/* Measurements Tab */}
        <TabsContent value="measurements" className="mt-6">
          <MeasurementsTab projectId={id!} />
        </TabsContent>

        {/* Units Tab */}
        <TabsContent value="units" className="mt-6">
          {project.units && project.units.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Andar</TableHead>
                    <TableHead>Área (m²)</TableHead>
                    <TableHead>Quartos</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.units.map((unit: any) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.code}</TableCell>
                      <TableCell>{unitTypeLabel[unit.type] || unit.type}</TableCell>
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
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-12">
              <Home className="h-12 w-12 text-neutral-300" />
              <h3 className="mt-4 text-lg font-medium text-neutral-900">
                Nenhuma unidade cadastrada
              </h3>
              <p className="mt-2 text-sm text-neutral-500">
                As unidades serão implementadas na próxima fase.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="mt-6">
          <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-12">
            <Landmark className="h-12 w-12 text-neutral-300" />
            <h3 className="mt-4 text-lg font-medium text-neutral-900">
              Módulo Financeiro
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              O módulo financeiro será implementado em uma fase posterior.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {showEditDialog && (
        <ProjectFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          project={project}
        />
      )}
    </div>
  )
}
