import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { projectsAPI } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  XCircle,
  ChevronsRight,
  ExternalLink,
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
  route: string | null // null = coming soon
}

const PHASES: Phase[] = [
  {
    number: 1,
    name: 'Planejamento',
    icon: ClipboardList,
    description:
      'Criação do projeto, definição de escopo, plantas baixas e orçamento preliminar da obra.',
    route: '/projects',
  },
  {
    number: 2,
    name: 'Levantamento',
    icon: Calculator,
    description:
      'Quantificação de materiais, serviços e insumos necessários para execução.',
    route: '/suppliers',
  },
  {
    number: 3,
    name: 'Contratação',
    icon: FileSignature,
    description:
      'Cotações, seleção de fornecedores e formalização dos contratos de serviço e material.',
    route: '/purchases',
  },
  {
    number: 4,
    name: 'Mobilização',
    icon: HardHat,
    description:
      'Seleção, contratação e preparação dos empreiteiros para início da execução.',
    route: '/contractors',
  },
  {
    number: 5,
    name: 'Documentação',
    icon: ShieldCheck,
    description:
      'Conferência de documentos, seguros, certidões, alvarás e habilitações dos envolvidos.',
    route: null,
  },
  {
    number: 6,
    name: 'Execução',
    icon: Hammer,
    description:
      'Acompanhamento da obra em campo — vistorias, relatórios de progresso e controle de qualidade.',
    route: '/projects',
  },
  {
    number: 7,
    name: 'Medição',
    icon: Ruler,
    description:
      'Aferição do trabalho executado, aprovação das medições e liberação de pagamentos parciais.',
    route: '/projects',
  },
  {
    number: 8,
    name: 'Encerramento',
    icon: CheckCircle2,
    description:
      'Termo de quitação contratual, aceite definitivo e entrega formal da obra.',
    route: '/brokers',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GOLD = '#b8a378'
const GOLD_DARK = '#9a8a6a'
const GRAY = '#d4d4d4'

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

function getNodeState(phaseNumber: number, currentPhase: number): NodeState {
  if (currentPhase === 0) return 'future'
  if (phaseNumber < currentPhase) return 'completed'
  if (phaseNumber === currentPhase) return 'current'
  return 'future'
}

function stateLabel(state: NodeState, isPaused: boolean): string {
  if (state === 'completed') return 'Concluído'
  if (state === 'current') return isPaused ? 'Pausado' : 'Em andamento'
  return 'Pendente'
}

function stateBadgeClass(state: NodeState, isPaused: boolean): string {
  if (state === 'completed') return 'bg-green-100 text-green-700'
  if (state === 'current')
    return isPaused ? 'bg-yellow-100 text-yellow-700' : 'bg-amber-100 text-amber-700'
  return 'bg-neutral-100 text-neutral-400'
}

// ---------------------------------------------------------------------------
// Desktop flow node — rounded square with gradient
// ---------------------------------------------------------------------------

function FlowNode({
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
  const isComingSoon = phase.route === null

  let bgStyle: React.CSSProperties = {}
  let borderClass = ''
  let iconEl: React.ReactNode

  if (isCancelled) {
    bgStyle = { backgroundColor: '#d4d4d4' }
    borderClass = 'border-neutral-400'
    iconEl = <XCircle className="h-6 w-6 text-white" />
  } else if (state === 'completed') {
    bgStyle = { background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DARK} 100%)` }
    iconEl = <Check className="h-6 w-6 text-white" />
  } else if (state === 'current') {
    bgStyle = { borderColor: GOLD }
    borderClass = 'border-2 bg-white'
    iconEl = isPaused ? (
      <Pause className="h-6 w-6" style={{ color: GOLD }} />
    ) : (
      <Icon className="h-6 w-6" style={{ color: GOLD }} />
    )
  } else {
    borderClass = 'border border-dashed border-neutral-300 bg-neutral-50'
    iconEl = <Icon className="h-6 w-6 text-neutral-300" />
  }

  const ringClass = isSelected
    ? 'ring-2 ring-offset-2'
    : ''

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2.5 focus:outline-none transition-transform duration-200 hover:scale-105 group ${
        isComingSoon ? 'opacity-60' : ''
      }`}
    >
      {/* Number badge */}
      <span
        className={`text-[10px] font-bold tracking-widest ${
          state === 'future' && !isCancelled ? 'text-neutral-300' : 'text-neutral-400'
        }`}
      >
        {String(phase.number).padStart(2, '0')}
      </span>

      {/* Icon container */}
      <div
        className={`relative w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center
          transition-all duration-300 shadow-sm ${borderClass} ${ringClass}
          ${state === 'current' ? 'animate-pulse shadow-md' : ''}
          ${state === 'completed' ? 'shadow-md' : ''}
        `}
        style={{
          ...bgStyle,
          ...(isSelected ? { ringColor: GOLD, '--tw-ring-color': GOLD } as React.CSSProperties : {}),
        }}
      >
        {iconEl}
        {!isComingSoon && (
          <ExternalLink className="absolute -top-1 -right-1 h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {/* Name + Coming Soon badge */}
      <div className="flex flex-col items-center gap-1">
        <span
          className={`text-xs font-medium text-center leading-tight max-w-[80px] ${
            isCancelled
              ? 'text-neutral-400'
              : state === 'current'
                ? 'text-neutral-900 font-semibold'
                : state === 'completed'
                  ? 'text-neutral-700'
                  : 'text-neutral-400'
          }`}
        >
          {phase.name}
        </span>
        {isComingSoon && (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-400">
            Em breve
          </span>
        )}
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Desktop horizontal connector
// ---------------------------------------------------------------------------

function FlowConnector({ filled }: { filled: boolean }) {
  return (
    <div className="flex-1 flex items-center mx-0.5 lg:mx-1 -mt-3">
      {filled ? (
        <div
          className="h-[3px] w-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_DARK})` }}
        />
      ) : (
        <div
          className="h-[3px] w-full"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, ${GRAY} 0px, ${GRAY} 6px, transparent 6px, transparent 12px)`,
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile flow node — horizontal card style
// ---------------------------------------------------------------------------

function MobileFlowNode({
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
  const isComingSoon = phase.route === null

  let dotStyle: React.CSSProperties = {}
  let dotClass = ''
  let iconEl: React.ReactNode

  if (isCancelled) {
    dotStyle = { backgroundColor: '#d4d4d4', borderColor: '#a3a3a3' }
    iconEl = <XCircle className="h-4 w-4 text-white" />
  } else if (state === 'completed') {
    dotStyle = { background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, borderColor: GOLD }
    iconEl = <Check className="h-4 w-4 text-white" />
  } else if (state === 'current') {
    dotStyle = { borderColor: GOLD }
    dotClass = 'bg-white animate-pulse'
    iconEl = isPaused ? (
      <Pause className="h-4 w-4" style={{ color: GOLD }} />
    ) : (
      <Icon className="h-4 w-4" style={{ color: GOLD }} />
    )
  } else {
    dotClass = 'bg-white border-dashed border-neutral-300'
    iconEl = <Icon className="h-4 w-4 text-neutral-300" />
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 text-left w-full focus:outline-none p-2 -mx-2 rounded-lg transition-colors duration-200 group ${
        isSelected ? 'bg-neutral-50' : ''
      } ${isComingSoon ? 'opacity-60' : ''}`}
    >
      {/* Rail */}
      <div className="flex flex-col items-center">
        <div
          className={`h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-xl border-2 ${dotClass}`}
          style={dotStyle}
        >
          {iconEl}
        </div>
        {!isLast && (
          <div
            className="w-[3px] flex-1 min-h-[20px] mt-1 rounded-full"
            style={
              state === 'completed' || state === 'current'
                ? { background: `linear-gradient(180deg, ${GOLD}, ${GOLD_DARK})` }
                : {
                    backgroundImage: `repeating-linear-gradient(180deg, ${GRAY} 0px, ${GRAY} 4px, transparent 4px, transparent 8px)`,
                  }
            }
          />
        )}
      </div>

      {/* Text */}
      <div className="pt-0.5 pb-2 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-semibold ${
              state === 'future' && !isCancelled ? 'text-neutral-400' : 'text-neutral-900'
            }`}
          >
            {phase.number}. {phase.name}
          </span>
          {isCancelled ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-500">
              Cancelado
            </span>
          ) : (
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${stateBadgeClass(state, isPaused)}`}
            >
              {stateLabel(state, isPaused)}
            </span>
          )}
          {isComingSoon && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-400">
              Em breve
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed line-clamp-2">
          {phase.description}
        </p>
      </div>

      {/* Navigate indicator */}
      {!isComingSoon && (
        <ExternalLink className="h-3.5 w-3.5 text-neutral-300 mt-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Phase description card (bottom grid)
// ---------------------------------------------------------------------------

function PhaseDescriptionCard({
  phase,
  state,
  isPaused,
  isCancelled,
  onClick,
}: {
  phase: Phase
  state: NodeState
  isPaused: boolean
  isCancelled: boolean
  onClick: () => void
}) {
  const Icon = phase.icon
  const isCurrent = state === 'current'
  const isComingSoon = phase.route === null

  const borderLeft = isCancelled
    ? 'border-l-neutral-300'
    : state === 'completed'
      ? 'border-l-[#b8a378]'
      : isCurrent
        ? 'border-l-[#b8a378]'
        : 'border-l-neutral-200'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className={`flex gap-4 p-4 rounded-xl border border-l-4 transition-all duration-300 cursor-pointer group ${borderLeft} ${
        isCurrent
          ? 'bg-[#b8a378]/5 shadow-sm border-[#b8a378]/30'
          : 'bg-white border-neutral-100 hover:shadow-sm'
      } ${isComingSoon ? 'opacity-60' : 'hover:shadow-md'}`}
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
          isCancelled
            ? 'bg-neutral-100'
            : state === 'completed' || isCurrent
              ? 'bg-[#b8a378]/10'
              : 'bg-neutral-50'
        }`}
      >
        <Icon
          className="h-5 w-5"
          style={{
            color:
              isCancelled
                ? '#a3a3a3'
                : state === 'completed' || isCurrent
                  ? GOLD
                  : '#a3a3a3',
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3
            className={`text-sm font-semibold ${
              state === 'future' && !isCancelled ? 'text-neutral-500' : 'text-neutral-800'
            }`}
          >
            {phase.number}. {phase.name}
          </h3>
          {isCancelled ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-500">
              Cancelado
            </span>
          ) : state !== 'future' ? (
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${stateBadgeClass(state, isPaused)}`}
            >
              {stateLabel(state, isPaused)}
            </span>
          ) : null}
          {isComingSoon && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-400">
              Em breve
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
          {phase.description}
        </p>
      </div>
      {!isComingSoon && (
        <ExternalLink className="h-3.5 w-3.5 text-neutral-300 mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function Dashboard() {
  const { user, tenant } = useAuthStore()
  const navigate = useNavigate()

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedPhaseIdx, setSelectedPhaseIdx] = useState(0)

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

  function handlePhaseClick(phase: Phase) {
    if (phase.route === null) {
      toast.info('Módulo em desenvolvimento — em breve!')
      return
    }
    if (phase.route === '/projects' && selectedProjectId) {
      navigate(`/projects/${selectedProjectId}`)
    } else {
      navigate(phase.route)
    }
  }

  const row1 = PHASES.slice(0, 4)
  const row2 = PHASES.slice(4, 8)

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">
            Bem-vindo, {user?.name}!
          </h1>
          <p className="mt-1 text-neutral-600">{tenant?.name}</p>
        </div>
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

      {/* ── Infographic Flow (Desktop) ─────────────────────────────── */}
      <div className="hidden md:block">
        <Card className="overflow-hidden border-0 shadow-lg">
          {/* Gradient background */}
          <div
            className="p-8 lg:p-10"
            style={{
              background:
                'linear-gradient(135deg, #fafaf9 0%, #ffffff 40%, rgba(184,163,120,0.06) 100%)',
            }}
          >
            <div className="flex items-center gap-2 mb-10">
              <h2 className="text-lg font-semibold text-neutral-800">
                Fluxo da Obra
              </h2>
              {selectedProject && (
                <span className="text-sm text-neutral-400">
                  &mdash; {selectedProject.name}
                </span>
              )}
            </div>

            {/* Row 1: phases 1-4 */}
            <div className="flex items-start">
              {row1.map((phase, idx) => {
                const phaseState = isCancelled
                  ? ('future' as NodeState)
                  : getNodeState(phase.number, currentPhase)
                return (
                  <div
                    key={phase.number}
                    className={`flex items-start ${idx < row1.length - 1 ? 'flex-1' : ''}`}
                  >
                    <FlowNode
                      phase={phase}
                      state={phaseState}
                      isSelected={selectedPhaseIdx === idx}
                      onClick={() => { setSelectedPhaseIdx(idx); handlePhaseClick(phase) }}
                      isPaused={isPaused && phase.number === currentPhase}
                      isCancelled={isCancelled}
                    />
                    {idx < row1.length - 1 && (
                      <FlowConnector
                        filled={!isCancelled && currentPhase > 0 && phase.number < currentPhase}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Row transition */}
            <div className="flex items-center gap-3 my-6 px-2">
              <div className="flex-1 h-px bg-neutral-200/80" />
              <ChevronsRight className="h-4 w-4 text-neutral-300 rotate-90" />
              <div className="flex-1 h-px bg-neutral-200/80" />
            </div>

            {/* Row 2: phases 5-8 */}
            <div className="flex items-start">
              {row2.map((phase, idx) => {
                const globalIdx = idx + 4
                const phaseState = isCancelled
                  ? ('future' as NodeState)
                  : getNodeState(phase.number, currentPhase)
                return (
                  <div
                    key={phase.number}
                    className={`flex items-start ${idx < row2.length - 1 ? 'flex-1' : ''}`}
                  >
                    <FlowNode
                      phase={phase}
                      state={phaseState}
                      isSelected={selectedPhaseIdx === globalIdx}
                      onClick={() => { setSelectedPhaseIdx(globalIdx); handlePhaseClick(phase) }}
                      isPaused={isPaused && phase.number === currentPhase}
                      isCancelled={isCancelled}
                    />
                    {idx < row2.length - 1 && (
                      <FlowConnector
                        filled={!isCancelled && currentPhase > 0 && phase.number < currentPhase}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Infographic Flow (Mobile) ──────────────────────────────── */}
      <div className="md:hidden">
        <Card className="overflow-hidden border-0 shadow-lg">
          <div
            className="p-5"
            style={{
              background:
                'linear-gradient(135deg, #fafaf9 0%, #ffffff 40%, rgba(184,163,120,0.06) 100%)',
            }}
          >
            <h2 className="text-lg font-semibold text-neutral-800 mb-5">
              Fluxo da Obra
            </h2>
            <div className="flex flex-col">
              {PHASES.map((phase, idx) => {
                const phaseState = isCancelled
                  ? ('future' as NodeState)
                  : getNodeState(phase.number, currentPhase)
                return (
                  <MobileFlowNode
                    key={phase.number}
                    phase={phase}
                    state={phaseState}
                    isSelected={selectedPhaseIdx === idx}
                    onClick={() => { setSelectedPhaseIdx(idx); handlePhaseClick(phase) }}
                    isPaused={isPaused && phase.number === currentPhase}
                    isCancelled={isCancelled}
                    isLast={idx === PHASES.length - 1}
                  />
                )
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Phase Descriptions ─────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-800 mb-4">
          Etapas da Obra
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {PHASES.map((phase) => {
            const phaseState = isCancelled
              ? ('future' as NodeState)
              : getNodeState(phase.number, currentPhase)
            return (
              <PhaseDescriptionCard
                key={phase.number}
                phase={phase}
                state={phaseState}
                isPaused={isPaused && phase.number === currentPhase}
                isCancelled={isCancelled}
                onClick={() => handlePhaseClick(phase)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
