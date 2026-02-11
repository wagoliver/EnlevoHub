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
import { FormTooltip } from '@/components/ui/FormTooltip'
import { Loader2 } from 'lucide-react'

interface BlockFormDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  block?: any
}

export function BlockFormDialog({ projectId, open, onOpenChange, block }: BlockFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!block

  const [name, setName] = useState('')
  const [floors, setFloors] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (block) {
      setName(block.name || '')
      setFloors(block.floors != null ? String(block.floors) : '')
    } else {
      setName('')
      setFloors('')
    }
    setErrors({})
  }, [block, open])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: name.trim(),
      }

      if (floors !== '') payload.floors = parseInt(floors, 10)

      if (isEdit) {
        return projectsAPI.updateBlock(projectId, block.id, payload)
      }
      return projectsAPI.createBlock(projectId, payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Bloco atualizado!' : 'Bloco criado!')
      queryClient.invalidateQueries({ queryKey: ['project-blocks', projectId] })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Nome é obrigatório'
    if (floors !== '' && (parseInt(floors, 10) <= 0 || isNaN(parseInt(floors, 10)))) {
      newErrors.floors = 'Andares deve ser um número positivo'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Bloco' : 'Novo Bloco'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações do bloco.'
              : 'Blocos representam edifícios ou torres do empreendimento.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center">
              <Label htmlFor="block-name">Nome *</Label>
              <FormTooltip text="Identificação do bloco ou torre. Ex: 'Bloco A', 'Torre Norte'" />
            </div>
            <Input
              id="block-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Bloco A"
              maxLength={100}
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <div className="flex items-center">
              <Label htmlFor="block-floors">Andares</Label>
              <FormTooltip text="Quantidade de andares deste bloco. Usado para gerar unidades automaticamente." />
            </div>
            <Input
              id="block-floors"
              type="number"
              min="1"
              value={floors}
              onChange={(e) => setFloors(e.target.value)}
              placeholder="Ex: 10"
            />
            {errors.floors && <p className="text-sm text-destructive mt-1">{errors.floors}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar Bloco'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
