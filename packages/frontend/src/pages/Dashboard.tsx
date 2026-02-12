import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { projectsAPI } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  ClipboardList,
  Calculator,
  FileSignature,
  HardHat,
  ShieldCheck,
  Hammer,
  Ruler,
  CheckCircle2,
  Check,
  Pause,
  TrendingUp,
  Wallet,
  ListChecks,
  AlertCircle,
  ArrowRight,
  Activity,
  BarChart3,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────

const GOLD = '#b8a378'
const EMERALD = '#10b981'

interface Phase {
  number: number
  name: string
  icon: LucideIcon
  description: string
}

const PHASES: Phase[] = [
  { number: 1, name: 'Planejamento', icon: ClipboardList, description: 'Criação do projeto, definição de escopo, plantas baixas e orçamento preliminar da obra.' },
  { number: 2, name: 'Levantamento', icon: Calculator, description: 'Quantificação de materiais, serviços e insumos necessários para execução.' },
  { number: 3, name: 'Contratação', icon: FileSignature, description: 'Cotações, seleção de fornecedores e formalização dos contratos de serviço e material.' },
  { number: 4, name: 'Mobilização', icon: HardHat, description: 'Seleção, contratação e preparação dos empreiteiros para início da execução.' },
  { number: 5, name: 'Documentação', icon: ShieldCheck, description: 'Conferência de documentos, seguros, certidões, alvarás e habilitações dos envolvidos.' },
  { number: 6, name: 'Execução', icon: Hammer, description: 'Acompanhamento da obra em campo — vistorias, relatórios de progresso e controle de qualidade.' },
  { number: 7, name: 'Medição', icon: Ruler, description: 'Aferição do trabalho executado, aprovação das medições e liberação de pagamentos parciais.' },
  { number: 8, name: 'Encerramento', icon: CheckCircle2, description: 'Termo de quitação contratual, aceite definitivo e entrega formal da obra.' },
]

// ─── Helpers ─────────────────────────────────────────────────────

/** Returns 1-8 for active phases, 9 for COMPLETED (all done), 0 for neutral/cancelled. */
function getCurrentPhase(status?: string): number {
  switch (status) {
    case 'PLANNING': return 1
    case 'IN_PROGRESS': return 6
    case 'PAUSED': return 6
    case 'COMPLETED': return 9
    case 'CANCELLED': return 0
    default: return 0
  }
}

type NodeState = 'completed' | 'current' | 'future'

