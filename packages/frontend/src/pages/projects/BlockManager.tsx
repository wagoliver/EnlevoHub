import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormTooltip } from '@/components/ui/FormTooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { BlockFormDialog } from './BlockFormDialog'
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Building2,
  Layers,
} from 'lucide-react'

interface BlockManagerProps {
  projectId: string
}

export function BlockManager({ projectId }: BlockManagerProps) {
  const queryClient = useQueryClient()
  const canCreate = usePermission('units:create')
  const canEdit = usePermission('units:edit')
  const canDelete = usePermission('units:delete')

  const [showFormDialog, setShowFormDialog] = useState(false)
  const [editingBlock, setEditingBlock] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [blockToDelete, setBlockToDelete] = useState<any>(null)

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['project-blocks', projectId],
    queryFn: () => projectsAPI.listBlocks(projectId),
  })

  const deleteMutation = useMutation({
    mutationFn: (blockId: string) => projectsAPI.deleteBlock(projectId, blockId),
    onSuccess: () => {
      toast.success('Bloco excluído com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['project-blocks', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-units', projectId] })
      setDeleteDialogOpen(false)
      setBlockToDelete(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir bloco')
    },
  })

  const handleEdit = (block: any) => {
    setEditingBlock(block)
    setShowFormDialog(true)
  }

  const handleFormClose = (open: boolean) => {
    setShowFormDialog(open)
    if (!open) setEditingBlock(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <h4 className="text-sm font-medium text-neutral-700">Blocos ({blocks.length})</h4>
          <FormTooltip text="Blocos representam edifícios ou torres. Se o projeto tem apenas um edifício, pule esta etapa." />
        </div>
        {canCreate && (
          <Button variant="outline" size="sm" onClick={() => { setEditingBlock(null); setShowFormDialog(true) }}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Novo Bloco
          </Button>
        )}
      </div>

      {blocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-12">
          <Building2 className="h-12 w-12 text-neutral-300" />
          <h3 className="mt-4 text-lg font-medium text-neutral-900">
            Nenhum bloco cadastrado
          </h3>
          <p className="mt-2 text-sm text-neutral-500 text-center max-w-md">
            Blocos representam edifícios ou torres do projeto. Se o projeto possui apenas
            uma edificação, pule este passo e vá direto para as unidades.
          </p>
          {canCreate && (
            <div className="mt-6">
              <Button onClick={() => { setEditingBlock(null); setShowFormDialog(true) }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Bloco
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((block: any) => (
            <Card key={block.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-neutral-400" />
                  <h5 className="font-medium text-neutral-900">{block.name}</h5>
                </div>
                {(canEdit || canDelete) && (
                  <div className="flex gap-1">
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(block)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-neutral-400 hover:text-destructive"
                        onClick={() => { setBlockToDelete(block); setDeleteDialogOpen(true) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-neutral-600">
                {block.floors != null && (
                  <div className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    <span>{block.floors} andares</span>
                  </div>
                )}
                {block._count?.units > 0 && (
                  <span className="text-neutral-400">
                    {block._count.units} unidade{block._count.units > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <BlockFormDialog
        projectId={projectId}
        open={showFormDialog}
        onOpenChange={handleFormClose}
        block={editingBlock}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Bloco</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            Tem certeza que deseja excluir o bloco <strong>{blockToDelete?.name}</strong>?
            As unidades associadas permanecerão, mas perderão a referência ao bloco.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setBlockToDelete(null) }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => blockToDelete && deleteMutation.mutate(blockToDelete.id)}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
