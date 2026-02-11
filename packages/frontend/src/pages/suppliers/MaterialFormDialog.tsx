import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

const CATEGORIES = [
  'Cimento',
  'Areia',
  'Brita',
  'Ferro/Aço',
  'Madeira',
  'Tubulação',
  'Elétrica',
  'Pintura',
  'Acabamento',
  'Outros',
]

const UNITS = ['kg', 'm³', 'un', 'm²', 'L', 'peça', 'saco', 'm', 'ton']

const materialFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  currentPrice: z.coerce.number().positive('Preço deve ser positivo'),
  description: z.string().optional(),
})

type MaterialFormValues = z.infer<typeof materialFormSchema>

interface MaterialFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material?: any
}

export function MaterialFormDialog({
  open,
  onOpenChange,
  material,
}: MaterialFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!material

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: material
      ? {
          name: material.name,
          category: material.category,
          unit: material.unit,
          currentPrice: material.currentPrice,
          description: material.description || '',
        }
      : {
          name: '',
          category: '',
          unit: '',
          currentPrice: 0,
          description: '',
        },
  })

  const mutation = useMutation({
    mutationFn: async (values: MaterialFormValues) => {
      const payload = {
        name: values.name,
        category: values.category,
        unit: values.unit,
        currentPrice: Number(values.currentPrice),
        description: values.description || undefined,
      }

      if (isEdit) {
        return suppliersAPI.updateMaterial(material.id, payload)
      }
      return suppliersAPI.createMaterial(payload)
    },
    onSuccess: () => {
      toast.success(
        isEdit ? 'Material atualizado!' : 'Material cadastrado!'
      )
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-materials'] })
      onOpenChange(false)
      form.reset()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (values: MaterialFormValues) => {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Material' : 'Novo Material'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações do material.'
              : 'Preencha as informações para cadastrar um novo material no catálogo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Nome do material"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={form.watch('category')}
                onValueChange={(value) => form.setValue('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.category && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.category.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="unit">Unidade *</Label>
              <Select
                value={form.watch('unit')}
                onValueChange={(value) => form.setValue('unit', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.unit && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.unit.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="currentPrice">Preço Atual (R$) *</Label>
            <Input
              id="currentPrice"
              type="number"
              min={0}
              step={0.01}
              {...form.register('currentPrice')}
              placeholder="0,00"
            />
            {form.formState.errors.currentPrice && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.currentPrice.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Descrição do material (opcional)"
              rows={3}
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
              {isEdit ? 'Salvar' : 'Cadastrar Material'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
