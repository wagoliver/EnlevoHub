import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { suppliersAPI } from '@/lib/api-client'
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

interface LinkMaterialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierId: string
}

export function LinkMaterialDialog({
  open,
  onOpenChange,
  supplierId,
}: LinkMaterialDialogProps) {
  const queryClient = useQueryClient()
  const [materialId, setMaterialId] = useState('')
  const [price, setPrice] = useState('')

  const { data: materialsData } = useQuery({
    queryKey: ['materials', { limit: 100 }],
    queryFn: () => suppliersAPI.listMaterials({ limit: 100 }),
    enabled: open,
  })

  const materials = materialsData?.data || []

  const selectedMaterial = materials.find((m: any) => m.id === materialId)

  const mutation = useMutation({
    mutationFn: () =>
      suppliersAPI.linkMaterial(supplierId, {
        materialId,
        price: Number(price),
      }),
    onSuccess: () => {
      toast.success('Material vinculado ao fornecedor!')
      queryClient.invalidateQueries({ queryKey: ['supplier-materials', supplierId] })
      onOpenChange(false)
      setMaterialId('')
      setPrice('')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialId) {
      toast.error('Selecione um material')
      return
    }
    if (!price || Number(price) <= 0) {
      toast.error('Informe um preço válido')
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular Material</DialogTitle>
          <DialogDescription>
            Selecione um material do catálogo e informe o preço praticado por este fornecedor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Material *</Label>
            <Select value={materialId} onValueChange={setMaterialId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um material" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.category} - {m.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMaterial && (
            <div className="rounded-md bg-neutral-50 p-3 text-sm">
              <p className="text-neutral-600">
                Preço de catálogo:{' '}
                <span className="font-medium text-neutral-900">
                  R$ {selectedMaterial.currentPrice.toFixed(2)}
                </span>
                {' / '}{selectedMaterial.unit}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="price">Preço do Fornecedor (R$) *</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step={0.01}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0,00"
            />
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
              Vincular Material
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
