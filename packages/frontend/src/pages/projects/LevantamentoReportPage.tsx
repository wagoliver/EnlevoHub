import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { projectsAPI, levantamentoAPI } from '@/lib/api-client'
import { WorkflowStepper } from '@/components/WorkflowStepper'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Printer,
  Package,
  Layers,
  Hash,
  DollarSign,
} from 'lucide-react'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function LevantamentoReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const phaseParam = searchParams.get('phase')

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsAPI.getById(id!),
    enabled: !!id,
  })

  const { data: reportData, isLoading: loadingReport } = useQuery({
    queryKey: ['levantamento-report', id],
    queryFn: () => levantamentoAPI.getReport(id!),
    enabled: !!id,
  })

  const isLoading = loadingProject || loadingReport

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

  const stats = reportData?.stats || { totalItens: 0, totalGeral: 0, totalAmbientes: 0, qtdEtapas: 0 }
  const items = (reportData?.items || []) as Array<{ id: string; nome: string; unidade: string; quantidade: number; precoUnitario: number; total: number; etapa: string | null; ambienteNome: string | null }>

  // Group items by etapa for display
  const groupedByEtapa = new Map<string, typeof items>()
  for (const item of items) {
    const key = item.etapa || '__sem_etapa__'
    if (!groupedByEtapa.has(key)) {
      groupedByEtapa.set(key, [])
    }
    groupedByEtapa.get(key)!.push(item)
  }

  // Sort: named etapas first (alphabetically), then sem etapa last
  const etapaKeys = Array.from(groupedByEtapa.keys()).sort((a, b) => {
    if (a === '__sem_etapa__') return 1
    if (b === '__sem_etapa__') return -1
    return a.localeCompare(b, 'pt-BR')
  })

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="print:hidden">
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
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{project.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">Relatório de Materiais</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 print:hidden"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                <Hash className="h-5 w-5 text-neutral-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Total de Itens</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.totalItens}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Ambientes</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.totalAmbientes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Layers className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Etapas</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.qtdEtapas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Custo Total</p>
                <p className="text-xl font-bold text-neutral-900">{formatCurrency(stats.totalGeral)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table grouped by etapa */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-neutral-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
              <p className="text-lg font-medium">Nenhum material cadastrado</p>
              <p className="mt-1 text-sm">Adicione materiais na Calculadora de Materiais para visualizar o relatório.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="print:border print:shadow-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material / Serviço</TableHead>
                <TableHead>Ambiente</TableHead>
                <TableHead className="text-center w-20">Unidade</TableHead>
                <TableHead className="text-right w-20">Qtd</TableHead>
                <TableHead className="text-right w-28">Preço Unit.</TableHead>
                <TableHead className="text-right w-28">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {etapaKeys.map((etapaKey) => {
                const etapaItems = groupedByEtapa.get(etapaKey)!
                const etapaLabel = etapaKey === '__sem_etapa__' ? 'Sem etapa' : etapaKey
                const etapaTotal = etapaItems.reduce((sum, i) => sum + i.total, 0)

                return (
                  <EtapaGroup
                    key={etapaKey}
                    label={etapaLabel}
                    items={etapaItems}
                    total={etapaTotal}
                  />
                )
              })}

              {/* Grand total row */}
              <TableRow className="bg-neutral-900 hover:bg-neutral-900">
                <TableCell colSpan={5} className="font-bold text-white">
                  Total Geral
                </TableCell>
                <TableCell className="text-right font-bold text-white">
                  {formatCurrency(stats.totalGeral)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Concluir button */}
      {phaseParam && (
        <div className="flex items-center justify-end pt-4 pb-2 print:hidden">
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
            Concluir
          </Button>
        </div>
      )}
    </div>
  )
}

function EtapaGroup({
  label,
  items,
  total,
}: {
  label: string
  items: any[]
  total: number
}) {
  return (
    <>
      {/* Etapa header row */}
      <TableRow className="bg-neutral-100 hover:bg-neutral-100">
        <TableCell colSpan={5} className="font-semibold text-neutral-800">
          {label}
          <span className="ml-2 text-xs font-normal text-neutral-500">
            ({items.length} {items.length === 1 ? 'item' : 'itens'})
          </span>
        </TableCell>
        <TableCell className="text-right font-semibold text-neutral-800">
          {formatCurrency(total)}
        </TableCell>
      </TableRow>

      {/* Item rows */}
      {items.map((item) => (
        <TableRow key={item.id}>
          <TableCell className="pl-6">{item.nome}</TableCell>
          <TableCell className="text-neutral-600">
            {item.ambienteNome || '(geral)'}
          </TableCell>
          <TableCell className="text-center text-neutral-600">{item.unidade}</TableCell>
          <TableCell className="text-right">{item.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}</TableCell>
          <TableCell className="text-right">{formatCurrency(item.precoUnitario)}</TableCell>
          <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
        </TableRow>
      ))}
    </>
  )
}
