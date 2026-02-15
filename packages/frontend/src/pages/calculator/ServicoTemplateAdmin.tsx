import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { levantamentoAPI } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Settings, Plus, Pencil, Trash2, RotateCcw, Loader2 } from 'lucide-react'

const AREA_TIPO_LABELS: Record<string, string> = {
  PISO: 'Piso',
  PAREDE_LIQ: 'Parede liq.',
  TETO: 'Teto',
  PERIMETRO: 'Perimetro',
}

const AMBIENTE_TIPO_OPTIONS = [
  { value: 'SALA', label: 'Sala' },
  { value: 'QUARTO', label: 'Quarto' },
  { value: 'COZINHA', label: 'Cozinha' },
  { value: 'BANHEIRO', label: 'Banheiro' },
  { value: 'AREA_SERVICO', label: 'Area Servico' },
  { value: 'VARANDA', label: 'Varanda' },
  { value: 'GARAGEM', label: 'Garagem' },
  { value: 'HALL', label: 'Hall' },
  { value: 'CORREDOR', label: 'Corredor' },
  { value: 'AREA_COMUM', label: 'Area Comum' },
  { value: 'OUTRO', label: 'Outro' },
]

interface TemplateFormData {
  nome: string
  sinapiCodigo: string
  unidade: string
  areaTipo: string
  aplicaEm: string[]
  padrao: boolean
  etapa: string
  order: number
}

const emptyForm: TemplateFormData = {
  nome: '',
  sinapiCodigo: '',
  unidade: 'm²',
  areaTipo: 'PISO',
  aplicaEm: [],
  padrao: true,
  etapa: '',
  order: 0,
}

interface ServicoTemplateAdminProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ServicoTemplateAdmin({ open, onOpenChange }: ServicoTemplateAdminProps) {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TemplateFormData>({ ...emptyForm })

