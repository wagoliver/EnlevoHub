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
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
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
  AlertTriangle,
  Ruler,
  BedDouble,
  Bath,
  Droplets,
  Sun,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { getPresetsByType, groupPresets, type RoomPreset } from './room-presets'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoomEntry {
  id: string
  presetKey: string
  label: string
  comprimento: string
  largura: string
  peDireito: string
  qtdPortas: string
  qtdJanelas: string
  tags: string[]
}

const typeLabels: Record<string, string> = {
  APARTMENT: 'Apartamento',
  HOUSE: 'Casa',
  COMMERCIAL: 'Comercial',
  LAND: 'Terreno',
}

const AVAILABLE_TAGS = [
  { slug: 'AREA_MOLHADA', label: 'Área Molhada', color: 'bg-blue-50 text-blue-700', icon: Droplets },
  { slug: 'AREA_EXTERNA', label: 'Área Externa', color: 'bg-amber-50 text-amber-700', icon: Sun },
]

let _roomIdCounter = 0
function nextRoomId() {
  return `room-${++_roomIdCounter}-${Date.now()}`
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

  // ── Form state ──────────────────────────────────────────────────────────
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('APARTMENT')
  const [simplified, setSimplified] = useState(false)

  // Presets driven by floor plan type (reacts to dropdown change)
  const presets = useMemo(() => getPresetsByType(type), [type])
  const presetGroups = useMemo(() => groupPresets(presets), [presets])
  const [manualArea, setManualArea] = useState('')
  const [rooms, setRooms] = useState<RoomEntry[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // ── Derived fields ──────────────────────────────────────────────────────
  const derivedArea = useMemo(() => {
    if (simplified) return parseFloat(manualArea) || 0
    return rooms.reduce((sum, r) => {
      const c = parseFloat(r.comprimento) || 0
      const l = parseFloat(r.largura) || 0
      return sum + c * l
    }, 0)
  }, [rooms, simplified, manualArea])

  const derivedBedrooms = useMemo(
    () => rooms.filter(r => ['quarto', 'suite'].includes(r.presetKey)).length,
    [rooms],
  )

  const derivedBathrooms = useMemo(
    () => rooms.filter(r => ['banheiro', 'lavabo'].includes(r.presetKey)).length,
    [rooms],
  )

  // ── Load existing data ──────────────────────────────────────────────────
  useEffect(() => {
    if (floorPlan) {
      setName(floorPlan.name || '')
      setDescription(floorPlan.description || '')
      setType(floorPlan.type || 'APARTMENT')

      // Load rooms from DB relation (or fallback to metadata for legacy data)
      const dbRooms = floorPlan.rooms
      const meta = floorPlan.metadata

      if (dbRooms && Array.isArray(dbRooms) && dbRooms.length > 0) {
        setRooms(dbRooms.map((r: any) => ({
          id: nextRoomId(),
          presetKey: r.presetKey || '',
          label: r.nome,
          comprimento: r.comprimento != null ? String(r.comprimento) : '',
          largura: r.largura != null ? String(r.largura) : '',
          peDireito: r.peDireito != null ? String(r.peDireito) : '2.80',
          qtdPortas: r.qtdPortas != null ? String(r.qtdPortas) : '1',
          qtdJanelas: r.qtdJanelas != null ? String(r.qtdJanelas) : '1',
          tags: r.tags || [],
        })))
        setSimplified(false)
      } else if (meta?.rooms && Array.isArray(meta.rooms)) {
        // Legacy: rooms stored in metadata JSON
        setRooms(meta.rooms.map((r: any) => ({ ...r, id: nextRoomId() })))
        setSimplified(false)
      } else if (!floorPlan.detalhado && floorPlan.detalhado !== undefined) {
        setSimplified(true)
        setManualArea(floorPlan.area != null ? String(floorPlan.area) : '')
        setRooms([])
      } else {
        setSimplified(false)
        setRooms([])
        setManualArea('')
      }
    } else {
      setName('')
      setDescription('')
      setType('APARTMENT')
      setSimplified(false)
      setManualArea('')
      setRooms([])
    }
    setErrors({})
  }, [floorPlan, open])

  // ── Room management ─────────────────────────────────────────────────────
  const addRoom = (preset: RoomPreset) => {
    // Auto-increment label if same type already exists
    const existingCount = rooms.filter(r => r.presetKey === preset.key).length
    const label = existingCount > 0 ? `${preset.label} ${existingCount + 1}` : preset.label

    setRooms(prev => [
      ...prev,
      {
        id: nextRoomId(),
        presetKey: preset.key,
        label,
        comprimento: '',
        largura: '',
        peDireito: '2.80',
        qtdPortas: '1',
        qtdJanelas: '1',
        tags: [...preset.tags],
      },
    ])
  }

  const removeRoom = (id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id))
  }

  const updateRoom = (id: string, field: keyof RoomEntry, value: string) => {
    setRooms(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const toggleRoomTag = (id: string, tag: string) => {
    setRooms(prev =>
      prev.map(r => {
        if (r.id !== id) return r
        const tags = r.tags.includes(tag) ? r.tags.filter(t => t !== tag) : [...r.tags, tag]
        return { ...r, tags }
      }),
    )
  }

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Nome é obrigatório'

    if (simplified) {
      if (!manualArea || parseFloat(manualArea) <= 0 || isNaN(parseFloat(manualArea)))
        newErrors.manualArea = 'Área deve ser um número positivo'
    } else {
      if (rooms.length === 0) newErrors.rooms = 'Adicione pelo menos um cômodo'
      rooms.forEach((r, i) => {
        if (!r.comprimento || parseFloat(r.comprimento) <= 0)
          newErrors[`room-${i}-comprimento`] = 'Obrigatório'
        if (!r.largura || parseFloat(r.largura) <= 0)
          newErrors[`room-${i}-largura`] = 'Obrigatório'
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: async () => {
      const roomsPayload = simplified
        ? []
        : rooms.map(r => ({
            nome: r.label,
            presetKey: r.presetKey || undefined,
            tags: r.tags,
            comprimento: parseFloat(r.comprimento) || 0,
            largura: parseFloat(r.largura) || 0,
            peDireito: parseFloat(r.peDireito) || 2.80,
            qtdPortas: parseInt(r.qtdPortas) || 0,
            qtdJanelas: parseInt(r.qtdJanelas) || 0,
          }))

      const payload: any = {
        name: name.trim(),
        type,
        area: Math.round(derivedArea * 100) / 100,
        bedrooms: derivedBedrooms,
        bathrooms: derivedBathrooms,
        rooms: roomsPayload,
        metadata: simplified ? { simplified: true } : undefined,
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

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Planta' : 'Nova Planta'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações e cômodos da planta.'
              : 'Defina o modelo da unidade com seus cômodos e medidas.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Basic info ─────────────────────────────────────────────── */}
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

          {/* ── Mode toggle ────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-800">Cômodos</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={simplified}
                onChange={() => setSimplified(!simplified)}
              />
              <span className="text-xs text-neutral-500">Não tenho a planta ainda</span>
            </label>
          </div>

          {simplified ? (
            /* ── Simplified mode ─────────────────────────────────────── */
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-5 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  Modo simplificado — informe apenas a área total estimada.
                  Você precisará detalhar os cômodos antes de usar a calculadora de materiais (Fase 2).
                </p>
              </div>
              <div>
                <Label htmlFor="fp-manual-area">Área total estimada (m²) *</Label>
                <Input
                  id="fp-manual-area"
                  type="number"
                  step="0.01"
                  value={manualArea}
                  onChange={(e) => setManualArea(e.target.value)}
                  placeholder="Ex: 65.00"
                  className="max-w-[200px]"
                />
                {errors.manualArea && <p className="text-sm text-destructive mt-1">{errors.manualArea}</p>}
              </div>
            </div>
          ) : (
            /* ── Detailed mode ───────────────────────────────────────── */
            <div className="space-y-4">
              {/* Preset dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar cômodo
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto w-56">
                  {presetGroups.map((group, gi) => (
                    <div key={group.label}>
                      {gi > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel className="text-[11px] text-neutral-400 uppercase tracking-wider">
                        {group.label}
                      </DropdownMenuLabel>
                      {group.presets.map((preset) => (
                        <DropdownMenuItem
                          key={preset.key}
                          className="cursor-pointer text-sm"
                          onClick={() => addRoom(preset)}
                        >
                          <Plus className="mr-2 h-3 w-3 text-neutral-400" />
                          {preset.label}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-sm text-neutral-500"
                    onClick={() => addRoom({ key: 'outro', label: 'Outro', tags: [] })}
                  >
                    <Plus className="mr-2 h-3 w-3 text-neutral-400" />
                    Outro...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {errors.rooms && <p className="text-sm text-destructive">{errors.rooms}</p>}

              {/* Room list */}
              {rooms.length > 0 && (
                <div className="space-y-3">
                  {rooms.map((room, idx) => {
                    const roomArea = (parseFloat(room.comprimento) || 0) * (parseFloat(room.largura) || 0)
                    return (
                      <div
                        key={room.id}
                        className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3"
                      >
                        {/* Room header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Input
                              value={room.label}
                              onChange={(e) => updateRoom(room.id, 'label', e.target.value)}
                              className="h-7 text-sm font-medium w-40 border-dashed"
                            />
                            {AVAILABLE_TAGS.filter(t => room.tags.includes(t.slug)).map(t => (
                              <Badge key={t.slug} variant="secondary" className={`text-[10px] gap-1 ${t.color}`}>
                                <t.icon className="h-3 w-3" />
                                {t.label}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            {roomArea > 0 && (
                              <span className="text-xs text-neutral-400">{roomArea.toFixed(2)} m²</span>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-neutral-400 hover:text-destructive"
                              onClick={() => removeRoom(room.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Measurements */}
                        <div className="grid grid-cols-5 gap-2">
                          <div>
                            <Label className="text-[10px] text-neutral-500">Comprimento (m) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={room.comprimento}
                              onChange={(e) => updateRoom(room.id, 'comprimento', e.target.value)}
                              placeholder="0.00"
                              className="h-8 text-sm"
                            />
                            {errors[`room-${idx}-comprimento`] && (
                              <p className="text-[10px] text-destructive">{errors[`room-${idx}-comprimento`]}</p>
                            )}
                          </div>
                          <div>
                            <Label className="text-[10px] text-neutral-500">Largura (m) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={room.largura}
                              onChange={(e) => updateRoom(room.id, 'largura', e.target.value)}
                              placeholder="0.00"
                              className="h-8 text-sm"
                            />
                            {errors[`room-${idx}-largura`] && (
                              <p className="text-[10px] text-destructive">{errors[`room-${idx}-largura`]}</p>
                            )}
                          </div>
                          <div>
                            <Label className="text-[10px] text-neutral-500">Pé-direito (m)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={room.peDireito}
                              onChange={(e) => updateRoom(room.id, 'peDireito', e.target.value)}
                              placeholder="2.80"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-neutral-500">Portas</Label>
                            <Input
                              type="number"
                              min="0"
                              value={room.qtdPortas}
                              onChange={(e) => updateRoom(room.id, 'qtdPortas', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-neutral-500">Janelas</Label>
                            <Input
                              type="number"
                              min="0"
                              value={room.qtdJanelas}
                              onChange={(e) => updateRoom(room.id, 'qtdJanelas', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex items-center gap-3">
                          {AVAILABLE_TAGS.map(tag => (
                            <label key={tag.slug} className="flex items-center gap-1.5 cursor-pointer">
                              <Checkbox
                                checked={room.tags.includes(tag.slug)}
                                onChange={() => toggleRoomTag(room.id, tag.slug)}
                              />
                              <tag.icon className={`h-3 w-3 ${room.tags.includes(tag.slug) ? '' : 'text-neutral-400'}`} />
                              <span className="text-xs text-neutral-600">{tag.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {rooms.length === 0 && (
                <div className="rounded-lg border border-dashed bg-neutral-50/50 p-8 text-center">
                  <Ruler className="mx-auto h-8 w-8 text-neutral-300" />
                  <p className="mt-2 text-sm text-neutral-500">
                    Use os botões acima para adicionar cômodos à planta.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Summary ────────────────────────────────────────────────── */}
          {(rooms.length > 0 || simplified) && (
            <>
              <Separator />
              <div className="flex items-center gap-6 text-sm text-neutral-600">
                <div className="flex items-center gap-1.5">
                  <Ruler className="h-4 w-4 text-neutral-400" />
                  <span className="font-medium">{derivedArea.toFixed(2)} m²</span>
                </div>
                {!simplified && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <BedDouble className="h-4 w-4 text-neutral-400" />
                      <span>{derivedBedrooms} quarto{derivedBedrooms !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Bath className="h-4 w-4 text-neutral-400" />
                      <span>{derivedBathrooms} banheiro{derivedBathrooms !== 1 ? 's' : ''}</span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* ── Description ────────────────────────────────────────────── */}
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
