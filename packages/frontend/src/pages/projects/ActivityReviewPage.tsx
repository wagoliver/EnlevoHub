import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI, levantamentoAPI } from '@/lib/api-client'
import { WorkflowStepper } from '@/components/WorkflowStepper'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Package,
  BarChart3,
  Database,
} from 'lucide-react'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Recursive row for review tree
function ReviewActivityRow({
  activity,
  depth,
  expandedRows,
  toggleRow,
}: {
  activity: any
  depth: number
  expandedRows: Set<string>
  toggleRow: (id: string) => void
}) {
  const isExpanded = expandedRows.has(activity.id)
  const hasChildren = activity.children && activity.children.length > 0
  const isLeaf = !hasChildren

  const levelStyles: Record<string, string> = {
    PHASE: 'bg-neutral-50 font-semibold',
    STAGE: 'bg-neutral-25 font-medium',
    ACTIVITY: '',
  }

  // Coverage badge
  let coverageBadge: React.ReactNode
  if (isLeaf) {
    if (activity.itemCount > 0) {
      coverageBadge = (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          Coberta ({activity.itemCount} {activity.itemCount === 1 ? 'item' : 'itens'})
        </Badge>
      )
    } else {
      coverageBadge = (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
          Sem itens
        </Badge>
      )
    }
  } else {
    const leafCount = activity.leafCount || 0
    const coveredCount = activity.coveredCount || 0
    const pct = leafCount > 0 ? Math.round((coveredCount / leafCount) * 100) : 0
    coverageBadge = (
      <Badge
        className={
          pct === 100
            ? 'bg-green-100 text-green-700 border-green-200'
            : pct > 0
              ? 'bg-blue-100 text-blue-700 border-blue-200'
              : 'bg-yellow-100 text-yellow-700 border-yellow-200'
        }
      >
        {pct}% coberto
      </Badge>
    )
  }

  return (
    <>
      <TableRow
        className={`cursor-pointer hover:bg-neutral-50 ${levelStyles[activity.level] || ''}`}
        onClick={() => toggleRow(activity.id)}
      >
        <TableCell className="px-2" style={{ paddingLeft: `${depth * 20 + 8}px` }}>
          <div className="flex items-center gap-1">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-neutral-500 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-neutral-500 shrink-0" />
              )
            ) : (
              <span className="w-4" />
            )}
          </div>
        </TableCell>
        <TableCell>
          <div>
            <span className={activity.level === 'PHASE' ? 'font-semibold' : activity.level === 'STAGE' ? 'font-medium' : ''}>
              {activity.name}
            </span>
            {activity.level && activity.level !== 'ACTIVITY' && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                {activity.level === 'PHASE' ? 'Fase' : 'Etapa'}
              </Badge>
            )}
            {activity.sinapiCodigo && (
              <Badge variant="outline" className="ml-2 text-[10px] border-blue-300 text-blue-600">
                SINAPI {activity.sinapiCodigo}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center">
          {activity.itemCount}
        </TableCell>
        <TableCell className="text-right">
          {activity.totalCost > 0 ? formatCurrency(activity.totalCost) : '-'}
        </TableCell>
        <TableCell>
          {coverageBadge}
        </TableCell>
      </TableRow>

      {isExpanded && hasChildren && activity.children.map((child: any) => (
        <ReviewActivityRow
          key={child.id}
          activity={child}
          depth={depth + 1}
          expandedRows={expandedRows}
          toggleRow={toggleRow}
        />
      ))}
    </>
  )
}

export function ActivityReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const phaseParam = searchParams.get('phase')

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (rowId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsAPI.getById(id!),
    enabled: !!id,
  })

  const { data: reviewData, isLoading: loadingReview } = useQuery({
    queryKey: ['activity-review-summary', id],
    queryFn: () => projectsAPI.getReviewSummary(id!),
    enabled: !!id,
  })

  const isLoading = loadingProject || loadingReview

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

  const propagateMutation = useMutation({
    mutationFn: () => levantamentoAPI.propagateSinapi(id!),
    onSuccess: (data) => {
      if (data.created > 0) {
        toast.success(`${data.created} atividades criadas com código SINAPI`)
      } else {
        toast.info(data.message || 'Todas as atividades SINAPI já existem')
      }
      queryClient.invalidateQueries({ queryKey: ['activity-review-summary', id] })
      queryClient.invalidateQueries({ queryKey: ['project-activities', id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const summary = reviewData?.summary || { totalLeafActivities: 0, coveredActivities: 0, coveragePercentage: 0 }
  const activities = reviewData?.activities || []
  const hasUncovered = summary.totalLeafActivities > summary.coveredActivities

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
        <p className="mt-1 text-sm text-neutral-500">Revisão de Atividades</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-neutral-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Total de Atividades</p>
                <p className="text-2xl font-bold text-neutral-900">{summary.totalLeafActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Com Levantamento</p>
                <p className="text-2xl font-bold text-green-700">{summary.coveredActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Cobertura</p>
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-bold text-neutral-900">{summary.coveragePercentage}%</p>
                  <Progress value={summary.coveragePercentage} className="flex-1 h-2 min-w-[60px]" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Propagate SINAPI button */}
      {hasUncovered && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/60 p-4">
          <Database className="h-5 w-5 text-blue-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">
              Atividades sem cobertura detectadas
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Propague os códigos SINAPI dos templates para criar atividades vinculadas automaticamente.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-100 shrink-0"
            disabled={propagateMutation.isPending}
            onClick={() => propagateMutation.mutate()}
          >
            {propagateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-1.5" />
            )}
            Propagar SINAPI
          </Button>
        </div>
      )}

      {/* Activities tree table */}
      {activities.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-neutral-500">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
              <p className="text-lg font-medium">Nenhuma atividade cadastrada</p>
              <p className="mt-1 text-sm">Cadastre atividades na Fase 01 (Planejamento) para visualizar a cobertura.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Atividade</TableHead>
                <TableHead className="text-center w-24">Itens</TableHead>
                <TableHead className="text-right w-32">Custo Total</TableHead>
                <TableHead className="w-36">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity: any) => (
                <ReviewActivityRow
                  key={activity.id}
                  activity={activity}
                  depth={0}
                  expandedRows={expandedRows}
                  toggleRow={toggleRow}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

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
              const nextPhase = parseInt(phaseParam, 10) + 1
              navigate(nextPhase <= 8 ? `/?phase=${nextPhase}` : '/')
            }}
          >
            <CheckCircle2 className="h-5 w-5" />
            Concluir Revisão
          </Button>
        </div>
      )}
    </div>
  )
}
