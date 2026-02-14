import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Ruler, Square, Maximize } from 'lucide-react'
import { ManualCalculator } from './ManualCalculator'
import { SinapiCalculator } from './SinapiCalculator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

function calcAreas(ambiente: any) {
  const comp = Number(ambiente.comprimento)
  const larg = Number(ambiente.largura)
  const pe = Number(ambiente.peDireito)
  const portas = ambiente.qtdPortas ?? 0
  const janelas = ambiente.qtdJanelas ?? 0

  const areaPiso = comp * larg
  const perimetro = 2 * (comp + larg)
  const areaParedeBruta = perimetro * pe
  const areaPortas = portas * 1.60 * 2.10
  const areaJanelas = janelas * 1.20 * 1.20
  const areaParedeLiquida = Math.max(0, areaParedeBruta - areaPortas - areaJanelas)
  const areaTeto = areaPiso

  return { areaPiso, perimetro, areaParedeBruta, areaPortas, areaJanelas, areaParedeLiquida, areaTeto }
}

export function AmbienteDetail({ ambiente, projectId, levantamentoId, itens }: AmbienteDetailProps) {
  const areas = useMemo(() => calcAreas(ambiente), [ambiente])

  const ambienteItens = useMemo(
    () => itens.filter((i: any) => i.ambienteId === ambiente.id),
    [itens, ambiente.id],
  )

  return (
    <div className="space-y-4">
      {/* Ambiente info header */}
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

      {/* Materials for this ambiente */}
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
    </div>
  )
}
