import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { projectsAPI } from '@/lib/api-client'
import { WorkflowStepper } from '@/components/WorkflowStepper'
import { MaterialsCalculator } from '@/pages/calculator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Home,
  MapPin,
  FolderOpen,
  Calculator,
} from 'lucide-react'

const statusLabels: Record<string, string> = {
  PLANNING: 'Planejamento',
  IN_PROGRESS: 'Em Andamento',
  PAUSED: 'Pausado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

export function ProjectLevantamento() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const phaseParam = searchParams.get('phase')

  // If no :id in URL, use local state for project selection
  const [selectedProject, setSelectedProject] = useState('')
  const activeProjectId = id || selectedProject

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => projectsAPI.getById(activeProjectId),
    enabled: !!activeProjectId,
  })

  // Load projects list only when no :id in URL
  const { data: projectsData } = useQuery({
    queryKey: ['projects-list-all'],
    queryFn: () => projectsAPI.list({ limit: 100 }),
    enabled: !id,
  })

  const projects = projectsData?.data || []

  // Loading project (only when :id is in URL)
  if (id && projectLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (id && !project) {
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
      {/* Navigation */}
      {phaseParam ? (
        <WorkflowStepper phase={parseInt(phaseParam, 10)} />
      ) : (
        <button
          onClick={() => navigate(id ? `/projects/${id}` : '/')}
          className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {id ? project?.name : 'Dashboard'}
        </button>
      )}

      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Calculadora de Materiais</h1>
        <p className="text-neutral-500 mt-1">
          Quantifique materiais e serviços necessários para cada ambiente do projeto.
        </p>
      </div>

      {/* No project selected — show project picker */}
      {!activeProjectId ? (
        <div>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-12">
              <Home className="h-10 w-10 text-neutral-300" />
              <p className="mt-3 text-sm text-neutral-500">
                Nenhum projeto cadastrado. Crie um projeto primeiro no Dashboard.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/?phase=1')}>
                Ir para o Dashboard
              </Button>
            </div>
          ) : (
            <>
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
                        <Calculator className="h-5 w-5 text-[#b8a378]" />
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
                  </button>
                ))}
              </div>

              <div className="text-center mt-8">
                <FolderOpen className="h-10 w-10 text-neutral-300 mx-auto" />
                <h3 className="mt-3 text-lg font-medium text-neutral-900">Selecione um projeto</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Escolha um projeto acima para acessar a calculadora de materiais.
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Project indicator (only when using local selector, not :id from URL) */}
          {!id && (
            <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50/50 px-4 py-2.5">
              <Home className="h-4 w-4 text-[#b8a378] flex-shrink-0" />
              <span className="text-sm font-medium text-neutral-800 flex-1 truncate">
                {project?.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-neutral-500 hover:text-neutral-700 flex-shrink-0 h-7"
                onClick={() => setSelectedProject('')}
              >
                Trocar projeto
              </Button>
            </div>
          )}

          <MaterialsCalculator projectId={activeProjectId} />

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
                  queryClient.invalidateQueries({ queryKey: ['workflow-check'] })
                  navigate(`/?phase=${phaseParam}`)
                }}
              >
                <CheckCircle2 className="h-5 w-5" />
                Concluir Levantamento
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
