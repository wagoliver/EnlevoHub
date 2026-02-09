import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { projectsAPI } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Building2, Users, Home, DollarSign, Plus, ArrowRight, MapPin } from 'lucide-react'

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

export function Dashboard() {
  const { user, tenant } = useAuthStore()
  const navigate = useNavigate()
  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => projectsAPI.getDashboardStats(),
  })

  const stats = [
    {
      title: 'Projetos Ativos',
      value: dashboardStats
        ? String(dashboardStats.projects.inProgress)
        : '...',
      icon: Building2,
      description: dashboardStats
        ? `${dashboardStats.projects.total} total`
        : 'Carregando...',
    },
    {
      title: 'Unidades',
      value: dashboardStats
        ? String(dashboardStats.units.total)
        : '...',
      icon: Home,
      description: dashboardStats
        ? `${dashboardStats.units.sold} vendida(s)`
        : 'Carregando...',
    },
    {
      title: 'Disponíveis',
      value: dashboardStats
        ? String(dashboardStats.units.available)
        : '...',
      icon: Users,
      description: dashboardStats
        ? `${dashboardStats.units.reserved} reservada(s)`
        : 'Carregando...',
    },
    {
      title: 'Em Planejamento',
      value: dashboardStats
        ? String(dashboardStats.projects.planning)
        : '...',
      icon: DollarSign,
      description: dashboardStats
        ? `${dashboardStats.projects.completed} concluído(s)`
        : 'Carregando...',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">
            Bem-vindo, {user?.name}!
          </h1>
          <p className="mt-2 text-neutral-600">
            {tenant?.name} &bull; Plano {tenant?.plan}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate('/projects')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Projeto
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-neutral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-neutral-500 mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Projects */}
      {dashboardStats?.recentProjects && dashboardStats.recentProjects.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Projetos Recentes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
              Ver todos
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardStats.recentProjects.map((project: any) => {
                const progress =
                  project.evolutions && project.evolutions.length > 0
                    ? project.evolutions[0].percentage
                    : (project.currentProgress ?? 0)

                return (
                  <div
                    key={project.id}
                    className="flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-neutral-50"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <Building2 className="h-10 w-10 text-primary p-2 bg-primary/10 rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-neutral-900 truncate">
                          {project.name}
                        </h3>
                        <Badge variant={statusVariant[project.status]}>
                          {statusLabel[project.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-neutral-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {project.address?.city}/{project.address?.state}
                        </span>
                        <span className="text-sm text-neutral-500">
                          {project._count?.units || 0} unid.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-32 flex-shrink-0">
                      <Progress value={progress} className="flex-1 h-2" />
                      <span className="text-sm font-medium w-10 text-right">
                        {progress}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : !isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Comece por aqui</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                onClick={() => navigate('/projects')}
              >
                <h3 className="font-medium text-neutral-900">
                  Crie seu primeiro projeto
                </h3>
                <p className="mt-1 text-sm text-neutral-600">
                  Comece criando um projeto para organizar suas obras
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <h3 className="font-medium text-neutral-900">
                  Cadastre fornecedores
                </h3>
                <p className="mt-1 text-sm text-neutral-600">
                  Adicione seus fornecedores e empreiteiros
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <h3 className="font-medium text-neutral-900">
                  Adicione unidades
                </h3>
                <p className="mt-1 text-sm text-neutral-600">
                  Cadastre as unidades dos seus projetos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
