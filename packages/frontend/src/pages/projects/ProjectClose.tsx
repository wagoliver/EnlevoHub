import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI } from '@/lib/api-client'
import { WorkflowStepper } from '@/components/WorkflowStepper'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react'

export function ProjectClose() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const phaseParam = searchParams.get('phase')

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsAPI.getById(id!),
    enabled: !!id,
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['project-stats', id],
    queryFn: () => projectsAPI.getStatistics(id!),
    enabled: !!id,
  })

  const closeMutation = useMutation({
    mutationFn: () => projectsAPI.update(id!, { status: 'COMPLETED' }),
    onSuccess: () => {
      toast.success('Projeto encerrado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      navigate('/')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  if (isLoading || statsLoading) {
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
        <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>
          Voltar para Projetos
        </Button>
      </div>
    )
  }

  const currentProgress = stats?.currentProgress ?? 0
  const isFullyComplete = currentProgress >= 100
  const alreadyClosed = project.status === 'COMPLETED'

  return (
    <div className="space-y-6">
      {phaseParam ? (
        <WorkflowStepper phase={parseInt(phaseParam, 10)} />
      ) : (
        <button
          onClick={() => navigate(`/projects/${id}`)}
          className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {project.name}
        </button>
      )}

      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{project.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">Encerramento do projeto</p>
      </div>

      <Card>
        <CardContent className="p-8">
          {alreadyClosed ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h3 className="mt-4 text-xl font-medium text-neutral-900">
                Projeto Encerrado
              </h3>
              <p className="mt-2 text-sm text-neutral-500 text-center max-w-md">
                Este projeto já foi encerrado com sucesso. Todas as atividades
                foram concluídas.
              </p>
            </div>
          ) : isFullyComplete ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h3 className="mt-4 text-xl font-medium text-neutral-900">
                Pronto para Encerramento
              </h3>
              <p className="mt-2 text-sm text-neutral-500 text-center max-w-md">
                Todas as atividades do projeto atingiram 100%. Você pode
                encerrar o projeto formalmente.
              </p>

              <div className="w-full max-w-xs mt-6">
                <div className="flex items-center gap-3">
                  <Progress value={100} className="flex-1 h-2" />
                  <span className="text-sm font-bold text-green-600">100%</span>
                </div>
              </div>

              <Button
                className="mt-8"
                size="lg"
                disabled={closeMutation.isPending}
                onClick={() => {
                  if (confirm('Tem certeza que deseja encerrar este projeto? Esta ação marca o projeto como concluído.')) {
                    closeMutation.mutate()
                  }
                }}
              >
                {closeMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Encerrar Projeto
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative">
                <AlertTriangle className="h-16 w-16 text-amber-400" />
                <Lock className="h-6 w-6 text-neutral-400 absolute -bottom-1 -right-1" />
              </div>
              <h3 className="mt-4 text-xl font-medium text-neutral-900">
                Encerramento Indisponível
              </h3>
              <p className="mt-2 text-sm text-neutral-500 text-center max-w-md">
                O projeto só pode ser encerrado quando todas as atividades
                atingirem 100% de progresso.
              </p>

              <div className="w-full max-w-xs mt-6">
                <div className="flex items-center gap-3">
                  <Progress value={currentProgress} className="flex-1 h-2" />
                  <span className="text-sm font-bold text-neutral-600">
                    {Math.round(currentProgress)}%
                  </span>
                </div>
                <p className="mt-2 text-xs text-neutral-400 text-center">
                  Progresso atual do projeto
                </p>
              </div>

              <Button
                variant="outline"
                className="mt-6"
                onClick={() => navigate(`/projects/${id}/activities${phaseParam ? `?phase=${phaseParam}` : ''}`)}
              >
                Ver Atividades
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
