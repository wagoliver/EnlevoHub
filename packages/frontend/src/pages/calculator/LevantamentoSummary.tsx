import { useQuery } from '@tanstack/react-query'
import { levantamentoAPI } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function LevantamentoSummary({
  projectId,
  levantamentoId,
}: {
  projectId: string
  levantamentoId: string
}) {
  const { data: resumo, isLoading } = useQuery({
    queryKey: ['levantamento-resumo', projectId, levantamentoId],
    queryFn: () => levantamentoAPI.getResumo(projectId, levantamentoId),
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </CardContent>
      </Card>
    )
  }

  if (!resumo) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Resumo do Levantamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-neutral-500">Total de Itens</p>
            <p className="text-lg font-bold">{resumo.totalItens}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Custo Total</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(resumo.totalGeral)}</p>
          </div>
        </div>

        {resumo.etapas.length > 0 && (
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">Por Etapa</p>
            <div className="space-y-2">
              {resumo.etapas.map((etapa: any) => (
                <div
                  key={etapa.nome}
                  className="flex items-center justify-between py-1.5 px-3 rounded bg-neutral-50"
                >
                  <div>
                    <span className="text-sm font-medium">{etapa.nome}</span>
                    <span className="text-xs text-neutral-400 ml-2">({etapa.itens} itens)</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(etapa.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
