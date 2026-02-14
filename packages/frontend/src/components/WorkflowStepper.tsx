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
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  const currentStep = STEPS.find((s) => s.number === phase)

  if (!currentStep) return null

  const StepIcon = currentStep.icon

  return (
    <div className="rounded-xl bg-neutral-50/80 border border-neutral-200/80 mb-5 overflow-hidden">
      {/* Row 1: back link + stepper dots */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <button
          onClick={() => navigate(`/?phase=${phase}`)}
          className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>

        <div className="h-4 w-px bg-neutral-200 flex-shrink-0" />

        {/* Stepper dots */}
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center flex-1 min-w-0">
            {STEPS.map((step, idx) => {
              const isCurrent = step.number === phase
              const isPast = step.number < phase

              return (
                <div key={step.number} className="flex items-center flex-1 last:flex-none">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => navigate(`/?phase=${step.number}`)}
                        className="flex-shrink-0 relative group"
                      >
                        {isCurrent ? (
                          <div
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ring-2 ring-offset-1 shadow-sm"
                            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, '--tw-ring-color': GOLD } as React.CSSProperties}
                          >
                            <step.icon className="h-3.5 w-3.5 text-white" />
                          </div>
                        ) : isPast ? (
                          <div
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})` }}
                          >
                            <span className="text-[9px] font-bold text-white">{step.number}</span>
                          </div>
                        ) : (
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-dashed border-neutral-300 bg-white flex items-center justify-center transition-transform group-hover:scale-110">
                            <span className="text-[9px] font-medium text-neutral-300">{step.number}</span>
                          </div>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {step.name}
                    </TooltipContent>
                  </Tooltip>

                  {idx < STEPS.length - 1 && (
                    <div className="flex-1 mx-0.5 sm:mx-1">
                      {step.number < phase ? (
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

      {/* Row 2: phase context */}
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-0.5">
        <div
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${GOLD}15` }}
        >
          <StepIcon className="h-4 w-4" style={{ color: GOLD }} />
        </div>
        <div className="min-w-0">
          <span className="text-sm font-semibold text-neutral-800">
            {currentStep.name}
          </span>
          <span className="text-sm text-neutral-400 mx-1.5">&mdash;</span>
          <span className="text-sm text-neutral-500">
            {currentStep.hint}
          </span>
        </div>
      </div>
    </div>
  )
}
