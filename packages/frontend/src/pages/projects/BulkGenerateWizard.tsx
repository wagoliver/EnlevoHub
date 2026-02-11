import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { FormTooltip } from '@/components/ui/FormTooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Building2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

type CodePattern = 'BLOCO_ANDAR_SEQ' | 'SEQUENCIAL' | 'PERSONALIZADO'

interface FloorPlanSelection {
  floorPlanId: string
  unitsPerFloor: number
}

interface BulkGenerateWizardProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const codePatternLabels: Record<CodePattern, { label: string; desc: string }> = {
  BLOCO_ANDAR_SEQ: {
    label: 'Bloco + Andar + Sequência',
    desc: 'Ex: A-101, A-102, B-201',
  },
  SEQUENCIAL: {
    label: 'Sequencial com prefixo',
    desc: 'Ex: CASA-001, CASA-002',
  },
  PERSONALIZADO: {
    label: 'Personalizado',
    desc: 'Ex: ED1A-101, ED1A-102',
  },
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function BulkGenerateWizard({ projectId, open, onOpenChange }: BulkGenerateWizardProps) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)

  // Step 1 - Floor Plans
  const [selectedPlans, setSelectedPlans] = useState<FloorPlanSelection[]>([])

  // Step 2 - Blocks & Floors
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([])
  const [floors, setFloors] = useState('3')
  const [startFloor, setStartFloor] = useState('1')

  // Step 3 - Code Pattern
  const [codePattern, setCodePattern] = useState<CodePattern>('BLOCO_ANDAR_SEQ')
  const [codePrefix, setCodePrefix] = useState('')

  // Step 4 - Preview
  const [previewData, setPreviewData] = useState<any>(null)

  const { data: floorPlans = [] } = useQuery({
    queryKey: ['project-floor-plans', projectId],
    queryFn: () => projectsAPI.listFloorPlans(projectId),
    enabled: open,
  })

  const { data: blocks = [] } = useQuery({
    queryKey: ['project-blocks', projectId],
    queryFn: () => projectsAPI.listBlocks(projectId),
    enabled: open,
  })

  const previewMutation = useMutation({
    mutationFn: () => {
      const payload = {
        items: selectedPlans.filter(s => s.unitsPerFloor > 0),
        blockIds: selectedBlockIds.length > 0 ? selectedBlockIds : undefined,
        floors: parseInt(floors, 10),
        startFloor: parseInt(startFloor, 10),
        codePattern,
        codePrefix: codePrefix || undefined,
      }
      return projectsAPI.previewGenerate(projectId, payload)
    },
    onSuccess: (data) => {
      setPreviewData(data)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const generateMutation = useMutation({
    mutationFn: () => {
      const payload = {
        items: selectedPlans.filter(s => s.unitsPerFloor > 0),
        blockIds: selectedBlockIds.length > 0 ? selectedBlockIds : undefined,
        floors: parseInt(floors, 10),
        startFloor: parseInt(startFloor, 10),
        codePattern,
        codePrefix: codePrefix || undefined,
      }
      return projectsAPI.bulkGenerate(projectId, payload)
    },
    onSuccess: (data) => {
      toast.success(data.message || `${data.count} unidades criadas!`)
      queryClient.invalidateQueries({ queryKey: ['project-units', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-stats'] })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1)
      setSelectedPlans([])
      setSelectedBlockIds([])
      setFloors('3')
      setStartFloor('1')
      setCodePattern('BLOCO_ANDAR_SEQ')
      setCodePrefix('')
      setPreviewData(null)
    }
  }, [open])

  const togglePlan = (fpId: string) => {
    setSelectedPlans(prev => {
      const existing = prev.find(s => s.floorPlanId === fpId)
      if (existing) {
        return prev.filter(s => s.floorPlanId !== fpId)
      }
      return [...prev, { floorPlanId: fpId, unitsPerFloor: 1 }]
    })
  }

  const updateUnitsPerFloor = (fpId: string, value: number) => {
    setSelectedPlans(prev =>
      prev.map(s => s.floorPlanId === fpId ? { ...s, unitsPerFloor: Math.max(1, value) } : s)
    )
  }

  const toggleBlock = (blockId: string) => {
    setSelectedBlockIds(prev =>
      prev.includes(blockId)
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
    )
  }

  const canProceedStep1 = selectedPlans.length > 0 && selectedPlans.every(s => s.unitsPerFloor > 0)
  const canProceedStep2 = parseInt(floors, 10) > 0 && parseInt(startFloor, 10) >= 0
  const canProceedStep3 = true

  const handleNext = async () => {
    if (step < 4) {
      if (step === 3) {
        // Going to step 4 - load preview
        setStep(4)
        previewMutation.mutate()
      } else {
        setStep(step + 1)
      }
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
      if (step === 4) setPreviewData(null)
    }
  }

  const totalSteps = 4
  const stepLabels = ['Plantas', 'Blocos e Andares', 'Código', 'Revisão']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Unidades em Lote</DialogTitle>
          <DialogDescription>
            Passo {step} de {totalSteps}: {stepLabels[step - 1]}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          {stepLabels.map((_label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-medium ${
                  i + 1 < step
                    ? 'bg-primary text-primary-foreground'
                    : i + 1 === step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-neutral-200 text-neutral-500'
                }`}
              >
                {i + 1 < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              {i < totalSteps - 1 && (
                <div className={`h-px w-8 ${i + 1 < step ? 'bg-primary' : 'bg-neutral-200'}`} />
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* Step 1: Floor Plans */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-1">
              <p className="text-sm text-neutral-600">Selecione as plantas e defina quantas unidades por andar para cada uma.</p>
              <FormTooltip text="Planta define o modelo da unidade (tipo, área, quartos). Cadastre uma vez e reutilize." />
            </div>

            {floorPlans.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-neutral-50/50 p-8 text-center">
                <LayoutGrid className="mx-auto h-10 w-10 text-neutral-300" />
                <p className="mt-3 text-sm text-neutral-500">
                  Nenhuma planta cadastrada. Crie plantas primeiro na aba acima.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {floorPlans.map((fp: any) => {
                  const selected = selectedPlans.find(s => s.floorPlanId === fp.id)
                  return (
                    <Card
                      key={fp.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        selected ? 'border-primary bg-primary/5' : 'hover:bg-neutral-50'
                      }`}
                      onClick={() => togglePlan(fp.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={!!selected}
                            onChange={() => togglePlan(fp.id)}
                          />
                          <div>
                            <span className="font-medium text-sm">{fp.name}</span>
                            <div className="flex gap-3 text-xs text-neutral-500 mt-0.5">
                              <span>{fp.area} m²</span>
                              {fp.bedrooms != null && <span>{fp.bedrooms}q</span>}
                              <span>{formatCurrency(fp.defaultPrice)}</span>
                            </div>
                          </div>
                        </div>
                        {selected && (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <Label className="text-xs text-neutral-500 whitespace-nowrap">Un/andar:</Label>
                            <Input
                              type="number"
                              min="1"
                              value={selected.unitsPerFloor}
                              onChange={e => updateUnitsPerFloor(fp.id, parseInt(e.target.value, 10) || 1)}
                              className="w-16 h-8 text-center"
                            />
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Blocks & Floors */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-1">
              <p className="text-sm text-neutral-600">Selecione os blocos (opcional) e defina o número de andares.</p>
              <FormTooltip text="Blocos representam edifícios ou torres. Se o projeto tem apenas um edifício, pule esta etapa." />
            </div>

            {blocks.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Blocos</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {blocks.map((block: any) => {
                    const selected = selectedBlockIds.includes(block.id)
                    return (
                      <Card
                        key={block.id}
                        className={`p-3 cursor-pointer transition-colors ${
                          selected ? 'border-primary bg-primary/5' : 'hover:bg-neutral-50'
                        }`}
                        onClick={() => toggleBlock(block.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selected}
                            onChange={() => toggleBlock(block.id)}
                          />
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-neutral-400" />
                            <span className="text-sm font-medium">{block.name}</span>
                            {block.floors && (
                              <span className="text-xs text-neutral-400">({block.floors} andares)</span>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
                {selectedBlockIds.length === 0 && (
                  <p className="text-xs text-neutral-400">
                    Nenhum bloco selecionado. As unidades serão criadas sem bloco.
                  </p>
                )}
              </div>
            )}

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="wiz-floors">Quantidade de Andares *</Label>
                <Input
                  id="wiz-floors"
                  type="number"
                  min="1"
                  value={floors}
                  onChange={e => setFloors(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center">
                  <Label htmlFor="wiz-start-floor">Andar Inicial</Label>
                  <FormTooltip text="Número do primeiro andar. Use 0 para térreo." />
                </div>
                <Input
                  id="wiz-start-floor"
                  type="number"
                  min="0"
                  value={startFloor}
                  onChange={e => setStartFloor(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Code Pattern */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-1">
              <p className="text-sm text-neutral-600">Escolha como os códigos das unidades serão gerados.</p>
              <FormTooltip text="Defina como os códigos serão gerados automaticamente." />
            </div>

            <div className="space-y-2">
              {(Object.entries(codePatternLabels) as [CodePattern, { label: string; desc: string }][]).map(
                ([value, { label, desc }]) => (
                  <Card
                    key={value}
                    className={`p-3 cursor-pointer transition-colors ${
                      codePattern === value ? 'border-primary bg-primary/5' : 'hover:bg-neutral-50'
                    }`}
                    onClick={() => setCodePattern(value)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-4 w-4 rounded-full border-2 ${
                          codePattern === value
                            ? 'border-primary bg-primary'
                            : 'border-neutral-300'
                        }`}
                      />
                      <div>
                        <span className="text-sm font-medium">{label}</span>
                        <p className="text-xs text-neutral-500">{desc}</p>
                      </div>
                    </div>
                  </Card>
                )
              )}
            </div>

            {(codePattern === 'SEQUENCIAL' || codePattern === 'PERSONALIZADO') && (
              <div>
                <Label htmlFor="wiz-prefix">Prefixo</Label>
                <Input
                  id="wiz-prefix"
                  value={codePrefix}
                  onChange={e => setCodePrefix(e.target.value)}
                  placeholder={codePattern === 'SEQUENCIAL' ? 'Ex: CASA' : 'Ex: ED1'}
                  maxLength={20}
                />
              </div>
            )}

            {/* Live preview */}
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs font-medium text-neutral-500 mb-2">Exemplos de códigos:</p>
              <div className="flex flex-wrap gap-2">
                {generateExampleCodes(codePattern, codePrefix, selectedBlockIds.length > 0 ? blocks.find((b: any) => b.id === selectedBlockIds[0])?.name || 'A' : '', parseInt(startFloor, 10) || 1).map((code, i) => (
                  <Badge key={i} variant="secondary" className="font-mono text-xs">
                    {code}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            {previewMutation.isPending ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-sm text-neutral-500">Gerando preview...</span>
              </div>
            ) : previewData ? (
              <>
                {/* Summary */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{previewData.total}</p>
                    <p className="text-xs text-neutral-500">Total de unidades</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold">{selectedPlans.length}</p>
                    <p className="text-xs text-neutral-500">Plantas</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold">{selectedBlockIds.length || '-'}</p>
                    <p className="text-xs text-neutral-500">Blocos</p>
                  </Card>
                </div>

                {previewData.hasConflicts && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Conflitos encontrados</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Os seguintes códigos já existem: {previewData.conflicts.join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Preview table */}
                <div className="max-h-[300px] overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Planta</TableHead>
                        <TableHead>Bloco</TableHead>
                        <TableHead>Andar</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Preço</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.units.map((unit: any, i: number) => (
                        <TableRow key={i} className={previewData.conflicts?.includes(unit.code) ? 'bg-amber-50' : ''}>
                          <TableCell className="font-mono text-sm font-medium">{unit.code}</TableCell>
                          <TableCell className="text-sm">{unit.floorPlanName}</TableCell>
                          <TableCell className="text-sm">{unit.blockName || '-'}</TableCell>
                          <TableCell className="text-sm">{unit.floor}</TableCell>
                          <TableCell className="text-sm">{unit.area} m²</TableCell>
                          <TableCell className="text-sm">{formatCurrency(unit.price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <p className="text-sm text-blue-800">
                    Esta ação criará <strong>{previewData.total}</strong> unidades de uma vez. Todas serão criadas com status "Disponível".
                  </p>
                </div>
              </>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={handleBack}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
          )}
          <div className="flex-1" />
          {step < 4 ? (
            <Button
              type="button"
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3)
              }
              onClick={handleNext}
            >
              Próximo
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={generateMutation.isPending || previewMutation.isPending || previewData?.hasConflicts}
              onClick={() => generateMutation.mutate()}
            >
              {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gerar {previewData?.total || ''} Unidades
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function generateExampleCodes(
  pattern: CodePattern,
  prefix: string,
  blockName: string,
  startFloor: number
): string[] {
  const examples: string[] = []
  const blk = blockName || 'A'

  switch (pattern) {
    case 'BLOCO_ANDAR_SEQ':
      for (let i = 1; i <= 3; i++) {
        examples.push(blockName ? `${blk}-${startFloor}${String(i).padStart(2, '0')}` : `${startFloor}${String(i).padStart(2, '0')}`)
      }
      break
    case 'SEQUENCIAL': {
      const p = prefix || 'UN'
      for (let i = 1; i <= 3; i++) {
        examples.push(`${p}-${String(i).padStart(3, '0')}`)
      }
      break
    }
    case 'PERSONALIZADO': {
      const p = prefix || 'UN'
      for (let i = 1; i <= 3; i++) {
        examples.push(blockName ? `${p}${blk}-${startFloor}${String(i).padStart(2, '0')}` : `${p}-${startFloor}${String(i).padStart(2, '0')}`)
      }
      break
    }
  }

  return examples
}
