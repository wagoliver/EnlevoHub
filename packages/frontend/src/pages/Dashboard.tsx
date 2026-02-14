import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { projectsAPI } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  Lightbulb,
  ArrowRight,
  FolderKanban,
  Users,
  ShoppingCart,
  DollarSign,
  FileText,
  Building2,
  BarChart3,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// Phase definitions
// ---------------------------------------------------------------------------

interface RelatedModule {
  label: string
  path: string
  icon: LucideIcon
}

interface Phase {
  number: number
  name: string
  icon: LucideIcon
  description: string
  longDescription: string
  checklist: string[]
  tip: string
  relatedModules: RelatedModule[]
}

const PHASES: Phase[] = [
  {
    number: 1,
    name: 'Planejamento',
    icon: ClipboardList,
    description:
      'Criação do projeto, definição de escopo, plantas baixas e orçamento preliminar da obra.',
    longDescription:
      'Nesta fase inicial, o projeto ganha forma: são definidos escopo, cronograma macro, plantas baixas e o orçamento preliminar. Um bom planejamento reduz retrabalhos e garante previsibilidade ao longo de toda a obra.',
    checklist: [
      'Definir escopo e objetivos do projeto',
      'Elaborar plantas e memorial descritivo',
      'Estimar orçamento preliminar',
      'Criar cronograma macro de fases',
      'Registrar o projeto no sistema',
    ],
    tip: 'Comece cadastrando o projeto no módulo de Projetos — isso desbloqueia todas as outras funcionalidades da plataforma.',
    relatedModules: [
      { label: 'Projetos', path: '/projects', icon: FolderKanban },
      { label: 'Planejamentos', path: '/settings/planejamentos', icon: ClipboardList },
    ],
  },
  {
    number: 2,
    name: 'Levantamento',
    icon: Calculator,
    description:
      'Quantificação de materiais, serviços e insumos necessários para execução.',
    longDescription:
      'Com o projeto definido, é hora de quantificar tudo o que será necessário: materiais, serviços e insumos. Um levantamento detalhado evita compras desnecessárias e garante que nada falte durante a execução.',
    checklist: [
      'Listar materiais por etapa da obra',
      'Quantificar serviços e mão de obra',
      'Levantar insumos e equipamentos',
      'Comparar com orçamento preliminar',
      'Validar quantitativos com engenheiro',
    ],
    tip: 'Utilize o módulo de Compras para já iniciar cotações à medida que o levantamento avança.',
    relatedModules: [
      { label: 'Compras', path: '/purchases', icon: ShoppingCart },
      { label: 'Fornecedores', path: '/suppliers', icon: Users },
    ],
  },
  {
    number: 3,
    name: 'Contratação',
    icon: FileSignature,
    description:
      'Cotações, seleção de fornecedores e formalização dos contratos de serviço e material.',
    longDescription:
      'Fase de negociação e formalização: cotações são comparadas, fornecedores selecionados e contratos assinados. Uma contratação bem-feita protege o projeto contra atrasos e custos inesperados.',
    checklist: [
      'Solicitar no mínimo 3 cotações por item',
      'Comparar preços, prazos e condições',
      'Selecionar fornecedores e negociar',
      'Formalizar contratos de fornecimento',
      'Registrar pedidos de compra no sistema',
    ],
    tip: 'Cadastre fornecedores no módulo dedicado antes de emitir pedidos — isso agiliza futuras cotações.',
    relatedModules: [
      { label: 'Fornecedores', path: '/suppliers', icon: Users },
      { label: 'Compras', path: '/purchases', icon: ShoppingCart },
      { label: 'Contratos', path: '/contracts', icon: FileText },
    ],
  },
  {
    number: 4,
    name: 'Mobilização',
    icon: HardHat,
    description:
      'Seleção, contratação e preparação dos empreiteiros para início da execução.',
    longDescription:
      'Hora de montar a equipe de campo: empreiteiros são selecionados, contratados e preparados para iniciar os trabalhos. A mobilização define o ritmo e a qualidade da execução.',
    checklist: [
      'Selecionar empreiteiros qualificados',
      'Negociar valores e condições de trabalho',
      'Formalizar contratos de empreitada',
      'Agendar mobilização no canteiro',
      'Verificar documentação dos trabalhadores',
    ],
    tip: 'Use o módulo de Empreiteiros para avaliar histórico e desempenho antes de contratar.',
    relatedModules: [
      { label: 'Empreiteiros', path: '/contractors', icon: HardHat },
      { label: 'Projetos', path: '/projects', icon: FolderKanban },
    ],
  },
  {
    number: 5,
    name: 'Documentação',
    icon: ShieldCheck,
    description:
      'Conferência de documentos, seguros, certidões, alvarás e habilitações dos envolvidos.',
    longDescription:
      'Antes de iniciar a obra é essencial garantir que toda a documentação esteja em ordem: alvarás, seguros, certidões e habilitações. Isso protege a empresa legalmente e evita embargos.',
    checklist: [
      'Verificar alvará de construção',
      'Conferir seguros obrigatórios',
      'Validar certidões dos fornecedores',
      'Checar habilitações dos empreiteiros',
      'Organizar pasta documental do projeto',
    ],
    tip: 'Mantenha os documentos digitalizados nos cadastros de fornecedores e empreiteiros para consulta rápida.',
    relatedModules: [
      { label: 'Fornecedores', path: '/suppliers', icon: Users },
      { label: 'Empreiteiros', path: '/contractors', icon: HardHat },
      { label: 'Projetos', path: '/projects', icon: FolderKanban },
    ],
  },
  {
    number: 6,
    name: 'Execução',
    icon: Hammer,
    description:
      'Acompanhamento da obra em campo — vistorias, relatórios de progresso e controle de qualidade.',
    longDescription:
      'A obra está em andamento: esta fase exige acompanhamento constante com vistorias, relatórios de progresso e controle rigoroso de qualidade. É onde o planejamento se transforma em resultado.',
    checklist: [
      'Realizar vistorias periódicas',
      'Registrar diário de obra',
      'Acompanhar cronograma de atividades',
      'Controlar qualidade dos serviços',
      'Atualizar progresso no sistema',
    ],
    tip: 'Acesse o detalhe do projeto para acompanhar atividades e progresso em tempo real.',
    relatedModules: [
      { label: 'Projetos', path: '/projects', icon: FolderKanban },
      { label: 'Desempenho', path: '/performance', icon: BarChart3 },
    ],
  },
  {
    number: 7,
    name: 'Medição',
    icon: Ruler,
    description:
      'Aferição do trabalho executado, aprovação das medições e liberação de pagamentos parciais.',
    longDescription:
      'Com os serviços executados, é hora de medir: aferir o trabalho realizado, aprovar as medições e liberar pagamentos parciais. Medições precisas mantêm o fluxo financeiro saudável.',
    checklist: [
      'Aferir serviços executados no período',
      'Comparar com contrato e cronograma',
      'Aprovar ou contestar medição',
      'Liberar pagamento parcial',
      'Registrar no módulo financeiro',
    ],
    tip: 'Use o módulo Financeiro para controlar pagamentos e manter o fluxo de caixa atualizado.',
    relatedModules: [
      { label: 'Financeiro', path: '/financial', icon: DollarSign },
      { label: 'Empreiteiros', path: '/contractors', icon: HardHat },
    ],
  },
  {
    number: 8,
    name: 'Encerramento',
    icon: CheckCircle2,
    description:
      'Termo de quitação contratual, aceite definitivo e entrega formal da obra.',
    longDescription:
      'Fase final: o trabalho é aceito formalmente, termos de quitação são assinados e a obra é entregue. Um encerramento organizado protege contra pendências futuras e fecha o ciclo do projeto.',
    checklist: [
      'Realizar vistoria final completa',
      'Emitir termo de aceite definitivo',
      'Assinar quitação contratual',
      'Arquivar documentação completa',
      'Encerrar projeto no sistema',
    ],
    tip: 'Após o encerramento, consulte Relatórios para analisar indicadores e aprender com o projeto concluído.',
    relatedModules: [
      { label: 'Projetos', path: '/projects', icon: FolderKanban },
      { label: 'Financeiro', path: '/financial', icon: DollarSign },
      { label: 'Unidades', path: '/units', icon: Building2 },
    ],
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
      className="flex flex-col items-center gap-2.5 focus:outline-none transition-transform duration-200 hover:scale-105 group"
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
      </div>

      {/* Name */}
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
      className={`flex items-start gap-3 text-left w-full focus:outline-none p-2 -mx-2 rounded-lg transition-colors duration-200 ${
        isSelected ? 'bg-neutral-50' : ''
      }`}
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
        </div>
        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed line-clamp-2">
          {phase.description}
        </p>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Compact phase item (left column list)
// ---------------------------------------------------------------------------

function CompactPhaseItem({
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

  const iconColor = isCancelled
    ? '#a3a3a3'
    : state === 'completed' || state === 'current'
      ? GOLD
      : '#a3a3a3'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left w-full transition-all duration-200 border-l-[3px] ${
        isSelected
          ? 'border-l-[#b8a378] bg-[#b8a378]/5'
          : 'border-l-transparent hover:bg-neutral-50'
      }`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isCancelled
            ? 'bg-neutral-100'
            : state === 'completed' || state === 'current'
              ? 'bg-[#b8a378]/10'
              : 'bg-neutral-50'
        }`}
      >
        <Icon className="h-4 w-4" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium block truncate ${
            isCancelled
              ? 'text-neutral-400'
              : state === 'future'
                ? 'text-neutral-400'
                : 'text-neutral-800'
          }`}
        >
          {String(phase.number).padStart(2, '0')}. {phase.name}
        </span>
      </div>
      {isCancelled ? (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-500 flex-shrink-0">
          Cancelado
        </span>
      ) : (
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${stateBadgeClass(state, isPaused)}`}
        >
          {stateLabel(state, isPaused)}
        </span>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Phase detail panel (right column)
// ---------------------------------------------------------------------------

function PhaseDetailPanel({
  phase,
  state,
  isPaused,
  isCancelled,
}: {
  phase: Phase
  state: NodeState
  isPaused: boolean
  isCancelled: boolean
}) {
  const navigate = useNavigate()
  const Icon = phase.icon

  const iconColor = isCancelled
    ? '#a3a3a3'
    : state === 'completed' || state === 'current'
      ? GOLD
      : '#a3a3a3'

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
            isCancelled
              ? 'bg-neutral-100'
              : state === 'completed' || state === 'current'
                ? 'bg-[#b8a378]/10'
                : 'bg-neutral-50'
          }`}
        >
          <Icon className="h-6 w-6" style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-neutral-900">
              {String(phase.number).padStart(2, '0')}. {phase.name}
            </h3>
            {isCancelled ? (
              <Badge variant="secondary" className="bg-neutral-200 text-neutral-500 text-[10px]">
                Cancelado
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className={`text-[10px] ${stateBadgeClass(state, isPaused)}`}
              >
                {stateLabel(state, isPaused)}
              </Badge>
            )}
          </div>
          <p className="text-sm text-neutral-600 mt-1 leading-relaxed">
            {phase.longDescription}
          </p>
        </div>
      </div>

      <Separator />

      {/* Checklist */}
      <div>
        <h4 className="text-sm font-semibold text-neutral-700 mb-2.5">
          Checklist da fase
        </h4>
        <ul className="space-y-2">
          {phase.checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-neutral-600">
              <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-md border border-neutral-200 bg-neutral-50 flex items-center justify-center">
                <span className="text-[10px] text-neutral-400 font-medium">{i + 1}</span>
              </div>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Tip */}
      <div className="flex gap-3 p-3.5 rounded-lg bg-amber-50/80 border border-amber-100">
        <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 leading-relaxed">
          {phase.tip}
        </p>
      </div>

      {/* Quick actions */}
      {phase.relatedModules.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-neutral-700 mb-2.5">
            Acesso rápido
          </h4>
          <div className="flex flex-wrap gap-2">
            {phase.relatedModules.map((mod) => {
              const ModIcon = mod.icon
              return (
                <Button
                  key={mod.path}
                  variant="outline"
                  size="sm"
                  className="gap-2 text-neutral-600 hover:text-neutral-900 hover:border-[#b8a378]/50"
                  onClick={() => navigate(`${mod.path}?phase=${phase.number}`)}
                >
                  <ModIcon className="h-4 w-4" />
                  {mod.label}
                  <ArrowRight className="h-3 w-3 ml-1 opacity-50" />
                </Button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function Dashboard() {
  const { user, tenant } = useAuthStore()
  const [searchParams] = useSearchParams()

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedPhaseIdx, setSelectedPhaseIdx] = useState(0)

  // Restore selected phase from query param (e.g. /?phase=3)
  useEffect(() => {
    const p = searchParams.get('phase')
    if (p) {
      const idx = parseInt(p, 10) - 1
      if (idx >= 0 && idx < 8) setSelectedPhaseIdx(idx)
    }
  }, [searchParams])

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
                      onClick={() => setSelectedPhaseIdx(idx)}
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
                      onClick={() => setSelectedPhaseIdx(globalIdx)}
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
                    onClick={() => setSelectedPhaseIdx(idx)}
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

      {/* ── Phase Details (Desktop: 2-col | Mobile: detail only) ──── */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-800 mb-4">
          Etapas da Obra
        </h2>

        {/* Desktop: compact list + detail panel */}
        <div className="hidden md:grid md:grid-cols-[320px_1fr] gap-4">
          {/* Left: compact phase list */}
          <Card className="p-2 h-fit border-neutral-200">
            <div className="space-y-0.5">
              {PHASES.map((phase, idx) => {
                const phaseState = isCancelled
                  ? ('future' as NodeState)
                  : getNodeState(phase.number, currentPhase)
                return (
                  <CompactPhaseItem
                    key={phase.number}
                    phase={phase}
                    state={phaseState}
                    isSelected={selectedPhaseIdx === idx}
                    onClick={() => setSelectedPhaseIdx(idx)}
                    isPaused={isPaused && phase.number === currentPhase}
                    isCancelled={isCancelled}
                  />
                )
              })}
            </div>
          </Card>

          {/* Right: detail panel */}
          <Card className="p-6 border-neutral-200">
            <PhaseDetailPanel
              key={selectedPhaseIdx}
              phase={PHASES[selectedPhaseIdx]}
              state={
                isCancelled
                  ? ('future' as NodeState)
                  : getNodeState(PHASES[selectedPhaseIdx].number, currentPhase)
              }
              isPaused={isPaused && PHASES[selectedPhaseIdx].number === currentPhase}
              isCancelled={isCancelled}
            />
          </Card>
        </div>

        {/* Mobile: detail panel below the flow chart */}
        <div className="md:hidden">
          <Card className="p-5 border-neutral-200">
            <PhaseDetailPanel
              key={selectedPhaseIdx}
              phase={PHASES[selectedPhaseIdx]}
              state={
                isCancelled
                  ? ('future' as NodeState)
                  : getNodeState(PHASES[selectedPhaseIdx].number, currentPhase)
              }
              isPaused={isPaused && PHASES[selectedPhaseIdx].number === currentPhase}
              isCancelled={isCancelled}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
