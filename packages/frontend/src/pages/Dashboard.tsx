import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { projectsAPI } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Building2,
  Home,
  Users,
  DollarSign,
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
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// Phase definitions
// ---------------------------------------------------------------------------

interface Phase {
  number: number
  name: string
  icon: LucideIcon
  description: string
}

const PHASES: Phase[] = [
  {
    number: 1,
    name: 'Planejamento',
    icon: ClipboardList,
    description:
      'Criação do projeto, definição de escopo, plantas baixas e orçamento preliminar da obra.',
  },
  {
    number: 2,
    name: 'Levantamento',
    icon: Calculator,
    description:
      'Quantificação de materiais, serviços e insumos necessários para execução.',
  },
  {
    number: 3,
    name: 'Contratação',
    icon: FileSignature,
    description:
      'Cotações, seleção de fornecedores e formalização dos contratos de serviço e material.',
  },
  {
    number: 4,
    name: 'Mobilização',
    icon: HardHat,
    description:
      'Seleção, contratação e preparação dos empreiteiros para início da execução.',
  },
  {
    number: 5,
    name: 'Documentação',
    icon: ShieldCheck,
    description:
      'Conferência de documentos, seguros, certidões, alvarás e habilitações dos envolvidos.',
  },
  {
    number: 6,
    name: 'Execução',
    icon: Hammer,
    description:
      'Acompanhamento da obra em campo — vistorias, relatórios de progresso e controle de qualidade.',
  },
  {
    number: 7,
    name: 'Medição',
    icon: Ruler,
    description:
      'Aferição do trabalho executado, aprovação das medições e liberação de pagamentos parciais.',
  },
  {
    number: 8,
    name: 'Encerramento',
    icon: CheckCircle2,
    description:
      'Termo de quitação contratual, aceite definitivo e entrega formal da obra.',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the 1-indexed current phase (0 = neutral / no project). */
function getCurrentPhase(status?: string): number {
  switch (status) {
    case 'PLANNING':
      return 1
    case 'IN_PROGRESS':
      return 6
    case 'PAUSED':
      return 6
    case 'COMPLETED':
      return 8
    case 'CANCELLED':
      return 0
    default:
      return 0
  }
}

type NodeState = 'completed' | 'current' | 'future'

function getNodeState(
  phaseNumber: number,
  currentPhase: number,
): NodeState {
  if (currentPhase === 0) return 'future'
  if (phaseNumber < currentPhase) return 'completed'
  if (phaseNumber === currentPhase) return 'current'
  return 'future'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const GOLD = '#b8a378'
const GRAY = '#d4d4d4'

/** A single stepper node (desktop). */
function StepperNode({
  phase,
  state,
  isSelected,
  onClick,
  isPaused,
  isCancelled,
}: {
  phase: Phase
  state: NodeState
  isSelected: boolean
  onClick: () => void
  isPaused: boolean
  isCancelled: boolean
}) {
  const Icon = phase.icon

  const baseCircle =
    'relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer'

  let circleClass: string
  let iconEl: React.ReactNode

  if (isCancelled) {
    circleClass = `${baseCircle} h-12 w-12 bg-neutral-300 border-2 border-neutral-400`
    iconEl = <XCircle className="h-5 w-5 text-white" />
  } else if (state === 'completed') {
    circleClass = `${baseCircle} h-12 w-12 border-2`
    iconEl = <Check className="h-5 w-5 text-white" />
  } else if (state === 'current') {
    circleClass = `${baseCircle} h-14 w-14 border-[3px] animate-pulse`
    iconEl = isPaused ? (
      <Pause className="h-6 w-6" style={{ color: GOLD }} />
    ) : (
      <Icon className="h-6 w-6" style={{ color: GOLD }} />
    )
  } else {
    circleClass = `${baseCircle} h-12 w-12 border-2 border-dashed border-neutral-300 bg-white`
    iconEl = <Icon className="h-5 w-5 text-neutral-300" />
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 focus:outline-none group ${
        isSelected ? 'scale-105' : ''
      } transition-transform duration-200`}
    >
      <div
        className={circleClass}
        style={
          state === 'completed'
            ? { backgroundColor: GOLD, borderColor: GOLD }
            : state === 'current'
              ? { borderColor: GOLD, backgroundColor: 'white' }
              : undefined
        }
      >
        {iconEl}
      </div>
      <span
        className={`text-xs font-medium text-center leading-tight max-w-[80px] ${
          state === 'future' && !isCancelled
            ? 'text-neutral-400'
            : state === 'current'
              ? 'text-neutral-900 font-semibold'
              : 'text-neutral-600'
        }`}
      >
        {phase.name}
      </span>
    </button>
  )
}

/** Connecting line segment between two nodes (desktop). */
function ConnectorLine({ filled }: { filled: boolean }) {
  return (
    <div className="flex-1 flex items-center mx-1 mt-[-24px]">
      <div
        className="h-[3px] w-full rounded-full"
        style={
          filled
            ? { backgroundColor: GOLD }
            : {
                backgroundImage: `repeating-linear-gradient(90deg, ${GRAY} 0px, ${GRAY} 6px, transparent 6px, transparent 12px)`,
                backgroundSize: '12px 3px',
                height: '3px',
              }
        }
      />
    </div>
  )
}

/** Mobile stepper node (vertical layout). */
function MobileStepperNode({
  phase,
  state,
  isSelected,
  onClick,
  isPaused,
  isCancelled,
  isLast,
}: {
  phase: Phase
  state: NodeState
  isSelected: boolean
  onClick: () => void
  isPaused: boolean
  isCancelled: boolean
  isLast: boolean
}) {
  const Icon = phase.icon

  let dotColor: string
  let dotBorder: string
  let iconEl: React.ReactNode

  if (isCancelled) {
    dotColor = 'bg-neutral-300'
    dotBorder = 'border-neutral-400'
    iconEl = <XCircle className="h-4 w-4 text-white" />
  } else if (state === 'completed') {
    dotColor = ''
    dotBorder = ''
    iconEl = <Check className="h-4 w-4 text-white" />
  } else if (state === 'current') {
    dotColor = 'bg-white'
    dotBorder = ''
    iconEl = isPaused ? (
      <Pause className="h-4 w-4" style={{ color: GOLD }} />
    ) : (
      <Icon className="h-4 w-4" style={{ color: GOLD }} />
    )
  } else {
    dotColor = 'bg-white'
    dotBorder = 'border-dashed border-neutral-300'
    iconEl = <Icon className="h-4 w-4 text-neutral-300" />
  }

  const badgeLabel =
    state === 'completed'
      ? 'Concluído'
      : state === 'current'
        ? isPaused
          ? 'Pausado'
          : 'Em andamento'
        : 'Pendente'

  const badgeColor =
    state === 'completed'
      ? 'bg-green-100 text-green-700'
      : state === 'current'
        ? isPaused
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-amber-100 text-amber-700'
        : 'bg-neutral-100 text-neutral-500'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 text-left w-full focus:outline-none ${
        isSelected ? 'bg-neutral-50 rounded-lg' : ''
      } p-2 -m-2 transition-colors duration-200`}
    >
      {/* Timeline rail */}
      <div className="flex flex-col items-center">
        <div
          className={`h-9 w-9 flex items-center justify-center rounded-full border-2 ${dotColor} ${dotBorder} ${
            state === 'current' ? 'animate-pulse' : ''
          }`}
          style={
            state === 'completed'
              ? { backgroundColor: GOLD, borderColor: GOLD }
              : state === 'current'
                ? { borderColor: GOLD }
                : undefined
          }
        >
          {iconEl}
        </div>
        {!isLast && (
          <div
            className="w-[3px] flex-1 min-h-[24px] mt-1 rounded-full"
            style={
              state === 'completed' || state === 'current'
                ? { backgroundColor: GOLD }
                : {
                    backgroundImage: `repeating-linear-gradient(180deg, ${GRAY} 0px, ${GRAY} 4px, transparent 4px, transparent 8px)`,
                    backgroundSize: '3px 8px',
                  }
            }
          />
        )}
      </div>

      {/* Text */}
      <div className="pt-1 pb-3 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              state === 'future' && !isCancelled
                ? 'text-neutral-400'
                : 'text-neutral-900'
            }`}
          >
            {phase.number}. {phase.name}
          </span>
          {isCancelled ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-600">
              Cancelado
            </span>
          ) : (
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badgeColor}`}
            >
              {badgeLabel}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function Dashboard() {
  const { user, tenant } = useAuthStore()

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  )
  const [selectedPhaseIdx, setSelectedPhaseIdx] = useState(0) // 0-indexed

  // Fetch dashboard stats (existing endpoint)
  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => projectsAPI.getDashboardStats(),
  })

  // Fetch project list for the selector
  const { data: projectsData } = useQuery({
    queryKey: ['projects', { limit: 100 }],
    queryFn: () => projectsAPI.list({ limit: 100 }),
  })

  const projects = projectsData?.data || []

  const selectedProject = selectedProjectId
    ? projects.find((p: any) => p.id === selectedProjectId)
    : null

  const currentPhase = selectedProject
    ? getCurrentPhase(selectedProject.status)
    : 0

  const isPaused = selectedProject?.status === 'PAUSED'
  const isCancelled = selectedProject?.status === 'CANCELLED'

  const activePhase = PHASES[selectedPhaseIdx]

  // Mini stats
  const stats = [
    {
      title: 'Projetos Ativos',
      value: dashboardStats ? String(dashboardStats.projects.inProgress) : '...',
      icon: Building2,
      description: dashboardStats
        ? `${dashboardStats.projects.total} total`
        : 'Carregando...',
    },
    {
      title: 'Unidades',
      value: dashboardStats ? String(dashboardStats.units.total) : '...',
      icon: Home,
      description: dashboardStats
        ? `${dashboardStats.units.sold} vendida(s)`
        : 'Carregando...',
    },
    {
      title: 'Disponíveis',
      value: dashboardStats ? String(dashboardStats.units.available) : '...',
      icon: Users,
      description: dashboardStats
        ? `${dashboardStats.units.reserved} reservada(s)`
        : 'Carregando...',
    },
    {
      title: 'Em Planejamento',
      value: dashboardStats ? String(dashboardStats.projects.planning) : '...',
      icon: DollarSign,
      description: dashboardStats
        ? `${dashboardStats.projects.completed} concluído(s)`
        : 'Carregando...',
    },
  ]

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">
            Bem-vindo, {user?.name}!
          </h1>
          <p className="mt-1 text-neutral-600">{tenant?.name}</p>
        </div>

        {/* Project selector */}
        <div className="w-full sm:w-72">
          <Select
            value={selectedProjectId ?? 'none'}
            onValueChange={(v) => {
              setSelectedProjectId(v === 'none' ? null : v)
              setSelectedPhaseIdx(0)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar Projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Visão geral</SelectItem>
              {projects.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Stepper (Desktop) ─────────────────────────────────────────── */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="pt-8 pb-6 px-6">
            <div className="flex items-start">
              {PHASES.map((phase, idx) => (
                <div
                  key={phase.number}
                  className={`flex items-start ${idx < PHASES.length - 1 ? 'flex-1' : ''}`}
                >
                  <StepperNode
                    phase={phase}
                    state={
                      isCancelled ? 'future' : getNodeState(phase.number, currentPhase)
                    }
                    isSelected={selectedPhaseIdx === idx}
                    onClick={() => setSelectedPhaseIdx(idx)}
                    isPaused={isPaused && phase.number === currentPhase}
                    isCancelled={isCancelled}
                  />
                  {idx < PHASES.length - 1 && (
                    <ConnectorLine
                      filled={
                        !isCancelled &&
                        currentPhase > 0 &&
                        phase.number < currentPhase
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Stepper (Mobile) ──────────────────────────────────────────── */}
      <div className="md:hidden">
        <Card>
          <CardContent className="pt-6 pb-4 px-4">
            <div className="flex flex-col">
              {PHASES.map((phase, idx) => (
                <MobileStepperNode
                  key={phase.number}
                  phase={phase}
                  state={
                    isCancelled ? 'future' : getNodeState(phase.number, currentPhase)
                  }
                  isSelected={selectedPhaseIdx === idx}
                  onClick={() => setSelectedPhaseIdx(idx)}
                  isPaused={isPaused && phase.number === currentPhase}
                  isCancelled={isCancelled}
                  isLast={idx === PHASES.length - 1}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Phase detail card ─────────────────────────────────────────── */}
      <Card className="transition-all duration-300 overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: `${GOLD}20` }}
          >
            <activePhase.icon className="h-5 w-5" style={{ color: GOLD }} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">
              {activePhase.number}. {activePhase.name}
            </CardTitle>
            {selectedProject && !isCancelled && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  getNodeState(activePhase.number, currentPhase) === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : getNodeState(activePhase.number, currentPhase) === 'current'
                      ? isPaused
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-amber-100 text-amber-700'
                      : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {getNodeState(activePhase.number, currentPhase) === 'completed'
                  ? 'Concluído'
                  : getNodeState(activePhase.number, currentPhase) === 'current'
                    ? isPaused
                      ? 'Pausado'
                      : 'Em andamento'
                    : 'Pendente'}
              </span>
            )}
            {isCancelled && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-600">
                Cancelado
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-600 text-sm leading-relaxed">
            {activePhase.description}
          </p>
        </CardContent>
      </Card>

      {/* ── Mini Stats ────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
    </div>
  )
}