  const { data: templates, isLoading } = useQuery({
    queryKey: ['servico-templates'],
    queryFn: () => levantamentoAPI.listTemplates(),
    enabled: open,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => levantamentoAPI.createTemplate(data),
    onSuccess: () => {
      toast.success('Template criado')
      queryClient.invalidateQueries({ queryKey: ['servico-templates'] })
      setFormOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => levantamentoAPI.updateTemplate(id, data),
    onSuccess: () => {
      toast.success('Template atualizado')
      queryClient.invalidateQueries({ queryKey: ['servico-templates'] })
      setFormOpen(false)
      setEditingId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => levantamentoAPI.deleteTemplate(id),
    onSuccess: () => {
      toast.success('Template removido')
      queryClient.invalidateQueries({ queryKey: ['servico-templates'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const resetMutation = useMutation({
    mutationFn: () => levantamentoAPI.resetTemplates(),
    onSuccess: (data) => {
      toast.success(data.message || 'Templates restaurados')
      queryClient.invalidateQueries({ queryKey: ['servico-templates'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleNew = () => {
    setEditingId(null)
    setForm({ ...emptyForm })
    setFormOpen(true)
  }

  const handleEdit = (t: any) => {
    setEditingId(t.id)
    setForm({
      nome: t.nome,
      sinapiCodigo: t.sinapiCodigo || '',
      unidade: t.unidade,
      areaTipo: t.areaTipo,
      aplicaEm: Array.isArray(t.aplicaEm) ? t.aplicaEm : [],
      padrao: t.padrao,
      etapa: t.etapa,
      order: t.order,
    })
    setFormOpen(true)
  }

  const handleSubmit = () => {
    if (!form.nome || !form.etapa) {
      toast.error('Preencha nome e etapa')
      return
    }
    const data = {
      ...form,
      sinapiCodigo: form.sinapiCodigo || null,
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleToggleAplicaEm = (tipo: string) => {
    setForm((prev) => ({
      ...prev,
      aplicaEm: prev.aplicaEm.includes(tipo)
        ? prev.aplicaEm.filter((t) => t !== tipo)
        : [...prev.aplicaEm, tipo],
    }))
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Templates de Servicos
            </DialogTitle>
            <DialogDescription>
              Configure quais composicoes SINAPI sao sugeridas para cada tipo de ambiente.
              Estes templates sao usados pelo "Gerar Servicos".
            </DialogDescription>
          </DialogHeader>

          {/* Actions bar */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <Button size="sm" onClick={handleNew}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Isso vai apagar todos os templates e restaurar os padroes. Continuar?')) {
                  resetMutation.mutate()
                }
              }}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-1" />
              )}
              Restaurar Padroes
            </Button>
          </div>

          {/* Templates table */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs w-24">Cod. SINAPI</TableHead>
                    <TableHead className="text-xs w-16">Un.</TableHead>
                    <TableHead className="text-xs w-24">Area</TableHead>
                    <TableHead className="text-xs w-28">Etapa</TableHead>
                    <TableHead className="text-xs w-32">Aplica em</TableHead>
                    <TableHead className="text-xs w-16">Padrao</TableHead>
                    <TableHead className="text-xs w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(templates || []).map((t: any) => (
                    <TableRow key={t.id} className={t.ativo === false ? 'opacity-50' : ''}>
                      <TableCell className="text-xs font-medium">{t.nome}</TableCell>
                      <TableCell>
                        {t.sinapiCodigo ? (
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {t.sinapiCodigo}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-neutral-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{t.unidade}</TableCell>
                      <TableCell className="text-xs">{AREA_TIPO_LABELS[t.areaTipo] || t.areaTipo}</TableCell>
                      <TableCell className="text-xs text-neutral-500">{t.etapa}</TableCell>
                      <TableCell>
                        {Array.isArray(t.aplicaEm) && t.aplicaEm.length > 0 ? (
                          <div className="flex flex-wrap gap-0.5">
                            {t.aplicaEm.map((a: string) => (
                              <Badge key={a} variant="outline" className="text-[8px] px-1">
                                {a}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-neutral-400">Todos</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {t.padrao ? '✓' : ''}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleEdit(t)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                            onClick={() => {
                              if (confirm(`Remover "${t.nome}"?`)) {
                                deleteMutation.mutate(t.id)
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit form dialog */}
      <Dialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingId(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Template' : 'Novo Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Nome</Label>
                <Input
                  placeholder="Ex: Alvenaria de vedação"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Codigo SINAPI</Label>
                <Input
                  placeholder="Ex: 87292"
                  value={form.sinapiCodigo}
                  onChange={(e) => setForm({ ...form, sinapiCodigo: e.target.value })}
                />
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Codigo da composicao SINAPI para calculo automatico
                </p>
              </div>
              <div>
                <Label className="text-xs">Unidade</Label>
                <Input
                  placeholder="m², m, un"
                  value={form.unidade}
                  onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Tipo de Area</Label>
                <Select value={form.areaTipo} onValueChange={(v) => setForm({ ...form, areaTipo: v })}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PISO">Piso (comp × larg)</SelectItem>
                    <SelectItem value="PAREDE_LIQ">Parede liquida</SelectItem>
                    <SelectItem value="TETO">Teto</SelectItem>
                    <SelectItem value="PERIMETRO">Perimetro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Etapa</Label>
                <Input
                  placeholder="Ex: Alvenaria, Pintura"
                  value={form.etapa}
                  onChange={(e) => setForm({ ...form, etapa: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Ordem</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.padrao}
                  onChange={() => setForm({ ...form, padrao: !form.padrao })}
                />
                <Label className="text-xs">Marcado por padrao</Label>
              </div>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Aplica em (vazio = todos)</Label>
              <div className="flex flex-wrap gap-2">
                {AMBIENTE_TIPO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      form.aplicaEm.includes(opt.value)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                    }`}
                    onClick={() => handleToggleAplicaEm(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                Selecione os ambientes onde este servico se aplica. Vazio = aplica em todos.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingId ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
