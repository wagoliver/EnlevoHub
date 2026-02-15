import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Database,
  Info,
  Download,
} from 'lucide-react'

function buildMonthOptions() {
  const options: { label: string; year: number; month: number }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const mm = String(m).padStart(2, '0')
    options.push({ label: `${mm}/${y}`, year: y, month: m })
  }
  return options
}

function formatNumber(n: number) {
  return n.toLocaleString('pt-BR')
}

export function SinapiSettings() {
  const queryClient = useQueryClient()

  // Coleta automatica
  const monthOptions = buildMonthOptions()
  const [selectedMonth, setSelectedMonth] = useState(
    `${monthOptions[0].year}-${monthOptions[0].month}`,
  )
  const [collectResult, setCollectResult] = useState<any>(null)

  // Upload ZIP
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [zipResult, setZipResult] = useState<any>(null)

  const { data: stats } = useQuery({
    queryKey: ['sinapi-stats'],
    queryFn: () => sinapiAPI.getStats(),
  })

  const collectMutation = useMutation({
    mutationFn: async () => {
      const [y, m] = selectedMonth.split('-').map(Number)
      return sinapiAPI.collect(y, m)
    },
    onSuccess: (data) => {
      setCollectResult(data)
      queryClient.invalidateQueries({ queryKey: ['sinapi-stats'] })
      toast.success('Coleta SINAPI finalizada com sucesso')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const zipUploadMutation = useMutation({
    mutationFn: async () => {
      if (!zipFile) throw new Error('Selecione um arquivo ZIP')
      return sinapiAPI.collectFromZip(zipFile)
    },
    onSuccess: (data) => {
      setZipResult(data)
      setZipFile(null)
      queryClient.invalidateQueries({ queryKey: ['sinapi-stats'] })
      toast.success('Importacao do ZIP finalizada com sucesso')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const hasData = stats && (stats.insumos > 0 || stats.composicoes > 0)

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
            Resumo dos dados SINAPI importados na base local
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border bg-neutral-50 p-4 text-center">
                  <p className="text-2xl font-bold text-primary-700">{formatNumber(stats.insumos)}</p>
                  <p className="text-xs text-neutral-500 mt-1">Insumos</p>
                </div>
                <div className="rounded-lg border bg-neutral-50 p-4 text-center">
                  <p className="text-2xl font-bold text-primary-700">{formatNumber(stats.composicoes)}</p>
                  <p className="text-xs text-neutral-500 mt-1">Composicoes</p>
                </div>
                <div className="rounded-lg border bg-neutral-50 p-4 text-center">
                  <p className="text-2xl font-bold text-primary-700">{formatNumber(stats.precos)}</p>
                  <p className="text-xs text-neutral-500 mt-1">Precos</p>
                </div>
              </div>

              {stats.meses.length > 0 && (
                <div>
                  <p className="text-xs text-neutral-500 mb-2">Meses de referencia disponiveis:</p>
                  <div className="flex flex-wrap gap-2">
                    {stats.meses.map((mes: string) => (
                      <span
                        key={mes}
                        className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
                      >
                        {mes}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              Nenhum dado importado ainda. Use a coleta automatica ou importe um ZIP abaixo.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Coleta automatica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Coleta Automatica
          </CardTitle>
          <CardDescription>
            Baixa e importa automaticamente todos os dados (insumos, composicoes e precos) direto do site da Caixa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label>Mes de referencia</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => { setCollectResult(null); collectMutation.mutate() }}
              disabled={collectMutation.isPending}
              size="lg"
            >
              {collectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {collectMutation.isPending ? 'Coletando...' : 'Coletar Base SINAPI'}
            </Button>
          </div>

          {collectMutation.isPending && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Coletando dados do SINAPI...
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Baixando ZIP, extraindo XLSX e importando insumos, composicoes e precos.
                    Isso pode levar alguns minutos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {collectMutation.isError && !collectResult && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-900">Falha na coleta</p>
                  <p className="text-xs text-red-700 mt-1">
                    {collectMutation.error?.message || 'Erro desconhecido'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {collectResult && (
            <div className={`rounded-lg p-4 border ${collectResult.errors?.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-start gap-2">
                {collectResult.errors?.length > 0 ? (
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                )}
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Coleta {collectResult.mesReferencia} finalizada
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                    <span className="text-neutral-600">Insumos:</span>
                    <span className="font-medium">{collectResult.insumos?.imported ?? 0} de {collectResult.insumos?.total ?? 0}</span>
                    <span className="text-neutral-600">Precos:</span>
                    <span className="font-medium">{collectResult.precos?.imported ?? 0} de {collectResult.precos?.total ?? 0}</span>
                    <span className="text-neutral-600">Composicoes:</span>
                    <span className="font-medium">{collectResult.composicoes?.imported ?? 0} de {collectResult.composicoes?.total ?? 0}</span>
                    <span className="text-neutral-600">Itens analiticos:</span>
                    <span className="font-medium">{collectResult.analitico?.imported ?? 0} de {collectResult.analitico?.total ?? 0}</span>
                  </div>
                  {collectResult.errors?.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto text-xs text-neutral-600 space-y-0.5">
                      <p className="text-amber-600 font-medium">{collectResult.errors.length} erro(s):</p>
                      {collectResult.errors.map((err: string, i: number) => (
                        <p key={i}>{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload ZIP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar ZIP do SINAPI
          </CardTitle>
          <CardDescription>
            Baixe o ZIP oficial do site da Caixa no seu computador e faca o upload aqui.
            Util quando o servidor nao consegue baixar diretamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label>Arquivo ZIP do SINAPI</Label>
              <Input
                type="file"
                accept=".zip"
                onChange={(e) => { setZipFile(e.target.files?.[0] || null); setZipResult(null) }}
              />
              <p className="text-xs text-neutral-500">
                Baixe de{' '}
                <a
                  href="https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/Paginas/default.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  caixa.gov.br/sinapi
                </a>
                {' '}o arquivo "Referencia de Precos" no formato XLSX (ZIP).
              </p>
            </div>

            <Button
              onClick={() => { setZipResult(null); zipUploadMutation.mutate() }}
              disabled={!zipFile || zipUploadMutation.isPending}
              size="lg"
            >
              {zipUploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {zipUploadMutation.isPending ? 'Importando...' : 'Importar ZIP'}
            </Button>
          </div>

          {zipUploadMutation.isPending && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Processando ZIP do SINAPI...
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Extraindo XLSX e importando insumos, composicoes e precos.
                    Isso pode levar alguns minutos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {zipUploadMutation.isError && !zipResult && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-900">Falha na importacao</p>
                  <p className="text-xs text-red-700 mt-1">
                    {zipUploadMutation.error?.message || 'Erro desconhecido'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {zipResult && (
            <div className={`rounded-lg p-4 border ${zipResult.errors?.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-start gap-2">
                {zipResult.errors?.length > 0 ? (
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                )}
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Importacao {zipResult.mesReferencia} finalizada
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                    <span className="text-neutral-600">Insumos:</span>
                    <span className="font-medium">{zipResult.insumos?.imported ?? 0} de {zipResult.insumos?.total ?? 0}</span>
                    <span className="text-neutral-600">Precos:</span>
                    <span className="font-medium">{zipResult.precos?.imported ?? 0} de {zipResult.precos?.total ?? 0}</span>
                    <span className="text-neutral-600">Composicoes:</span>
                    <span className="font-medium">{zipResult.composicoes?.imported ?? 0} de {zipResult.composicoes?.total ?? 0}</span>
                    <span className="text-neutral-600">Itens analiticos:</span>
                    <span className="font-medium">{zipResult.analitico?.imported ?? 0} de {zipResult.analitico?.total ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dica */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex gap-3 pt-6">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Como funciona</h3>
            <p className="mt-1 text-sm text-blue-700">
              A coleta automatica baixa o arquivo XLSX oficial da Caixa para o mes selecionado e
              importa tudo de uma vez: insumos, precos por UF (com e sem desoneracao) e composicoes
              analiticas com coeficientes. Se o servidor nao conseguir baixar (CDN bloqueado),
              use a opcao de importar ZIP manualmente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
