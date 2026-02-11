import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { suppliersAPI, projectsAPI } from '@/lib/api-client'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Plus, Trash2 } from 'lucide-react'

interface OrderItem {
  materialId: string
  materialName: string
  unit: string
  quantity: number
  unitPrice: number
}

interface PurchaseOrderFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierId?: string
}

export function PurchaseOrderFormDialog({
  open,
  onOpenChange,
  supplierId: defaultSupplierId,
}: PurchaseOrderFormDialogProps) {
  const queryClient = useQueryClient()

  const [projectId, setProjectId] = useState('')
  const [supplierId, setSupplierId] = useState(defaultSupplierId || '')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<OrderItem[]>([])

  // Item form
  const [selectedMaterialId, setSelectedMaterialId] = useState('')
  const [itemQuantity, setItemQuantity] = useState('')
  const [itemUnitPrice, setItemUnitPrice] = useState('')

  const { data: projectsData } = useQuery({
    queryKey: ['projects', { limit: 100 }],
    queryFn: () => projectsAPI.list({ limit: 100 }),
    enabled: open,
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', { limit: 100, isActive: true }],
    queryFn: () => suppliersAPI.list({ limit: 100, isActive: true }),
    enabled: open && !defaultSupplierId,
  })

  const { data: materialsData } = useQuery({
    queryKey: ['materials', { limit: 100 }],
    queryFn: () => suppliersAPI.listMaterials({ limit: 100 }),
    enabled: open,
  })

  const projects = projectsData?.data || []
  const suppliers = suppliersData?.data || []
  const materials = materialsData?.data || []

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

  const addItem = () => {
    if (!selectedMaterialId) {
      toast.error('Selecione um material')
      return
    }
    if (!itemQuantity || Number(itemQuantity) <= 0) {
      toast.error('Informe uma quantidade válida')
      return
    }
    if (!itemUnitPrice || Number(itemUnitPrice) <= 0) {
      toast.error('Informe um preço unitário válido')
      return
    }

    const material = materials.find((m: any) => m.id === selectedMaterialId)
    if (!material) return

    // Check if material already added
    if (items.some(i => i.materialId === selectedMaterialId)) {
      toast.error('Este material já foi adicionado ao pedido')
      return
    }

    setItems([
      ...items,
      {
        materialId: selectedMaterialId,
        materialName: material.name,
        unit: material.unit,
        quantity: Number(itemQuantity),
        unitPrice: Number(itemUnitPrice),
      },
    ])

    setSelectedMaterialId('')
    setItemQuantity('')
    setItemUnitPrice('')
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const mutation = useMutation({
    mutationFn: () =>
      suppliersAPI.createPurchaseOrder({
        projectId,
        supplierId,
        deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : undefined,
        notes: notes || undefined,
        items: items.map(i => ({
          materialId: i.materialId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      }),
    onSuccess: () => {
      toast.success('Pedido de compra criado!')
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-purchase-orders'] })
      onOpenChange(false)
      resetForm()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const resetForm = () => {
    setProjectId('')
    if (!defaultSupplierId) setSupplierId('')
    setDeliveryDate('')
    setNotes('')
    setItems([])
    setSelectedMaterialId('')
    setItemQuantity('')
    setItemUnitPrice('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) {
      toast.error('Selecione um projeto')
      return
    }
    if (!supplierId) {
      toast.error('Selecione um fornecedor')
      return
    }
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido')
      return
    }
    mutation.mutate()
  }

  // Auto-fill price from supplier-material link
  const handleMaterialSelect = (matId: string) => {
    setSelectedMaterialId(matId)
    const material = materials.find((m: any) => m.id === matId)
    if (material) {
      setItemUnitPrice(String(material.currentPrice))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Pedido de Compra</DialogTitle>
          <DialogDescription>
            Preencha as informações para criar um novo pedido de compra.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Projeto *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!defaultSupplierId && (
              <div>
                <Label>Fornecedor *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="deliveryDate">Data de Entrega</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o pedido (opcional)"
              rows={2}
            />
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-neutral-700">Itens do Pedido</h3>

            {/* Add item row */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Material</Label>
                <Select value={selectedMaterialId} onValueChange={handleMaterialSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24">
                <Label>Qtd</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="w-32">
                <Label>Preço Unit.</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={itemUnitPrice}
                  onChange={(e) => setItemUnitPrice(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <Button type="button" variant="secondary" size="icon" onClick={addItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Items table */}
            {items.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.materialName} ({item.unit})</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">R$ {item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {(item.quantity * item.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-semibold">
                      Total do Pedido
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      R$ {totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
              Criar Pedido
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
