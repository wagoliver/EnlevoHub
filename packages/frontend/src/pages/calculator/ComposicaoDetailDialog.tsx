import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { sinapiAPI } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Calculator } from 'lucide-react'

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

const tipoLabels: Record<string, string> = {
  MATERIAL: 'Material',
  MAO_DE_OBRA: 'Mão de Obra',
  EQUIPAMENTO: 'Equipamento',
  SERVICO: 'Serviço',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface ComposicaoDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  composicaoId: string
  onImport?: (data: { composicaoId: string; uf: string; mesReferencia: string; quantidade: number; desonerado: boolean }) => void
}

export function ComposicaoDetailDialog({
  open,
  onOpenChange,
  composicaoId,
  onImport,
}: ComposicaoDetailDialogProps) {
  const [uf, setUf] = useState('SP')
  const [mesReferencia, setMesReferencia] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [quantidade, setQuantidade] = useState(1)
  const [desonerado, setDesonerado] = useState(false)
  const [showCalc, setShowCalc] = useState(false)

  const { data: composicao, isLoading } = useQuery({
    queryKey: ['sinapi-composicao', composicaoId],
    queryFn: () => sinapiAPI.getComposicao(composicaoId),
    enabled: open && !!composicaoId,
  })

  const { data: calculo, isLoading: calcLoading } = useQuery({
    queryKey: ['sinapi-calculate', composicaoId, uf, mesReferencia, quantidade, desonerado],
    queryFn: () => sinapiAPI.calculateComposicao(composicaoId, { uf, mesReferencia, quantidade, desonerado }),
    enabled: open && showCalc && !!composicaoId,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Composição SINAPI
            {composicao && (
              <Badge variant="secondary" className="font-mono text-xs">
                {composicao.codigo}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : composicao ? (
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
            <div>
              <p className="text-sm text-neutral-700">{composicao.descricao}</p>
              <p className="text-xs text-neutral-400 mt-1">Unidade: {composicao.unidade}</p>
            </div>

            {/* Itens da composição */}
            {composicao.itens?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">
                  Insumos ({composicao.itens.length})
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Código</TableHead>
                        <TableHead className="text-xs">Descrição</TableHead>
                        <TableHead className="text-xs">Tipo</TableHead>
                        <TableHead className="text-xs">Unidade</TableHead>
                        <TableHead className="text-xs text-right">Coeficiente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {composicao.itens.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs font-mono">{item.insumo.codigo}</TableCell>
                          <TableCell className="text-xs max-w-[250px] truncate">{item.insumo.descricao}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px]">
                              {tipoLabels[item.insumo.tipo] || item.insumo.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{item.insumo.unidade}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{Number(item.coeficiente).toFixed(4)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Calcular custo */}
            <div className="border rounded-lg p-4 space-y-3 bg-neutral-50">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Calcular Custo</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCalc(true)}
                >
                  <Calculator className="h-3.5 w-3.5 mr-1" />
                  Calcular
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">UF</Label>
                  <Select value={uf} onValueChange={setUf}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UFS.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Mês Referência</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="2024-01"
                    value={mesReferencia}
                    onChange={(e) => setMesReferencia(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Quantidade</Label>
                  <Input
                    className="h-8 text-xs"
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Regime</Label>
                  <Select value={desonerado ? 'true' : 'false'} onValueChange={(v) => setDesonerado(v === 'true')}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Não Desonerado</SelectItem>
                      <SelectItem value="true">Desonerado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {calcLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                </div>
              )}

              {calculo && (
                <div className="pt-2 border-t space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Custo unitário:</span>
                    <span className="text-sm font-medium">{formatCurrency(calculo.custoUnitarioTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Custo total ({quantidade}x):</span>
                    <span className="text-lg font-bold text-green-700">{formatCurrency(calculo.custoTotal)}</span>
                  </div>
                  {calculo.itensSemPreco > 0 && (
                    <p className="text-xs text-amber-600">
                      {calculo.itensSemPreco} insumo(s) sem preço para {uf}/{mesReferencia}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {onImport && composicao && (
          <div className="flex justify-end pt-3 border-t">
            <Button
              onClick={() => {
                onImport({ composicaoId, uf, mesReferencia, quantidade, desonerado })
                onOpenChange(false)
              }}
            >
              Importar para Levantamento
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