function getNodeState(phaseNumber: number, currentPhase: number): NodeState {
  if (currentPhase === 0) return 'future'
  if (phaseNumber < currentPhase) return 'completed'
  if (phaseNumber === currentPhase) return 'current'
  return 'future'
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function statusBadge(status?: string): { label: string; cls: string } {
  switch (status) {
    case 'PLANNING': return { label: 'Planejamento', cls: 'bg-blue-100 text-blue-700' }
    case 'IN_PROGRESS': return { label: 'Em andamento', cls: 'bg-emerald-100 text-emerald-700' }
    case 'PAUSED': return { label: 'Pausada', cls: 'bg-yellow-100 text-yellow-700' }
    case 'COMPLETED': return { label: 'Concluída', cls: 'bg-green-100 text-green-800' }
    case 'CANCELLED': return { label: 'Cancelada', cls: 'bg-red-100 text-red-700' }
    default: return { label: '', cls: '' }
  }
}

function deadlineLabel(project: any): { text: string; cls: string } {
  if (!project) return { text: '—', cls: 'text-neutral-400' }
  if (project.status === 'COMPLETED') return { text: 'Concluída', cls: 'text-emerald-600' }
  if (project.status === 'CANCELLED') return { text: 'Cancelada', cls: 'text-neutral-400' }
  if (project.status === 'PAUSED') return { text: 'Pausada', cls: 'text-yellow-600' }
  if (!project.expectedEndDate) return { text: 'No prazo', cls: 'text-emerald-600' }

  const now = new Date()
  const end = new Date(project.expectedEndDate)
  if (now > end) return { text: 'Atrasada', cls: 'text-rose-600' }

  const days = Math.ceil((end.getTime() - now.getTime()) / 86_400_000)
  if (days < 30) return { text: `${days}d restantes`, cls: 'text-amber-600' }
  return { text: 'No prazo', cls: 'text-emerald-600' }
}

// ─── Dashboard ───────────────────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate()

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedPhaseIdx, setSelectedPhaseIdx] = useState<number | null>(null)
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('30d')

  // ── Queries ──

  const { data: projectsData } = useQuery({
    queryKey: ['projects', { limit: 100 }],
    queryFn: () => projectsAPI.list({ limit: 100 }),
  })

  const { data: projectDetail } = useQuery({
    queryKey: ['project', selectedProjectId],
    queryFn: () => projectsAPI.getById(selectedProjectId!),
    enabled: !!selectedProjectId,
  })

  const projects = projectsData?.data || []
  const project: any = projectDetail || projects.find((p: any) => p.id === selectedProjectId) || null

  // ── Derived values ──

  const currentPhase = project ? getCurrentPhase(project.status) : 0
  const completedCount = currentPhase > 0 ? Math.min(currentPhase - 1, 8) : 0
  const progress: number = project?.currentProgress ?? project?.evolutions?.[0]?.percentage ?? 0
  const budget: number = project?.budget ?? 0
  const isCancelled = project?.status === 'CANCELLED'
  const isPaused = project?.status === 'PAUSED'
  const isCompleted = project?.status === 'COMPLETED'

  const badge = statusBadge(project?.status)
  const deadline = deadlineLabel(project)

  const nextPhaseIdx = currentPhase > 0 && currentPhase <= 8 ? currentPhase - 1 : 0
  const nextPhase = PHASES[nextPhaseIdx]
  const NextIcon = nextPhase.icon

  const chartData = (projectDetail?.evolutions || [])
    .slice()
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((e: any) => ({
      date: new Date(e.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      progresso: e.percentage,
    }))

  // ── Render ──

  return (
    <div className="space-y-6 pb-8">

      {/* ═══════════════════════ HEADER ═══════════════════════════ */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Dashboard Operacional
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Visão consolidada da obra &mdash; Atualizado em tempo real
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status badge */}
          {project && badge.label && (
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${badge.cls}`}>
              {badge.label}
            </span>
          )}

          {/* Period toggle */}
          <div className="flex bg-neutral-100 rounded-lg p-0.5">
            {([['today', 'Hoje'], ['7d', '7 dias'], ['30d', '30 dias']] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  period === key
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Project selector */}
          <div className="w-56">
            <Select
              value={selectedProjectId ?? 'none'}
              onValueChange={(v) => {
                setSelectedProjectId(v === 'none' ? null : v)
                setSelectedPhaseIdx(null)
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecionar obra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Todas as obras</SelectItem>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ KPI CARDS ════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progresso Físico */}
        <Card className="p-5 rounded-xl border-0 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Progresso Físico
              </p>
              <p className="text-3xl font-bold text-neutral-900 mt-1.5 tabular-nums">
                {project ? `${progress}%` : '—'}
              </p>
              {project && (
                <>
                  <div className="mt-3 h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${progress}%`, backgroundColor: EMERALD }}
                    />
                  </div>
                  <p className={`text-xs font-medium mt-2 ${deadline.cls}`}>
                    {deadline.text}
                  </p>
                </>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 ml-3">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </Card>

        {/* Orçamento */}
        <Card className="p-5 rounded-xl border-0 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Orçamento
              </p>
              <p className="text-3xl font-bold text-neutral-900 mt-1.5 tabular-nums truncate">
                {project && budget > 0 ? formatCurrency(budget) : '—'}
              </p>
              {project && budget > 0 && (
                <>
                  <div className="mt-3 h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    ~{formatCurrency(Math.round(budget * progress / 100))} executado
                  </p>
                </>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 ml-3">
              <Wallet className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Etapas Concluídas */}
        <Card className="p-5 rounded-xl border-0 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Etapas Concluídas
              </p>
              <p className="text-3xl font-bold text-neutral-900 mt-1.5 tabular-nums">
                {project ? (
                  <>{completedCount}<span className="text-lg text-neutral-300 font-normal"> /8</span></>
                ) : '—'}
              </p>
              {project && (
                <div className="mt-3 h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${(completedCount / 8) * 100}%`, backgroundColor: '#8b5cf6' }}
                  />
                </div>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0 ml-3">
              <ListChecks className="h-5 w-5 text-violet-600" />
            </div>
          </div>
        </Card>

        {/* Pendências */}
        <Card className="p-5 rounded-xl border-0 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Pendências
              </p>
              <p className="text-3xl font-bold text-neutral-900 mt-1.5 tabular-nums">
                {project ? '0' : '—'}
              </p>
              {project && (
                <p className="text-xs text-emerald-600 font-medium mt-3">
                  Nenhuma pendência crítica
                </p>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 ml-3">
              <AlertCircle className="h-5 w-5 text-rose-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* ═══════════════════════ TIMELINE ═════════════════════════ */}
      <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
        <div className="p-6 lg:p-8">
          {/* Title + progress bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
            <h2 className="text-base font-semibold text-neutral-800">Fluxo da Obra</h2>
            {project && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${(completedCount / 8) * 100}%`, backgroundColor: EMERALD }}
                  />
                </div>
                <span className="text-xs text-neutral-500 whitespace-nowrap font-medium">
                  {completedCount} de 8 etapas
                </span>
              </div>
            )}
          </div>

          {/* Desktop: horizontal timeline */}
          <div className="hidden lg:block">
            <div className="flex items-start">
              {PHASES.map((phase, idx) => {
                const state = isCancelled ? 'future' as NodeState : getNodeState(phase.number, currentPhase)
                const isSelected = selectedPhaseIdx === idx
                const Icon = phase.icon
                return (
                  <div
                    key={phase.number}
                    className={`flex items-start ${idx < 7 ? 'flex-1' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPhaseIdx(isSelected ? null : idx)}
                      className="flex flex-col items-center gap-2.5 focus:outline-none group"
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110
                          ${state === 'completed' ? 'bg-emerald-500 text-white shadow-sm' : ''}
                          ${state === 'current' ? 'bg-white border-[3px]' : ''}
                          ${state === 'future' ? 'bg-white border-2 border-dashed border-neutral-200' : ''}
                          ${isSelected ? 'ring-2 ring-offset-2' : ''}
                        `}
                        style={{
                          ...(state === 'current' ? {
                            borderColor: GOLD,
                            boxShadow: `0 0 0 4px rgba(184,163,120,0.15), 0 4px 12px rgba(184,163,120,0.1)`,
                          } : {}),
                          ...(isSelected ? { '--tw-ring-color': GOLD } as React.CSSProperties : {}),
                        }}
                      >
                        {state === 'completed' ? (
                          <Check className="h-5 w-5" />
                        ) : state === 'current' ? (
                          isPaused
                            ? <Pause className="h-5 w-5" style={{ color: GOLD }} />
                            : <Icon className="h-5 w-5" style={{ color: GOLD }} />
                        ) : (
                          <span className="text-sm font-bold text-neutral-300">{phase.number}</span>
                        )}
                      </div>
                      <span className={`text-[11px] font-medium text-center leading-tight max-w-[76px] ${
                        state === 'completed' ? 'text-neutral-600' :
                        state === 'current' ? 'text-neutral-900 font-semibold' :
                        'text-neutral-400'
                      }`}>
                        {phase.name}
                      </span>
                    </button>

                    {/* Connector */}
                    {idx < 7 && (
                      <div className="flex-1 flex items-center mx-1 mt-[22px]">
                        <div
                          className="h-[2px] w-full rounded-full transition-all duration-500"
                          style={{
                            backgroundColor:
                              !isCancelled && currentPhase > 0 && phase.number < currentPhase
                                ? EMERALD
                                : '#e5e5e5',
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mobile/Tablet: compact grid */}
          <div className="lg:hidden grid grid-cols-4 gap-3">
            {PHASES.map((phase, idx) => {
              const state = isCancelled ? 'future' as NodeState : getNodeState(phase.number, currentPhase)
              const isSelected = selectedPhaseIdx === idx
              const Icon = phase.icon
              return (
                <button
                  key={phase.number}
                  type="button"
                  onClick={() => setSelectedPhaseIdx(isSelected ? null : idx)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all ${
                    isSelected ? 'bg-neutral-50 shadow-inner' : ''
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all
                      ${state === 'completed' ? 'bg-emerald-500 text-white' : ''}
                      ${state === 'current' ? 'bg-white border-2' : ''}
                      ${state === 'future' ? 'bg-neutral-100 text-neutral-300' : ''}
                    `}
                    style={state === 'current' ? { borderColor: GOLD, boxShadow: `0 0 0 3px rgba(184,163,120,0.15)` } : undefined}
                  >
                    {state === 'completed' ? (
                      <Check className="h-4 w-4" />
                    ) : state === 'current' ? (
                      <Icon className="h-4 w-4" style={{ color: GOLD }} />
                    ) : (
                      phase.number
                    )}
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${
                    state === 'future' ? 'text-neutral-400' : 'text-neutral-700'
                  }`}>
                    {phase.name}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Selected phase detail panel */}
          {selectedPhaseIdx !== null && (() => {
            const phase = PHASES[selectedPhaseIdx]
            const state = isCancelled ? 'future' as NodeState : getNodeState(phase.number, currentPhase)
            const Icon = phase.icon
            return (
              <div className="mt-6 p-5 bg-neutral-50/80 rounded-xl border border-neutral-100 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: state === 'completed' ? EMERALD : state === 'current' ? `${GOLD}18` : '#f5f5f5' }}
                  >
                    {state === 'completed'
                      ? <Check className="h-5 w-5 text-white" />
                      : <Icon className="h-5 w-5" style={{ color: state === 'current' ? GOLD : '#a3a3a3' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-neutral-800">
                        {phase.number}. {phase.name}
                      </h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        state === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        state === 'current' ? (isPaused ? 'bg-yellow-100 text-yellow-700' : 'bg-amber-100 text-amber-700') :
                        'bg-neutral-100 text-neutral-400'
                      }`}>
                        {state === 'completed' ? 'Concluída' : state === 'current' ? (isPaused ? 'Pausada' : 'Em andamento') : 'Pendente'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                      {phase.description}
                    </p>
                    {project && state === 'current' && (
                      <div className="flex items-center gap-4 mt-3 text-xs text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Activity className="h-3.5 w-3.5" /> Progresso: {progress}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </Card>

      {/* ═══════════════════════ NEXT ACTION + CHART ══════════════ */}
      <div className="grid gap-6 lg:grid-cols-12">

        {/* Próxima Ação */}
        <div className="lg:col-span-5">
          <Card
            className="h-full rounded-xl border-0 shadow-sm overflow-hidden"
            style={{ borderLeft: `4px solid ${GOLD}` }}
          >
            <div className="p-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-5">
                Próxima ação recomendada
              </p>

              {!project ? (
                <div className="py-10 text-center">
                  <Activity className="h-10 w-10 text-neutral-200 mx-auto mb-3" />
                  <p className="text-sm text-neutral-400">
                    Selecione uma obra para ver a próxima ação
                  </p>
                </div>
              ) : isCompleted ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-base font-semibold text-neutral-800">Obra concluída!</p>
                  <p className="text-sm text-neutral-500 mt-1">
                    Todas as etapas foram finalizadas com sucesso.
                  </p>
                </div>
              ) : isCancelled ? (
                <div className="py-10 text-center">
                  <AlertCircle className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                  <p className="text-base font-semibold text-neutral-600">Projeto cancelado</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${GOLD}15` }}
                    >
                      <NextIcon className="h-5 w-5" style={{ color: GOLD }} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-neutral-900">
                        {nextPhase.number}. {nextPhase.name}
                      </h3>
                      <p className={`text-xs font-medium ${deadline.cls}`}>{deadline.text}</p>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-500 leading-relaxed mb-6">
                    {nextPhase.description}
                  </p>
                  <Button
                    className="w-full text-white"
                    style={{ backgroundColor: GOLD }}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    {isPaused ? 'Retomar obra' : 'Continuar etapa'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Evolução Física (chart) */}
        <div className="lg:col-span-7">
          <Card className="h-full rounded-xl border-0 shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold text-neutral-800">Evolução Física</h2>
                <span className="text-[11px] text-neutral-400">% concluído ao longo do tempo</span>
              </div>

              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 16, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={EMERALD} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#a3a3a3' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: '#a3a3a3' }}
                      axisLine={false}
                      tickLine={false}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: 'none',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                        fontSize: 12,
                        padding: '8px 12px',
                      }}
                      formatter={(value: any) => [`${value}%`, 'Progresso']}
                    />
                    <Area
                      type="monotone"
                      dataKey="progresso"
                      stroke={EMERALD}
                      strokeWidth={2.5}
                      fill="url(#areaGrad)"
                      dot={{ r: 3, fill: EMERALD, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: EMERALD, strokeWidth: 2, stroke: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[240px] text-neutral-300">
                  <BarChart3 className="h-10 w-10 mb-3" />
                  <p className="text-sm">
                    {project ? 'Dados de evolução insuficientes' : 'Selecione uma obra'}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════ PHASE GRID ═══════════════════════ */}
      <div>
        <h2 className="text-base font-semibold text-neutral-800 mb-4">Etapas da Obra</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PHASES.map((phase) => {
            const state = isCancelled ? 'future' as NodeState : getNodeState(phase.number, currentPhase)
            const Icon = phase.icon
            const barColor = state === 'completed' ? EMERALD : state === 'current' ? GOLD : '#e5e5e5'
            const phaseProgress = state === 'completed' ? 100 : state === 'current' ? progress : 0

            return (
              <Card
                key={phase.number}
                className="rounded-xl border-0 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
                style={{ borderLeft: `3px solid ${barColor}` }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[22px] font-bold text-neutral-200 leading-none group-hover:text-neutral-300 transition-colors">
                      {String(phase.number).padStart(2, '0')}
                    </span>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: state === 'future' ? '#fafafa' : `${barColor}12` }}
                    >
                      <Icon
                        className="h-4 w-4"
                        style={{ color: state === 'future' ? '#d4d4d4' : barColor }}
                      />
                    </div>
                  </div>
                  <h3 className={`text-sm font-semibold mb-2 ${
                    state === 'future' ? 'text-neutral-400' : 'text-neutral-800'
                  }`}>
                    {phase.name}
                  </h3>
                  <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${phaseProgress}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed line-clamp-2">
                    {phase.description}
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
