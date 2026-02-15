import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { projectsAPI } from '@/lib/api-client'
import { WorkflowStepper } from '@/components/WorkflowStepper'
import { ActivitiesTab } from './ActivitiesTab'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ProjectActivities() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const phaseParam = searchParams.get('phase')

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsAPI.getById(id!),
    enabled: !!id,
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
        <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>
          Voltar para Projetos
        </Button>
      </div>
    )
  }

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
        <p className="mt-1 text-sm text-neutral-500">Atividades do projeto</p>
      </div>

      <ActivitiesTab projectId={id!} />

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
    </div>
  )
}
