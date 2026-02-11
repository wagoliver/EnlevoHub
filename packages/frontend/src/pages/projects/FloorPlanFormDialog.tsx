import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormTooltip } from '@/components/ui/FormTooltip'
import { Loader2 } from 'lucide-react'

const typeLabels: Record<string, string> = {
  APARTMENT: 'Apartamento',
  HOUSE: 'Casa',
  COMMERCIAL: 'Comercial',
  LAND: 'Terreno',
}

interface FloorPlanFormDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  floorPlan?: any
}

export function FloorPlanFormDialog({ projectId, open, onOpenChange, floorPlan }: FloorPlanFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!floorPlan

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('APARTMENT')
  const [area, setArea] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [defaultPrice, setDefaultPrice] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (floorPlan) {
      setName(floorPlan.name || '')
      setDescription(floorPlan.description || '')
      setType(floorPlan.type || 'APARTMENT')
      setArea(floorPlan.area != null ? String(floorPlan.area) : '')
      setBedrooms(floorPlan.bedrooms != null ? String(floorPlan.bedrooms) : '')
      setBathrooms(floorPlan.bathrooms != null ? String(floorPlan.bathrooms) : '')
      setDefaultPrice(floorPlan.defaultPrice != null ? String(floorPlan.defaultPrice) : '')
    } else {
      setName('')
      setDescription('')
      setType('APARTMENT')
      setArea('')
      setBedrooms('')
      setBathrooms('')
      setDefaultPrice('')
    }
    setErrors({})
  }, [floorPlan, open])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: name.trim(),
        type,
        area: parseFloat(area),
        defaultPrice: parseFloat(defaultPrice),
      }

      if (description.trim()) payload.description = description.trim()
      if (bedrooms !== '') payload.bedrooms = parseInt(bedrooms, 10)
      if (bathrooms !== '') payload.bathrooms = parseInt(bathrooms, 10)

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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Nome é obrigatório'
    if (!area || parseFloat(area) <= 0 || isNaN(parseFloat(area))) newErrors.area = 'Área deve ser um número positivo'
    if (!defaultPrice || parseFloat(defaultPrice) <= 0 || isNaN(parseFloat(defaultPrice))) newErrors.defaultPrice = 'Preço deve ser um número positivo'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Planta' : 'Nova Planta'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações da planta.'
              : 'Defina o modelo de unidade. Cadastre uma vez e reutilize na geração em lote.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center">
              <Label htmlFor="fp-name">Nome *</Label>
              <FormTooltip text="Nome descritivo da planta. Ex: 'Tipo A - 2 quartos, 65m²'" />
            </div>
            <Input
              id="fp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Tipo A - 2 quartos, 65m²"
              maxLength={100}
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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

            <div>
              <Label htmlFor="fp-area">Área (m²) *</Label>
              <Input
                id="fp-area"
                type="number"
                step="0.01"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Ex: 65.50"
              />
              {errors.area && <p className="text-sm text-destructive mt-1">{errors.area}</p>}
            </div>

            <div>
              <Label htmlFor="fp-bedrooms">Quartos</Label>
              <Input
                id="fp-bedrooms"
                type="number"
                min="0"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                placeholder="Ex: 2"
              />
            </div>

            <div>
              <Label htmlFor="fp-bathrooms">Banheiros</Label>
              <Input
                id="fp-bathrooms"
                type="number"
                min="0"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                placeholder="Ex: 1"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center">
                <Label htmlFor="fp-price">Preço Padrão (R$) *</Label>
                <FormTooltip text="Preço base para unidades desta planta. Pode ser ajustado individualmente depois." />
              </div>
              <Input
                id="fp-price"
                type="number"
                step="0.01"
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
                placeholder="Ex: 350000.00"
              />
              {errors.defaultPrice && <p className="text-sm text-destructive mt-1">{errors.defaultPrice}</p>}
            </div>
          </div>

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
              rows={3}
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
