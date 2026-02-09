import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI, activityTemplatesAPI } from '@/lib/api-client'
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
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, FileText } from 'lucide-react'

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

  // Template state
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  const { data: templatesData } = useQuery({
    queryKey: ['activity-templates-list'],
    queryFn: () => activityTemplatesAPI.list({ limit: 100 }),
    enabled: open,
  })

  const templates = templatesData?.data || []

  const selectedTemplate = templates.find(
    (t: any) => t.id === selectedTemplateId
  )

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

  const createFromTemplateMutation = useMutation({
    mutationFn: (templateId: string) =>
      projectsAPI.createActivitiesFromTemplate(projectId, templateId),
    onSuccess: () => {
      toast.success('Atividades importadas do template com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] })
      resetForm()
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao importar template')
    },
  })

  const resetForm = () => {
    setName('')
    setWeight(1)
    setScope('ALL_UNITS')
    setUnitIdsText('')
    setSelectedTemplateId('')
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

  const handleTemplateApply = () => {
    if (!selectedTemplateId) {
      toast.error('Selecione um template')
      return
    }
    createFromTemplateMutation.mutate(selectedTemplateId)
  }

  const isPending =
    createManualMutation.isPending || createFromTemplateMutation.isPending

  return (
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
            <div>
              <Label htmlFor="template-select">Template</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template: any) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templates.length === 0 && (
                <p className="mt-2 text-sm text-neutral-500">
                  Nenhum template disponível. Crie um em Configurações &gt;
                  Templates de Atividades.
                </p>
              )}
            </div>

            {/* Template Preview */}
            {selectedTemplate && selectedTemplate.items && (
              <div className="rounded-lg border bg-neutral-50 p-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">
                    {selectedTemplate.name}
                  </span>
                  <Badge variant="secondary">
                    {selectedTemplate.items.length} itens
                  </Badge>
                </div>
                {selectedTemplate.description && (
                  <p className="text-sm text-neutral-500 mb-2">
                    {selectedTemplate.description}
                  </p>
                )}
                <div className="space-y-1">
                  {selectedTemplate.items
                    .sort((a: any, b: any) => a.order - b.order)
                    .map((item: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm py-1"
                      >
                        <span className="text-neutral-700">
                          {index + 1}. {item.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Peso: {item.weight}
                        </Badge>
                      </div>
                    ))}
                </div>
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
              <Button
                type="button"
                disabled={!selectedTemplateId || isPending}
                onClick={handleTemplateApply}
              >
                {createFromTemplateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Aplicar
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
  )
}
