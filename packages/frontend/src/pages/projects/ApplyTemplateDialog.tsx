import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI, activityTemplatesAPI } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Check,
} from 'lucide-react'
import { SchedulePreviewTable } from './SchedulePreviewTable'

interface ApplyTemplateDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 1 | 2 | 3 | 4

const STEP_LABELS: Record<Step, string> = {
  1: 'Selecionar Planejamento',
  2: 'Configurar Datas',
  3: 'Preview Cronograma',
  4: 'Confirmar',
}

export function ApplyTemplateDialog({
  projectId,
  open,
  onOpenChange,
}: ApplyTemplateDialogProps) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>(1)

  // Step 1 state
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  // Step 2 state
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [schedulingMode, setSchedulingMode] = useState<'BUSINESS_DAYS' | 'CALENDAR_DAYS'>('BUSINESS_DAYS')
  const [holidaysText, setHolidaysText] = useState('')

  // Step 3 state
  const [schedule, setSchedule] = useState<any[]>([])

  const { data: templatesData } = useQuery({
    queryKey: ['activity-templates-list'],
    queryFn: () => activityTemplatesAPI.list({ limit: 100 }),
    enabled: open,
  })

  const templates = templatesData?.data || []
  const selectedTemplate = templates.find((t: any) => t.id === selectedTemplateId)

  // Preview schedule mutation
  const previewMutation = useMutation({
    mutationFn: () => {
      const holidays = holidaysText
        .split(/[,\n]+/)
        .map(h => h.trim())
        .filter(Boolean)
      return activityTemplatesAPI.previewSchedule(selectedTemplateId, {
        startDate,
        endDate,
        mode: schedulingMode,
        holidays: holidays.length > 0 ? holidays : undefined,
      })
    },
    onSuccess: (data: any) => {
      setSchedule(data.schedule || [])
      setStep(3)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao calcular cronograma')
    },
  })

  // Apply template mutation
  const applyMutation = useMutation({
    mutationFn: () => {
      const holidays = holidaysText
        .split(/[,\n]+/)
        .map(h => h.trim())
        .filter(Boolean)
      return projectsAPI.createActivitiesFromTemplateWithSchedule(projectId, {
        templateId: selectedTemplateId,
        schedulingMode,
        holidays: holidays.length > 0 ? holidays : undefined,
        activities: schedule,
      })
    },
    onSuccess: () => {
      toast.success('Planejamento aplicado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] })
      resetAndClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao aplicar planejamento')
    },
  })

  const resetAndClose = () => {
    setStep(1)
    setSelectedTemplateId('')
    setStartDate('')
    setEndDate('')
    setSchedulingMode('BUSINESS_DAYS')
    setHolidaysText('')
    setSchedule([])
    onOpenChange(false)
  }

  const canGoNext = (): boolean => {
    switch (step) {
      case 1: return !!selectedTemplateId
      case 2: return !!startDate && !!endDate && startDate < endDate
      case 3: return schedule.length > 0
      case 4: return true
      default: return false
    }
  }

  const handleNext = () => {
    if (step === 2) {
      // Calculate schedule
      previewMutation.mutate()
      return
    }
    if (step === 4) {
      applyMutation.mutate()
      return
    }
    setStep((step + 1) as Step)
  }

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step)
  }

  const isLoading = previewMutation.isPending || applyMutation.isPending

  // Count total activities in schedule
  const countActivities = (items: any[]): number => {
    let count = 0
    for (const item of items) {
      if (item.level === 'ACTIVITY') count++
      if (item.children) count += countActivities(item.children)
    }
    return count
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) resetAndClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aplicar Planejamento com Cronograma</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                  s === step
                    ? 'bg-primary text-primary-foreground'
                    : s < step
                    ? 'bg-green-100 text-green-700'
                    : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                {s < step ? <Check className="h-3 w-3" /> : s}
              </div>
              <span className={`text-xs ${s === step ? 'font-medium text-neutral-900' : 'text-neutral-400'}`}>
                {STEP_LABELS[s]}
              </span>
              {s < 4 && <Separator className="w-4" />}
            </div>
          ))}
        </div>

        {/* Step 1: Select template */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Planejamento</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um planejamento..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template: any) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templates.length === 0 && (
                <p className="mt-2 text-sm text-neutral-500">
                  Nenhum planejamento disponível. Crie um planejamento em Configurações.
                </p>
              )}
            </div>

            {selectedTemplate?.phases && (
              <div className="rounded-lg border bg-neutral-50 p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{selectedTemplate.name}</span>
                </div>
                {selectedTemplate.phases.map((phase: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1">
                    {phase.color && (
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: phase.color }} />
                    )}
                    <span className="font-medium">{phase.name}</span>
                    <Badge variant="outline" className="text-xs">{phase.percentageOfTotal}%</Badge>
                    <span className="text-neutral-400 text-xs">
                      {(phase.children || []).reduce(
                        (sum: number, s: any) => sum + (s.children?.length || 0), 0
                      )} atividades
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Configure dates */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="start-date">Data de Início *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date">Data de Término *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Modo de Contagem</Label>
              <Select
                value={schedulingMode}
                onValueChange={(v) => setSchedulingMode(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUSINESS_DAYS">Dias Úteis (excl. finais de semana)</SelectItem>
                  <SelectItem value="CALENDAR_DAYS">Dias Corridos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="holidays">Feriados (opcional)</Label>
              <Input
                id="holidays"
                placeholder="2026-01-01, 2026-04-21, 2026-12-25"
                value={holidaysText}
                onChange={(e) => setHolidaysText(e.target.value)}
              />
              <p className="mt-1 text-xs text-neutral-500">
                Datas no formato YYYY-MM-DD, separadas por vírgula
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Preview schedule */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDate(startDate)} a {formatDate(endDate)} |{' '}
                {schedulingMode === 'BUSINESS_DAYS' ? 'Dias Úteis' : 'Dias Corridos'} |{' '}
                {countActivities(schedule)} atividades
              </span>
            </div>
            <SchedulePreviewTable
              schedule={schedule}
              onChange={setSchedule}
            />
            <p className="text-xs text-neutral-500">
              As datas das atividades podem ser editadas diretamente na tabela acima.
            </p>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-green-50 p-4 space-y-2">
              <h4 className="font-medium text-green-800">Resumo</h4>
              <div className="text-sm text-green-700 space-y-1">
                <p>Planejamento: <strong>{selectedTemplate?.name}</strong></p>
                <p>Período: <strong>{formatDate(startDate)}</strong> a <strong>{formatDate(endDate)}</strong></p>
                <p>Modo: <strong>{schedulingMode === 'BUSINESS_DAYS' ? 'Dias Úteis' : 'Dias Corridos'}</strong></p>
                <p>Fases: <strong>{schedule.length}</strong></p>
                <p>Atividades: <strong>{countActivities(schedule)}</strong></p>
              </div>
            </div>
            <p className="text-sm text-neutral-600">
              Ao confirmar, as atividades serão criadas no projeto com a hierarquia e datas definidas.
            </p>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetAndClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canGoNext() || isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {step === 4 ? 'Aplicar' : step === 2 ? 'Calcular Cronograma' : 'Próximo'}
              {step < 4 && step !== 2 && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
