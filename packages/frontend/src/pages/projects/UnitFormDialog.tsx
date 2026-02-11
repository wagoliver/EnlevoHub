import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

const typeLabels: Record<string, string> = {
  APARTMENT: 'Apartamento',
  HOUSE: 'Casa',
  COMMERCIAL: 'Comercial',
  LAND: 'Terreno',
}

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Disponível',
  RESERVED: 'Reservado',
  SOLD: 'Vendido',
  BLOCKED: 'Bloqueado',
}

interface UnitFormDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  unit?: any
}

export function UnitFormDialog({ projectId, open, onOpenChange, unit }: UnitFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!unit

  const [code, setCode] = useState('')
  const [type, setType] = useState('APARTMENT')
  const [floor, setFloor] = useState('')
  const [area, setArea] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [price, setPrice] = useState('')
  const [status, setStatus] = useState('AVAILABLE')
  const [blockId, setBlockId] = useState('')
  const [floorPlanId, setFloorPlanId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: blocks = [] } = useQuery({
    queryKey: ['project-blocks', projectId],
    queryFn: () => projectsAPI.listBlocks(projectId),
    enabled: open,
  })

  const { data: floorPlans = [] } = useQuery({
    queryKey: ['project-floor-plans', projectId],
    queryFn: () => projectsAPI.listFloorPlans(projectId),
    enabled: open,
  })

  useEffect(() => {
    if (unit) {
      setCode(unit.code || '')
      setType(unit.type || 'APARTMENT')
      setFloor(unit.floor != null ? String(unit.floor) : '')
      setArea(unit.area != null ? String(unit.area) : '')
      setBedrooms(unit.bedrooms != null ? String(unit.bedrooms) : '')
      setBathrooms(unit.bathrooms != null ? String(unit.bathrooms) : '')
      setPrice(unit.price != null ? String(unit.price) : '')
      setStatus(unit.status || 'AVAILABLE')
      setBlockId(unit.blockId || unit.block?.id || '')
      setFloorPlanId(unit.floorPlanId || unit.floorPlan?.id || '')
    } else {
      setCode('')
      setType('APARTMENT')
      setFloor('')
      setArea('')
      setBedrooms('')
      setBathrooms('')
      setPrice('')
      setStatus('AVAILABLE')
      setBlockId('')
      setFloorPlanId('')
    }
    setErrors({})
  }, [unit, open])

  // Auto-fill when selecting a floor plan (only when creating, not editing)
  const handleFloorPlanChange = (fpId: string) => {
    setFloorPlanId(fpId)
    if (fpId && fpId !== 'NONE' && !isEdit) {
      const fp = floorPlans.find((p: any) => p.id === fpId)
      if (fp) {
        setType(fp.type)
        setArea(String(fp.area))
        if (fp.bedrooms != null) setBedrooms(String(fp.bedrooms))
        if (fp.bathrooms != null) setBathrooms(String(fp.bathrooms))
        setPrice(String(fp.defaultPrice))
      }
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        code: code.trim(),
        type,
        area: parseFloat(area),
        price: parseFloat(price),
        status,
        blockId: blockId && blockId !== 'NONE' ? blockId : null,
        floorPlanId: floorPlanId && floorPlanId !== 'NONE' ? floorPlanId : null,
      }

      if (floor !== '') payload.floor = parseInt(floor, 10)
      if (bedrooms !== '') payload.bedrooms = parseInt(bedrooms, 10)
      if (bathrooms !== '') payload.bathrooms = parseInt(bathrooms, 10)

      if (isEdit) {
        return projectsAPI.updateUnit(projectId, unit.id, payload)
      }
      return projectsAPI.createUnit(projectId, payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Unidade atualizada!' : 'Unidade criada!')
      queryClient.invalidateQueries({ queryKey: ['project-units', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId.split('/')[0]] })
      queryClient.invalidateQueries({ queryKey: ['project-stats'] })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!code.trim()) {
      newErrors.code = 'Código é obrigatório'
    }

    if (!area || parseFloat(area) <= 0 || isNaN(parseFloat(area))) {
      newErrors.area = 'Área deve ser um número positivo'
    }

    if (!price || parseFloat(price) <= 0 || isNaN(parseFloat(price))) {
      newErrors.price = 'Preço deve ser um número positivo'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      mutation.mutate()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações da unidade.'
              : 'Preencha as informações para criar uma nova unidade.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="unit-code">Código *</Label>
              <Input
                id="unit-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: A-101"
                maxLength={20}
              />
              {errors.code && (
                <p className="text-sm text-destructive mt-1">{errors.code}</p>
              )}
            </div>

            <div>
              <Label htmlFor="unit-type">Tipo *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {floorPlans.length > 0 && (
              <div>
                <Label htmlFor="unit-floor-plan">Planta</Label>
                <Select value={floorPlanId || 'NONE'} onValueChange={handleFloorPlanChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a planta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Nenhuma</SelectItem>
                    {floorPlans.map((fp: any) => (
                      <SelectItem key={fp.id} value={fp.id}>
                        {fp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {blocks.length > 0 && (
              <div>
                <Label htmlFor="unit-block">Bloco</Label>
                <Select value={blockId || 'NONE'} onValueChange={(v) => setBlockId(v === 'NONE' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o bloco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Nenhum</SelectItem>
                    {blocks.map((block: any) => (
                      <SelectItem key={block.id} value={block.id}>
                        {block.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="unit-floor">Andar</Label>
              <Input
                id="unit-floor"
                type="number"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="Ex: 1"
              />
            </div>

            <div>
              <Label htmlFor="unit-area">Área (m²) *</Label>
              <Input
                id="unit-area"
                type="number"
                step="0.01"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Ex: 65.50"
              />
              {errors.area && (
                <p className="text-sm text-destructive mt-1">{errors.area}</p>
              )}
            </div>

            <div>
              <Label htmlFor="unit-bedrooms">Quartos</Label>
              <Input
                id="unit-bedrooms"
                type="number"
                min="0"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                placeholder="Ex: 2"
              />
            </div>

            <div>
              <Label htmlFor="unit-bathrooms">Banheiros</Label>
              <Input
                id="unit-bathrooms"
                type="number"
                min="0"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                placeholder="Ex: 1"
              />
            </div>

            <div>
              <Label htmlFor="unit-price">Preço (R$) *</Label>
              <Input
                id="unit-price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex: 250000.00"
              />
              {errors.price && (
                <p className="text-sm text-destructive mt-1">{errors.price}</p>
              )}
            </div>

            {isEdit && (
              <div>
                <Label htmlFor="unit-status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEdit ? 'Salvar' : 'Criar Unidade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
