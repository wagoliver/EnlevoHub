import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, FileText, Calendar } from 'lucide-react'
import { ApplyTemplateDialog } from './ApplyTemplateDialog'

interface AddActivityDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  existingCount: number
}

export function AddActivityDialog({
  projectId,
  open,
  onOpenChange,
  existingCount,
}: AddActivityDialogProps) {
  const queryClient = useQueryClient()

  // Manual form state
  const [name, setName] = useState('')
  const [weight, setWeight] = useState(1)
  const [scope, setScope] = useState('ALL_UNITS')
  const [unitIdsText, setUnitIdsText] = useState('')

  // Template wizard state
  const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false)

  const createManualMutation = useMutation({
    mutationFn: (data: any) => projectsAPI.createActivity(projectId, data),
    onSuccess: () => {
      toast.success('Atividade criada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] })
      resetForm()
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar atividade')
    },
  })

  const resetForm = () => {
    setName('')
    setWeight(1)
    setScope('ALL_UNITS')
    setUnitIdsText('')
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Nome da atividade é obrigatório')
      return
    }

    const data: any = {
      name: name.trim(),
      weight,
      order: existingCount + 1,
      scope,
    }

    if (scope === 'SPECIFIC_UNITS' && unitIdsText.trim()) {
      data.unitIds = unitIdsText
        .split(/[,\n]+/)
        .map((id) => id.trim())
        .filter(Boolean)
    }

    createManualMutation.mutate(data)
  }

  const openTemplateWizard = () => {
    onOpenChange(false) // Close AddActivityDialog
    setShowApplyTemplateDialog(true)
  }

  const isPending = createManualMutation.isPending

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) resetForm()
          onOpenChange(value)
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Atividade</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="template" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="template">De Template</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
            </TabsList>

            {/* From Template */}
            <TabsContent value="template" className="space-y-4 mt-4">
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-neutral-50 p-8 space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-8 w-8 text-primary" />
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <h4 className="font-medium text-neutral-900">
                    Importar de Template com Cronograma
                  </h4>
                  <p className="mt-1 text-sm text-neutral-500">
                    Selecione um template hierárquico, configure datas de início e fim,
                    e o sistema calculará o cronograma automaticamente.
                  </p>
                </div>
                <Button onClick={openTemplateWizard}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Abrir Assistente de Cronograma
                </Button>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* Manual Creation */}
            <TabsContent value="manual" className="mt-4">
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="activity-name">Nome da Atividade *</Label>
                  <Input
                    id="activity-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Fundação, Alvenaria, Pintura..."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="activity-weight">Peso</Label>
                    <Input
                      id="activity-weight"
                      type="number"
                      min="1"
                      step="1"
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Peso relativo para cálculo de progresso
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="activity-scope">Escopo</Label>
                    <Select value={scope} onValueChange={setScope}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL_UNITS">
                          Todas as Unidades
                        </SelectItem>
                        <SelectItem value="SPECIFIC_UNITS">
                          Unidades Específicas
                        </SelectItem>
                        <SelectItem value="GENERAL">
                          Geral (sem unidade)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {scope === 'SPECIFIC_UNITS' && (
                  <div>
                    <Label htmlFor="activity-units">IDs das Unidades</Label>
                    <Textarea
                      id="activity-units"
                      value={unitIdsText}
                      onChange={(e) => setUnitIdsText(e.target.value)}
                      placeholder="Insira os IDs das unidades separados por vírgula ou em linhas separadas"
                      rows={3}
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Seletor de unidades será disponibilizado em breve. Por
                      enquanto, insira os IDs manualmente.
                    </p>
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {createManualMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Criar Atividade
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Apply Template Wizard Dialog */}
      <ApplyTemplateDialog
        projectId={projectId}
        open={showApplyTemplateDialog}
        onOpenChange={setShowApplyTemplateDialog}
      />
    </>
  )
}
