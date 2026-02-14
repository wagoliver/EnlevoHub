import { useState, useEffect } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

const AMBIENTE_TIPOS = [
  { value: 'SALA', label: 'Sala' },
  { value: 'QUARTO', label: 'Quarto' },
  { value: 'COZINHA', label: 'Cozinha' },
  { value: 'BANHEIRO', label: 'Banheiro' },
  { value: 'AREA_SERVICO', label: 'Área de Serviço' },
  { value: 'VARANDA', label: 'Varanda' },
  { value: 'GARAGEM', label: 'Garagem' },
  { value: 'HALL', label: 'Hall' },
  { value: 'CORREDOR', label: 'Corredor' },
  { value: 'AREA_COMUM', label: 'Área Comum' },
  { value: 'OUTRO', label: 'Outro' },
] as const

interface AmbienteFormData {
  nome: string
  tipo: string
  comprimento: string
  largura: string
  peDireito: string
  qtdPortas: string
  qtdJanelas: string
  observacoes: string
}

const defaultFormData: AmbienteFormData = {
  nome: '',
  tipo: 'SALA',
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

  useEffect(() => {
    if (editData) {
      setForm({
        nome: editData.nome || '',
        tipo: editData.tipo || 'SALA',
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

  const handleSubmit = () => {
    const comp = parseFloat(form.comprimento)
    const larg = parseFloat(form.largura)
    const pe = parseFloat(form.peDireito)
    if (!form.nome || isNaN(comp) || isNaN(larg) || comp <= 0 || larg <= 0) return

    onSubmit({
      nome: form.nome,
      tipo: form.tipo,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editData ? 'Editar Ambiente' : 'Novo Ambiente'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Sala, Quarto 1"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AMBIENTE_TIPOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
