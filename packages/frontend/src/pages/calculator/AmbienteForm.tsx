import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { levantamentoAPI } from '@/lib/api-client'

interface AmbienteFormData {
  nome: string
  tags: string[]
  comprimento: string
  largura: string
  peDireito: string
  qtdPortas: string
  qtdJanelas: string
  observacoes: string
}

const defaultFormData: AmbienteFormData = {
  nome: '',
  tags: [],
  comprimento: '',
  largura: '',
  peDireito: '2.80',
  qtdPortas: '1',
  qtdJanelas: '1',
  observacoes: '',
}

interface AmbienteFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
  isPending: boolean
  editData?: any
}

export function AmbienteForm({ open, onOpenChange, onSubmit, isPending, editData }: AmbienteFormProps) {
  const [form, setForm] = useState<AmbienteFormData>({ ...defaultFormData })

  // Fetch available tags from backend
  const { data: availableTags } = useQuery({
    queryKey: ['ambiente-tags'],
    queryFn: () => levantamentoAPI.listTags(),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  })

  useEffect(() => {
    if (editData) {
      setForm({
        nome: editData.nome || '',
        tags: editData.tags || [],
        comprimento: String(editData.comprimento || ''),
        largura: String(editData.largura || ''),
        peDireito: String(editData.peDireito || '2.80'),
        qtdPortas: String(editData.qtdPortas ?? '1'),
        qtdJanelas: String(editData.qtdJanelas ?? '1'),
        observacoes: editData.observacoes || '',
      })
    } else {
      setForm({ ...defaultFormData })
    }
  }, [editData, open])

  const handleTagToggle = (slug: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(slug)
        ? prev.tags.filter((t) => t !== slug)
        : [...prev.tags, slug],
    }))
  }

  const handleSubmit = () => {
    const comp = parseFloat(form.comprimento)
    const larg = parseFloat(form.largura)
    const pe = parseFloat(form.peDireito)
    if (!form.nome || isNaN(comp) || isNaN(larg) || comp <= 0 || larg <= 0) return

    onSubmit({
      nome: form.nome,
      tags: form.tags,
      comprimento: comp,
      largura: larg,
      peDireito: isNaN(pe) || pe <= 0 ? 2.80 : pe,
      qtdPortas: parseInt(form.qtdPortas) || 0,
      qtdJanelas: parseInt(form.qtdJanelas) || 0,
      observacoes: form.observacoes || undefined,
    })
  }

  const comp = parseFloat(form.comprimento)
  const larg = parseFloat(form.largura)
  const areaPiso = !isNaN(comp) && !isNaN(larg) && comp > 0 && larg > 0 ? comp * larg : 0

  const activeTags = (availableTags || []).filter((t: any) => t.ativo !== false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editData ? 'Editar Ambiente' : 'Novo Ambiente'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome do Ambiente</Label>
            <Input
              placeholder="Ex: Sala, Quarto 1, Banheiro Suite"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>

          {/* Tags (characteristics) */}
          {activeTags.length > 0 && (
            <div>
              <Label className="mb-2 block">Caracteristicas</Label>
              <div className="flex flex-wrap gap-2">
                {activeTags.map((tag: any) => (
                  <label
                    key={tag.slug}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
                      form.tags.includes(tag.slug)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <Checkbox
                      checked={form.tags.includes(tag.slug)}
                      onChange={() => handleTagToggle(tag.slug)}
                      className="h-3.5 w-3.5"
                    />
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: tag.cor || '#3b82f6' }}
                    />
                    {tag.nome}
                  </label>
                ))}
              </div>
              {activeTags.some((t: any) => form.tags.includes(t.slug) && t.descricao) && (
                <p className="mt-1.5 text-xs text-neutral-500">
                  {activeTags
                    .filter((t: any) => form.tags.includes(t.slug) && t.descricao)
                    .map((t: any) => t.descricao)
                    .join(' | ')}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Comprimento (m)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.comprimento}
                onChange={(e) => setForm({ ...form, comprimento: e.target.value })}
              />
            </div>
            <div>
              <Label>Largura (m)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.largura}
                onChange={(e) => setForm({ ...form, largura: e.target.value })}
              />
            </div>
            <div>
              <Label>Pe-direito (m)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="2.80"
                value={form.peDireito}
                onChange={(e) => setForm({ ...form, peDireito: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Portas</Label>
              <Input
                type="number"
                min="0"
                value={form.qtdPortas}
                onChange={(e) => setForm({ ...form, qtdPortas: e.target.value })}
              />
            </div>
            <div>
              <Label>Janelas</Label>
              <Input
                type="number"
                min="0"
                value={form.qtdJanelas}
                onChange={(e) => setForm({ ...form, qtdJanelas: e.target.value })}
              />
            </div>
          </div>

          {areaPiso > 0 && (
            <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700">
              Area do piso: <strong>{areaPiso.toFixed(2)} m2</strong>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.nome || !form.comprimento || !form.largura || isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editData ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
