import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { sinapiAPI } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface SinapiImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ImportType = 'insumos' | 'composicoes' | 'precos'

export function SinapiImportDialog({ open, onOpenChange }: SinapiImportDialogProps) {
  const [importType, setImportType] = useState<ImportType>('insumos')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<any>(null)

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecione um arquivo')
      const formData = new FormData()
      formData.append('file', file)
      switch (importType) {
        case 'insumos': return sinapiAPI.importInsumos(formData)
        case 'composicoes': return sinapiAPI.importComposicoes(formData)
        case 'precos': return sinapiAPI.importPrecos(formData)
      }
    },
    onSuccess: (data) => {
      setResult(data)
      toast.success(`Importação concluída: ${data.importedCount} registros importados`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleReset = () => {
    setFile(null)
    setResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) handleReset() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Base SINAPI</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tipo de Importação</Label>
            <Select value={importType} onValueChange={(v) => { setImportType(v as ImportType); handleReset() }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="insumos">Insumos (materiais, mão de obra, equipamentos)</SelectItem>
                <SelectItem value="composicoes">Composições (receitas de serviços)</SelectItem>
                <SelectItem value="precos">Preços por UF/mês</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Arquivo CSV</Label>
            <Input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null) }}
            />
            <p className="text-xs text-neutral-400 mt-1">
              Formato CSV com delimitador ponto-e-vírgula (;). Encoding UTF-8 ou Latin1.
            </p>
          </div>

          {/* Colunas esperadas */}
          <div className="text-xs text-neutral-500 bg-neutral-50 rounded p-3">
            <p className="font-medium mb-1">Colunas esperadas:</p>
            {importType === 'insumos' && (
              <p>codigo; descricao; unidade; tipo</p>
            )}
            {importType === 'composicoes' && (
              <p>composicao_codigo; composicao_descricao; composicao_unidade; insumo_codigo; coeficiente</p>
            )}
            {importType === 'precos' && (
              <p>codigo; uf; mes_referencia; preco_desonerado; preco_nao_desonerado</p>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-lg p-4 ${result.errorCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'} border`}>
              <div className="flex items-start gap-2">
                {result.errorCount > 0 ? (
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                )}
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {result.importedCount} de {result.totalRecords} registros importados
                  </p>
                  {result.errorCount > 0 && (
                    <p className="text-xs text-amber-600">{result.errorCount} erro(s)</p>
                  )}
                  {result.errors?.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto text-xs text-neutral-600 space-y-0.5">
                      {result.errors.map((err: string, i: number) => (
                        <p key={i}>{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={!file || importMutation.isPending}
            >
              {importMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Importar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
