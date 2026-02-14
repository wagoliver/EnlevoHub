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
  Lightbulb,
  ArrowRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// Phase definitions
// ---------------------------------------------------------------------------

interface PhaseAction {
  label: string
  path: string
  /** When a project is selected, use this path instead (`:id` will be replaced) */
  projectPath?: string
  /** If true, this action requires a project to be selected */
  requiresProject: boolean
  /** Evaluates whether this action is already done */
  doneCheck?: (ctx: { projectId: string | null; project: any }) => boolean
}

interface Phase {
  number: number
  name: string
  icon: LucideIcon
  description: string
  longDescription: string
  checklist: string[]
  tip: string
  actions: PhaseAction[]
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
      'Definir plantas, blocos e unidades',
      'Estimar orçamento preliminar',
      'Criar cronograma macro de fases',
      'Registrar o projeto no sistema',
    ],
    tip: 'Comece criando o projeto — isso desbloqueia todas as outras funcionalidades da plataforma.',
    actions: [
      { label: 'Criar Projeto', path: '/projects', requiresProject: false, doneCheck: ({ projectId }) => !!projectId },
      { label: 'Definir Plantas e Unidades', path: '/units', requiresProject: true, doneCheck: ({ project }) => (project?._count?.units ?? 0) > 0 },
      { label: 'Associar Atividades ao Projeto', path: '/projects', projectPath: '/projects/:id/activities', requiresProject: true, doneCheck: ({ project }) => (project?._count?.activities ?? 0) > 0 },
    ],
  },
  {
    number: 2,
    name: 'Levantamento',
    icon: Calculator,
    description:
      'Quantificação de materiais, serviços e insumos necessários para execução.',
    longDescription:
      'Com o projeto definido, é hora de quantificar tudo o que será necessário: materiais, serviços e insumos. Use a Calculadora de Materiais para criar levantamentos manuais ou baseados na tabela SINAPI, com preços de referência por estado e mês.',
    checklist: [
      'Listar materiais por etapa da obra',
      'Quantificar serviços e mão de obra',
      'Levantar insumos e equipamentos',
      'Consultar preços SINAPI de referência',
      'Validar quantitativos com engenheiro',
    ],
    tip: 'Use a Calculadora de Materiais na aba "Levantamento" do projeto para criar orçamentos com preços SINAPI ou valores próprios.',
    actions: [
      { label: 'Calculadora de Materiais', path: '/projects', projectPath: '/projects/:id', requiresProject: true },
      { label: 'Revisar atividades do projeto', path: '/projects', projectPath: '/projects/:id/activities', requiresProject: true },
    ],
  },
  {
    number: 3,
    name: 'Contratação',
    icon: FileSignature,
    description:
      'Cotações, seleção de fornecedores e formalização dos contratos de serviço e material.',
    longDescription:
      'Fase de negociação e formalização: cotações são comparadas, fornecedores selecionados e pedidos de compra criados vinculados ao projeto. Uma contratação bem-feita protege contra atrasos e custos inesperados.',
    checklist: [
      'Cadastrar fornecedores no sistema',
      'Solicitar no mínimo 3 cotações por item',
      'Comparar preços, prazos e condições',
      'Criar pedidos de compra vinculados ao projeto',
      'Formalizar contratos de fornecimento',
    ],
    tip: 'Cadastre fornecedores primeiro, depois crie pedidos de compra vinculados ao projeto selecionado.',
    actions: [
      { label: 'Cadastrar Fornecedores', path: '/suppliers', requiresProject: false },
      { label: 'Criar Pedidos de Compra', path: '/purchases', requiresProject: false },
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
    actions: [
      { label: 'Cadastrar Empreiteiros', path: '/contractors', requiresProject: false },
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
    tip: 'Confira os cadastros de fornecedores e empreiteiros para garantir que a documentação está em dia.',
    actions: [
      { label: 'Conferir docs de Fornecedores', path: '/suppliers', requiresProject: false },
      { label: 'Conferir docs de Empreiteiros', path: '/contractors', requiresProject: false },
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
    actions: [
      { label: 'Acompanhar atividades do projeto', path: '/projects', projectPath: '/projects/:id/activities', requiresProject: true },
      { label: 'Gerenciar Empreiteiros em campo', path: '/contractors', requiresProject: false },
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
    actions: [
      { label: 'Registrar transações financeiras', path: '/financial', requiresProject: false },
      { label: 'Conferir situação dos Empreiteiros', path: '/contractors', requiresProject: false },
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
    tip: 'Finalize o projeto e utilize Unidades para gerenciar a entrega das unidades aos compradores.',
    actions: [
      { label: 'Encerrar projeto', path: '/projects', projectPath: '/projects/:id/close', requiresProject: true },
      { label: 'Quitar pendências financeiras', path: '/financial', requiresProject: false },
      { label: 'Gerenciar Unidades', path: '/units', requiresProject: false },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GOLD = '#b8a378'
const GOLD_DARK = '#9a8a6a'
const GRAY = '#d4d4d4'

function getCurrentPhase(project?: any): number {
  if (!project) return 0
  const hasUnits = (project._count?.units ?? 0) > 0
  const hasActivities = (project._count?.activities ?? 0) > 0
  switch (project.status) {
    case 'PLANNING':
      return hasUnits && hasActivities ? 2 : 1
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
// Desktop flow node — compact circle with animations
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
  const isCompleted = state === 'completed' && !isCancelled
  const isCurrent = state === 'current' && !isCancelled

  let iconEl: React.ReactNode
  if (isCancelled) {
    iconEl = <XCircle className="h-4 w-4 text-white" />
  } else if (isCompleted) {
    iconEl = <Check className="h-4 w-4 text-white" />
  } else if (isCurrent && isPaused) {
    iconEl = <Pause className="h-4 w-4" style={{ color: GOLD }} />
  } else if (isCurrent) {
    iconEl = <Icon className="h-4 w-4" style={{ color: GOLD }} />
  } else {
    iconEl = <Icon className="h-4 w-4 text-neutral-300" />
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 focus:outline-none group"
    >
      <div className="relative">
        {/* Animated glow ring for current phase */}
        {isCurrent && (
          <div
            className="absolute -inset-1.5 rounded-full"
            style={{ animation: 'glow-pulse 2.5s ease-in-out infinite' }}
          />
        )}

        <div
          className={`
            relative w-10 h-10 lg:w-11 lg:h-11 rounded-full flex items-center justify-center
            transition-all duration-300
            ${isSelected ? 'scale-110' : 'group-hover:scale-105'}
          `}
          style={{
            ...(isCancelled
              ? { backgroundColor: '#e5e5e5' }
              : isCompleted
                ? { background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DARK} 100%)` }
                : isCurrent
                  ? { border: `2.5px solid ${GOLD}`, backgroundColor: 'white' }
                  : { border: '2px dashed #d4d4d4', backgroundColor: '#fafafa' }),
            ...(isSelected
              ? { boxShadow: `0 0 0 3px rgba(184,163,120,0.2), 0 4px 14px rgba(184,163,120,0.15)` }
              : isCompleted
                ? { boxShadow: '0 2px 8px rgba(184,163,120,0.25)' }
                : {}),
          }}
        >
          {iconEl}
        </div>
      </div>

      <span
        className={`text-[11px] leading-tight text-center transition-all duration-200 ${
          isCancelled
            ? 'text-neutral-400'
            : isSelected
              ? 'text-neutral-900 font-semibold'
              : isCurrent
                ? 'text-neutral-800 font-medium'
                : isCompleted
                  ? 'text-neutral-600 font-medium'
                  : 'text-neutral-400'
        }`}
      >
        {phase.name}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Desktop horizontal connector with shimmer animation
// ---------------------------------------------------------------------------

function FlowConnector({ filled }: { filled: boolean }) {
  return (
    <div className="flex-1 flex items-center mx-0.5 mt-[18px] lg:mt-[20px]">
      {filled ? (
        <div className="relative w-full h-[2px] rounded-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_DARK})` }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'flow-shimmer 3s ease-in-out infinite',
            }}
          />
        </div>
      ) : (
        <div
          className="h-[2px] w-full"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, #e0e0e0 0px, #e0e0e0 4px, transparent 4px, transparent 8px)`,
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
  selectedProjectId,
  selectedProject,
  onNext,
}: {
  phase: Phase
  state: NodeState
  isPaused: boolean
  isCancelled: boolean
  selectedProjectId: string | null
  selectedProject: any
  onNext?: () => void
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

      {/* Sequential actions */}
      {phase.actions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-neutral-700 mb-2.5">
            Próximos passos
          </h4>
          <div className="rounded-lg border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
            {phase.actions.map((action, idx) => {
              const disabled = action.requiresProject && !selectedProjectId
              const done = action.doneCheck?.({ projectId: selectedProjectId, project: selectedProject }) ?? false
              const path = action.projectPath && selectedProjectId
                ? action.projectPath.replace(':id', selectedProjectId)
                : action.path

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    done ? 'bg-green-50/50' : disabled ? 'bg-neutral-50/50' : 'bg-white hover:bg-neutral-50'
                  } transition-colors`}
                >
                  {/* Step number or check */}
                  {done ? (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-green-100 text-green-600">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        disabled
                          ? 'bg-neutral-100 text-neutral-300'
                          : 'bg-[#b8a378]/10 text-[#b8a378]'
                      }`}
                    >
                      {idx + 1}
                    </div>
                  )}

                  {/* Label */}
                  <span
                    className={`flex-1 text-sm ${
                      done ? 'text-green-700' : disabled ? 'text-neutral-400' : 'text-neutral-700'
                    }`}
                  >
                    {action.label}
                  </span>

                  {/* Action button */}
                  {done ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 flex-shrink-0 h-8 text-[11px] font-medium"
                      onClick={() => navigate(`${path}?phase=${phase.number}`)}
                    >
                      Concluído
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  ) : disabled ? (
                    <span className="text-[11px] text-neutral-400 italic flex-shrink-0">
                      Selecione um projeto
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-[#b8a378] hover:text-[#9a8a6a] hover:bg-[#b8a378]/5 flex-shrink-0 h-8"
                      onClick={() => navigate(`${path}?phase=${phase.number}`)}
                    >
                      Ir
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Next phase button */}
      {onNext && (
        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-[#b8a378] border-[#b8a378]/30 hover:bg-[#b8a378]/5 hover:text-[#9a8a6a]"
            onClick={onNext}
          >
            Próximo
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
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

  // Auto-select when there's exactly one project and none is selected
  useEffect(() => {
    if (!selectedProjectId && projects.length === 1) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  const selectedProject = selectedProjectId
    ? projects.find((p: any) => p.id === selectedProjectId)
    : null

  const currentPhase = getCurrentPhase(selectedProject)

  const isPaused = selectedProject?.status === 'PAUSED'
  const isCancelled = selectedProject?.status === 'CANCELLED'

  const completedPhases = selectedProject && !isCancelled
    ? PHASES.filter(p => getNodeState(p.number, currentPhase) === 'completed').length
    : 0

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
      <style>{`
        @keyframes flow-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(184,163,120,0.4); }
          50% { box-shadow: 0 0 0 10px rgba(184,163,120,0); }
        }
      `}</style>
      <div className="hidden md:block">
        <Card className="overflow-hidden border-0 shadow-lg">
          <div
            className="px-8 pt-7 pb-6 lg:px-10"
            style={{
              background:
                'linear-gradient(135deg, #fafaf9 0%, #ffffff 40%, rgba(184,163,120,0.06) 100%)',
            }}
          >
            <div className="flex items-center gap-2 mb-8">
              <h2 className="text-lg font-semibold text-neutral-800">
                Fluxo da Obra
              </h2>
              {selectedProject && (
                <span className="text-sm text-neutral-400">
                  &mdash; {selectedProject.name}
                </span>
              )}
            </div>

            {/* Single-row flow — all 8 phases */}
            <div className="flex items-start">
              {PHASES.map((phase, idx) => {
                const phaseState = isCancelled
                  ? ('future' as NodeState)
                  : getNodeState(phase.number, currentPhase)
                return (
                  <div
                    key={phase.number}
                    className={`flex items-start ${idx < PHASES.length - 1 ? 'flex-1' : ''}`}
                  >
                    <FlowNode
                      phase={phase}
                      state={phaseState}
                      isSelected={selectedPhaseIdx === idx}
                      onClick={() => setSelectedPhaseIdx(idx)}
                      isPaused={isPaused && phase.number === currentPhase}
                      isCancelled={isCancelled}
                    />
                    {idx < PHASES.length - 1 && (
                      <FlowConnector
                        filled={!isCancelled && currentPhase > 0 && phase.number < currentPhase}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Progress bar */}
            {selectedProject && !isCancelled && (
              <>
                <Separator className="mt-6 mb-4 bg-neutral-100" />
                <div className="flex items-center gap-4">
                  <span className="text-xs text-neutral-400 flex-shrink-0">Progresso</span>
                  <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${(completedPhases / PHASES.length) * 100}%`,
                        background: `linear-gradient(90deg, ${GOLD}, ${GOLD_DARK})`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-neutral-400 flex-shrink-0">
                    {completedPhases}/{PHASES.length}
                  </span>
                </div>
              </>
            )}
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
              selectedProjectId={selectedProjectId}
              selectedProject={selectedProject}
              onNext={selectedPhaseIdx < PHASES.length - 1 ? () => setSelectedPhaseIdx(selectedPhaseIdx + 1) : undefined}
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
              selectedProjectId={selectedProjectId}
              selectedProject={selectedProject}
              onNext={selectedPhaseIdx < PHASES.length - 1 ? () => setSelectedPhaseIdx(selectedPhaseIdx + 1) : undefined}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
