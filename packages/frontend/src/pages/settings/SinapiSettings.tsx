import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { sinapiAPI } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, Loader2, CheckCircle2, AlertCircle, Database, Info } from 'lucide-react'

type ImportType = 'insumos' | 'composicoes' | 'precos'

export function SinapiSettings() {
  const [importType, setImportType] = useState<ImportType>('insumos')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<any>(null)

  const { data: meses } = useQuery({
    queryKey: ['sinapi-meses'],
    queryFn: () => sinapiAPI.getMesesReferencia(),
  })

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
      toast.success(`Importacao concluida: ${data.importedCount} registros importados`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleReset = () => {
    setFile(null)
    setResult(null)
  }

  const mesesList = Array.isArray(meses) ? meses : []

  return (
    <div className="space-y-6">
      {/* Status da base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Status da Base SINAPI
          </CardTitle>
          <CardDescription>
            Meses de referencia disponiveis na base local
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mesesList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {mesesList.map((mes: string) => (
                <span
                  key={mes}
                  className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
                >
                  {mes}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              Nenhum dado importado ainda. Importe os arquivos CSV abaixo.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Importacao */}
      <Card>
        <CardHeader>
          <CardTitle>Importar Dados SINAPI</CardTitle>
          <CardDescription>
            Importe os dados do SINAPI a partir de arquivos CSV disponibilizados pela Caixa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de Importacao</Label>
              <Select value={importType} onValueChange={(v) => { setImportType(v as ImportType); handleReset() }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="insumos">Insumos (materiais, mao de obra, equipamentos)</SelectItem>
                  <SelectItem value="composicoes">Composicoes (receitas de servicos)</SelectItem>
                  <SelectItem value="precos">Precos por UF/mes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Arquivo CSV</Label>
              <Input
                type="file"
                accept=".csv,.txt"
                onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null) }}
              />
            </div>
          </div>

          {/* Colunas esperadas */}
          <div className="text-xs text-neutral-500 bg-neutral-50 rounded-lg p-3">
            <p className="font-medium mb-1">Colunas esperadas para "{importType}":</p>
            {importType === 'insumos' && (
              <code className="text-neutral-700">codigo; descricao; unidade; tipo</code>
            )}
            {importType === 'composicoes' && (
              <code className="text-neutral-700">composicao_codigo; composicao_descricao; composicao_unidade; insumo_codigo; coeficiente</code>
            )}
            {importType === 'precos' && (
              <code className="text-neutral-700">codigo; uf; mes_referencia; preco_desonerado; preco_nao_desonerado</code>
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

          <div className="flex items-center gap-3">
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
        </CardContent>
      </Card>

      {/* Dica de ordem de importacao */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex gap-3 pt-6">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Ordem de Importacao</h3>
            <p className="mt-1 text-sm text-blue-700">
              Para importar a base completa, siga esta ordem:
            </p>
            <ol className="mt-2 space-y-1 text-sm text-blue-700 list-decimal list-inside">
              <li><strong>Insumos</strong> — materiais, mao de obra e equipamentos</li>
              <li><strong>Composicoes</strong> — receitas de servicos com coeficientes</li>
              <li><strong>Precos</strong> — precos por UF e mes de referencia</li>
            </ol>
            <p className="mt-2 text-xs text-blue-600">
              Os precos referenciam insumos, e as composicoes referenciam insumos.
              Importar nesta ordem evita erros de referencia.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
