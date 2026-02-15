import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Ruler, Square, Maximize, Wand2 } from 'lucide-react'
import { ManualCalculator } from './ManualCalculator'
import { SinapiCalculator } from './SinapiCalculator'
import { GerarServicosDialog } from './GerarServicosDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { calcularAreas } from './servicosCatalogo'

const TIPO_LABELS: Record<string, string> = {
  SALA: 'Sala',
  QUARTO: 'Quarto',
  COZINHA: 'Cozinha',
  BANHEIRO: 'Banheiro',
  AREA_SERVICO: 'Area de Servico',
  VARANDA: 'Varanda',
  GARAGEM: 'Garagem',
  HALL: 'Hall',
  CORREDOR: 'Corredor',
  AREA_COMUM: 'Area Comum',
  OUTRO: 'Outro',
}

interface AmbienteDetailProps {
  ambiente: any
  projectId: string
  levantamentoId: string
  itens: any[]
}

export function AmbienteDetail({ ambiente, projectId, levantamentoId, itens }: AmbienteDetailProps) {
  const [gerarOpen, setGerarOpen] = useState(false)
  const areas = useMemo(() => calcularAreas(ambiente), [ambiente])

  const ambienteItens = useMemo(
    () => itens.filter((i: any) => i.ambienteId === ambiente.id),
    [itens, ambiente.id],
  )

  return (
    <div className="space-y-4">
      {/* Ambiente info header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-semibold">{ambiente.nome}</h3>
          <Badge variant="secondary">{TIPO_LABELS[ambiente.tipo] || ambiente.tipo}</Badge>
          <span className="text-sm text-neutral-500">
            {Number(ambiente.comprimento).toFixed(2)} x {Number(ambiente.largura).toFixed(2)} m
            &middot; Pe-dir: {Number(ambiente.peDireito).toFixed(2)} m
            &middot; {ambiente.qtdPortas} porta{ambiente.qtdPortas !== 1 ? 's' : ''}
            &middot; {ambiente.qtdJanelas} janela{ambiente.qtdJanelas !== 1 ? 's' : ''}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setGerarOpen(true)}>
          <Wand2 className="h-4 w-4 mr-1.5" />
          Gerar Servicos
        </Button>
      </div>

      {/* Calculated areas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-blue-50/60 border-blue-200">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Square className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Piso</span>
            </div>
            <p className="text-lg font-bold text-blue-800">{areas.areaPiso.toFixed(2)} m2</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/60 border-amber-200">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Maximize className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Paredes (liq.)</span>
            </div>
            <p className="text-lg font-bold text-amber-800">{areas.areaParedeLiquida.toFixed(2)} m2</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50/60 border-green-200">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Square className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Teto</span>
            </div>
            <p className="text-lg font-bold text-green-800">{areas.areaTeto.toFixed(2)} m2</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50/60 border-purple-200">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Ruler className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Perimetro</span>
            </div>
            <p className="text-lg font-bold text-purple-800">{areas.perimetro.toFixed(2)} m</p>
          </CardContent>
        </Card>
      </div>

      {/* Empty state: prompt to generate services */}
      {ambienteItens.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center">
          <Wand2 className="h-8 w-8 text-primary/50 mx-auto" />
          <h4 className="mt-2 text-sm font-medium text-neutral-700">Ambiente sem itens</h4>
          <p className="mt-1 text-xs text-neutral-500 max-w-md mx-auto">
            Clique em "Gerar Servicos" para criar automaticamente os itens de construcao
            deste ambiente (alvenaria, pintura, piso, etc.) com as quantidades ja calculadas.
          </p>
          <Button size="sm" className="mt-3" onClick={() => setGerarOpen(true)}>
            <Wand2 className="h-4 w-4 mr-1.5" />
            Gerar Servicos
          </Button>
        </div>
      )}

      {/* Materials for this ambiente */}
      {ambienteItens.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Materiais deste Ambiente
              <span className="text-xs font-normal text-neutral-400">
                ({ambienteItens.length} ite{ambienteItens.length === 1 ? 'm' : 'ns'})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual">
              <TabsList>
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="sinapi">SINAPI</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="mt-4">
                <ManualCalculator
                  projectId={projectId}
                  levantamentoId={levantamentoId}
                  itens={ambienteItens}
                  ambienteId={ambiente.id}
                />
              </TabsContent>

              <TabsContent value="sinapi" className="mt-4">
                <SinapiCalculator
                  projectId={projectId}
                  levantamentoId={levantamentoId}
                  ambienteId={ambiente.id}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Gerar Servicos Dialog */}
      <GerarServicosDialog
        open={gerarOpen}
        onOpenChange={setGerarOpen}
        ambiente={ambiente}
        projectId={projectId}
        levantamentoId={levantamentoId}
      />
    </div>
  )
}
