import { useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  Calculator,
  FileSignature,
  HardHat,
  ShieldCheck,
  Hammer,
  Ruler,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useWorkflowStatus } from '@/hooks/useWorkflowStatus'

interface StepDef {
  number: number
  name: string
  icon: LucideIcon
  hint: string
}

const STEPS: StepDef[] = [
  { number: 1, name: 'Planejamento', icon: ClipboardList, hint: 'Defina escopo, plantas e orçamento' },
  { number: 2, name: 'Levantamento', icon: Calculator, hint: 'Quantifique materiais e serviços' },
  { number: 3, name: 'Contratação', icon: FileSignature, hint: 'Cotações, fornecedores e contratos' },
  { number: 4, name: 'Mobilização', icon: HardHat, hint: 'Selecione e prepare empreiteiros' },
  { number: 5, name: 'Documentação', icon: ShieldCheck, hint: 'Alvarás, seguros e certidões' },
  { number: 6, name: 'Execução', icon: Hammer, hint: 'Acompanhe a obra em campo' },
  { number: 7, name: 'Medição', icon: Ruler, hint: 'Aferição e liberação de pagamentos' },
  { number: 8, name: 'Encerramento', icon: CheckCircle2, hint: 'Aceite e entrega formal da obra' },
]

const GOLD = '#b8a378'
const GOLD_DARK = '#9a8a6a'

interface WorkflowStepperProps {
  /** 1-based phase number that is currently active */
  phase: number
}

export function WorkflowStepper({ phase }: WorkflowStepperProps) {
  const navigate = useNavigate()
  const workflowStatus = useWorkflowStatus()
  const currentStep = STEPS.find((s) => s.number === phase)

  if (!currentStep) return null

  const StepIcon = currentStep.icon

  return (
    <div className="rounded-xl bg-neutral-50/80 border border-neutral-200/80 mb-5 overflow-hidden">
      {/* Row 1: back button + stepper dots */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        {/* Dashboard button — prominent */}
        <button
          onClick={() => navigate(`/?phase=${phase}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-sm font-medium text-neutral-600 hover:border-[#b8a378] hover:text-neutral-800 transition-all flex-shrink-0 shadow-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </button>

        <div className="h-5 w-px bg-neutral-200 flex-shrink-0" />

        {/* Stepper dots */}
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center flex-1 min-w-0">
            {STEPS.map((step, idx) => {
              const isCurrent = step.number === phase
              const stepStatus = workflowStatus[step.number]
              const fulfilled = stepStatus?.fulfilled ?? false

              // Tooltip text: phase name + status
              const tooltipText = stepStatus
                ? `${step.name} — ${stepStatus.label}`
                : step.name

              return (
                <div key={step.number} className="flex items-center flex-1 last:flex-none">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => navigate(`/?phase=${step.number}`)}
                        className="flex-shrink-0 relative group"
                      >
                        {isCurrent ? (
                          // Current phase: big gold dot
                          <div
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ring-2 ring-offset-1 shadow-sm"
                            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, '--tw-ring-color': GOLD } as React.CSSProperties}
                          >
                            <step.icon className="h-3.5 w-3.5 text-white" />
                          </div>
                        ) : fulfilled ? (
                          // Fulfilled: gold with check
                          <div
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})` }}
                          >
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        ) : (
                          // Not fulfilled: amber warning border
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-amber-300 bg-amber-50 flex items-center justify-center transition-transform group-hover:scale-110">
                            <AlertCircle className="h-3 w-3 text-amber-400" />
                          </div>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs max-w-[200px] text-center">
                      {tooltipText}
                    </TooltipContent>
                  </Tooltip>

                  {/* Connector line */}
                  {idx < STEPS.length - 1 && (
                    <div className="flex-1 mx-0.5 sm:mx-1">
                      {fulfilled ? (
                        <div
                          className="h-[2px] w-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_DARK})` }}
                        />
                      ) : (
                        <div
                          className="h-[2px] w-full"
                          style={{
                            backgroundImage: 'repeating-linear-gradient(90deg, #d4d4d4 0px, #d4d4d4 4px, transparent 4px, transparent 8px)',
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Row 2: phase context + navigation buttons */}
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-0.5">
        {/* Previous button */}
        {phase > 1 ? (
          <button
            onClick={() => navigate(`/?phase=${phase - 1}`)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex-shrink-0 border-2 text-neutral-600 border-neutral-300 bg-white hover:border-[#b8a378] hover:text-neutral-800 shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>
        ) : (
          <div className="w-[42px] sm:w-[106px] flex-shrink-0" />
        )}

        {/* Phase info (centered) */}
        <div className="flex-1 min-w-0 flex items-center justify-center gap-2">
          <div
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${GOLD}15` }}
          >
            <StepIcon className="h-4 w-4" style={{ color: GOLD }} />
          </div>
          <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-neutral-800">
              {currentStep.name}
            </span>
            <span className="text-sm text-neutral-400">&mdash;</span>
            <span className="text-sm text-neutral-500">
              {currentStep.hint}
            </span>
          </div>
        </div>

        {/* Next button */}
        {phase < 8 ? (
          <button
            onClick={() => navigate(`/?phase=${phase + 1}`)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 border-2 shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`,
              borderColor: GOLD_DARK,
              color: '#fff',
            }}
          >
            <span className="hidden sm:inline">Próximo</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div className="w-[42px] sm:w-[106px] flex-shrink-0" />
        )}
      </div>
    </div>
  )
}
