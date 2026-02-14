import { Card, CardContent } from '@/components/ui/card'
import { Lightbulb } from 'lucide-react'

export function SinapiHelpText() {
  return (
    <Card className="bg-amber-50/80 border-amber-100">
      <CardContent className="pt-4 pb-4">
        <div className="flex gap-3">
          <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm text-amber-800">
            <p className="font-medium">O que é SINAPI?</p>
            <p>
              O SINAPI (Sistema Nacional de Pesquisa de Custos e Indices da Construção Civil) é a referência
              oficial de preços do governo brasileiro para obras públicas. Mantido pela Caixa e IBGE, fornece
              custos atualizados de insumos, composições e serviços para cada estado.
            </p>
            <p>
              <strong>Modo Manual:</strong> Adicione materiais livremente com preços próprios.
              <br />
              <strong>Modo SINAPI:</strong> Busque composições oficiais e importe automaticamente com preços de referência.
            </p>
            <p className="text-xs text-amber-600">
              Para usar o modo SINAPI, o administrador (ROOT) deve importar a base de dados via CSV na tela de importação.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
