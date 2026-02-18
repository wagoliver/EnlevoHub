import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormTooltip } from '@/components/ui/FormTooltip'
import {
  Loader2,
  Plus,
  Trash2,
  Ruler,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  MEASUREMENT_PRESET_GROUPS,
  getMeasurementUnit,
  type MeasurementPreset,
} from './measurement-presets'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MeasurementEntry {
  id: string
  category: string
  label: string
  measurementType: string
  value: string
  areaTipo?: string
  unit: string
}

const typeLabels: Record<string, string> = {
  APARTMENT: 'Apartamento',
  HOUSE: 'Casa',
  COMMERCIAL: 'Comercial',
  LAND: 'Terreno',
}

let _entryIdCounter = 0
function nextEntryId() {
  return `meas-${++_entryIdCounter}-${Date.now()}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FloorPlanFormDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  floorPlan?: any
}

export function FloorPlanFormDialog({ projectId, open, onOpenChange, floorPlan }: FloorPlanFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!floorPlan

  // -- Form state --
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('APARTMENT')
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // -- Derived area (sum of AREA_M2 measurements) --
  const derivedArea = useMemo(() => {
    return measurements.reduce((sum, m) => {
      if (m.measurementType === 'AREA_M2') {
        return sum + (parseFloat(m.value) || 0)
      }
      return sum
    }, 0)
  }, [measurements])

  // -- Summary by type --
  const summary = useMemo(() => {
    const totals: Record<string, { value: number; unit: string }> = {}
    for (const m of measurements) {
      const val = parseFloat(m.value) || 0
      if (val <= 0) continue
      const key = m.measurementType
      if (!totals[key]) totals[key] = { value: 0, unit: m.unit }
      totals[key].value += val
    }
    return totals
  }, [measurements])

  // -- Load existing data --
  useEffect(() => {
    if (floorPlan) {
      setName(floorPlan.name || '')
      setDescription(floorPlan.description || '')
      setType(floorPlan.type || 'APARTMENT')

      // Load measurements from DB
      const dbMeasurements = floorPlan.measurements
      if (dbMeasurements && Array.isArray(dbMeasurements) && dbMeasurements.length > 0) {
        setMeasurements(dbMeasurements.map((m: any) => ({
          id: nextEntryId(),
          category: m.category,
          label: m.label,
          measurementType: m.measurementType,
          value: m.value != null ? String(m.value) : '',
          areaTipo: m.areaTipo || undefined,
          unit: getMeasurementUnit(m.measurementType),
        })))
      } else {
        setMeasurements([])
      }
    } else {
      setName('')
      setDescription('')
      setType('APARTMENT')
      setMeasurements([])
    }
    setErrors({})
  }, [floorPlan, open])

  // -- Measurement management --
  const addMeasurement = (preset: MeasurementPreset) => {
    const existingCount = measurements.filter(m => m.category === preset.category).length
    const label = existingCount > 0 ? `${preset.label} ${existingCount + 1}` : preset.label

    setMeasurements(prev => [
      ...prev,
      {
        id: nextEntryId(),
        category: preset.category,
        label,
        measurementType: preset.measurementType,
        value: '',
        areaTipo: preset.areaTipo,
        unit: preset.unit,
      },
    ])
  }

  const removeMeasurement = (id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id))
  }

  const updateMeasurement = (id: string, field: keyof MeasurementEntry, value: string) => {
    setMeasurements(prev => prev.map(m => (m.id === id ? { ...m, [field]: value } : m)))
  }

  // -- Validation --
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Nome é obrigatório'

    if (measurements.length === 0) {
      newErrors.measurements = 'Adicione pelo menos uma medição'
    }
    measurements.forEach((m, i) => {
      if (!m.value || parseFloat(m.value) <= 0 || isNaN(parseFloat(m.value))) {
        newErrors[`meas-${i}-value`] = 'Obrigatório'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // -- Submit --
  const mutation = useMutation({
    mutationFn: async () => {
      const measurementsPayload = measurements.map(m => ({
        category: m.category,
        label: m.label,
        measurementType: m.measurementType,
        value: parseFloat(m.value) || 0,
        areaTipo: m.areaTipo || undefined,
      }))

      const payload: any = {
        name: name.trim(),
        type,
        area: Math.round((derivedArea || 1) * 100) / 100,
        measurements: measurementsPayload,
      }

      if (description.trim()) payload.description = description.trim()

      if (isEdit) {
        return projectsAPI.updateFloorPlan(projectId, floorPlan.id, payload)
      }
      return projectsAPI.createFloorPlan(projectId, payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Planta atualizada!' : 'Planta criada!')
      queryClient.invalidateQueries({ queryKey: ['project-floor-plans', projectId] })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) mutation.mutate()
  }

  // -- Render --
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Planta' : 'Nova Planta'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações e medições da planta.'
              : 'Defina o modelo da unidade com suas medições de serviço.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* -- Basic info -- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="flex items-center">
                <Label htmlFor="fp-name">Nome *</Label>
                <FormTooltip text="Nome descritivo da planta. Ex: 'Tipo A - 2 quartos'" />
              </div>
              <Input
                id="fp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Tipo A - 2 quartos"
                maxLength={100}
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="fp-type">Tipo *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* -- Measurements section -- */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-800">Medições de Serviço</h3>
          </div>

          <div className="space-y-4">
            {/* Preset dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar Medição
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto w-56">
                {MEASUREMENT_PRESET_GROUPS.map((group, gi) => (
                  <div key={group.label}>
                    {gi > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuLabel className="text-[11px] text-neutral-400 uppercase tracking-wider">
                      {group.label}
                    </DropdownMenuLabel>
                    {group.presets.map((preset) => (
                      <DropdownMenuItem
                        key={preset.key}
                        className="cursor-pointer text-sm"
                        onClick={() => addMeasurement(preset)}
                      >
                        <Plus className="mr-2 h-3 w-3 text-neutral-400" />
                        {preset.label}
                        <span className="ml-auto text-[10px] text-neutral-400">{preset.unit}</span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {errors.measurements && <p className="text-sm text-destructive">{errors.measurements}</p>}

            {/* Measurement list */}
            {measurements.length > 0 && (
              <div className="space-y-2">
                {measurements.map((meas, idx) => (
                  <div
                    key={meas.id}
                    className="rounded-lg border border-neutral-200 bg-white p-3 flex items-center gap-3"
                  >
                    {/* Label (editable) */}
                    <Input
                      value={meas.label}
                      onChange={(e) => updateMeasurement(meas.id, 'label', e.target.value)}
                      className="h-8 text-sm font-medium flex-1 min-w-0 border-dashed"
                    />

                    {/* Value + unit */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={meas.value}
                        onChange={(e) => updateMeasurement(meas.id, 'value', e.target.value)}
                        placeholder="0.00"
                        className="h-8 text-sm w-24 text-right"
                      />
                      <span className="text-xs text-neutral-500 w-6">{meas.unit}</span>
                    </div>

                    {/* Error */}
                    {errors[`meas-${idx}-value`] && (
                      <span className="text-[10px] text-destructive shrink-0">{errors[`meas-${idx}-value`]}</span>
                    )}

                    {/* Remove button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-neutral-400 hover:text-destructive shrink-0"
                      onClick={() => removeMeasurement(meas.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {measurements.length === 0 && (
              <div className="rounded-lg border border-dashed bg-neutral-50/50 p-8 text-center">
                <Ruler className="mx-auto h-8 w-8 text-neutral-300" />
                <p className="mt-2 text-sm text-neutral-500">
                  Use o botão acima para adicionar medições de serviço à planta.
                </p>
              </div>
            )}
          </div>

          {/* -- Summary -- */}
          {measurements.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
                {Object.entries(summary).map(([key, data]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <Ruler className="h-4 w-4 text-neutral-400" />
                    <span className="font-medium">{data.value.toFixed(2)} {data.unit}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* -- Description -- */}
          <div>
            <div className="flex items-center">
              <Label htmlFor="fp-description">Descrição</Label>
              <FormTooltip text="Detalhes como diferenciais, acabamentos, varanda, etc." />
            </div>
            <Textarea
              id="fp-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Diferenciais, acabamentos, etc."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar Planta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
