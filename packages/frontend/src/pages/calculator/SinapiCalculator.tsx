import { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { levantamentoAPI } from '@/lib/api-client'
import { useRole } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Database, Upload, Loader2, GitBranch, Plus, X, Package } from 'lucide-react'
import { SinapiSearchDialog } from './SinapiSearchDialog'
import { ComposicaoDetailDialog } from './ComposicaoDetailDialog'
import { SinapiImportDialog } from './SinapiImportDialog'
import { SinapiHelpText } from './SinapiHelpText'

interface SinapiCalculatorProps {
  projectId: string
  levantamentoId: string
  ambienteId?: string
  activityGroups?: any
  fixedActivityId?: string
  fixedActivityName?: string
  baseQuantity?: number
}

export function SinapiCalculator({ projectId, levantamentoId, ambienteId, activityGroups, fixedActivityId, fixedActivityName, baseQuantity }: SinapiCalculatorProps) {
  const role = useRole()
  const queryClient = useQueryClient()
  const isRoot = role === 'ROOT'

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchMode, setSearchMode] = useState<'insumos' | 'composicoes'>('composicoes')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedComposicaoId, setSelectedComposicaoId] = useState<string>('')
  const [importOpen, setImportOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<string>('_none')

  // Selected insumo for add form
  const [selectedInsumo, setSelectedInsumo] = useState<any>(null)
  const [insumoQtd, setInsumoQtd] = useState('1')
  const [insumoPreco, setInsumoPreco] = useState('')

  // Build activity dropdown options from activityGroups (same pattern as ManualCalculator)
  const activityOptions = useMemo(() => {
    if (activityGroups?.activityGroups?.length > 0) {
      return activityGroups.activityGroups.map((g: any) => ({
        value: `${g.activity.id}::${g.activity.name}`,
        label: g.activity.parentName ? `${g.activity.parentName} > ${g.activity.name}` : g.activity.name,
      }))
    }
    return []
  }, [activityGroups])

  // Parse selected activity value into { etapa, projectActivityId }
  const parseActivityValue = (v: string): { etapa: string | null; projectActivityId: string | null } => {
    if (v === '_none' || !v) return { etapa: null, projectActivityId: null }
    const sep = v.indexOf('::')
    if (sep > 0) {
      return { etapa: v.substring(sep + 2), projectActivityId: v.substring(0, sep) }
    }
    return { etapa: null, projectActivityId: null }
  }

  const importComposicaoMutation = useMutation({
    mutationFn: (data: any) => levantamentoAPI.addFromComposicao(projectId, levantamentoId, data),
    onSuccess: (data) => {
      toast.success(`${data.addedCount} itens importados da composição ${data.composicao.codigo}`)
      queryClient.invalidateQueries({ queryKey: ['levantamento-project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['workflow-check', 'levantamento-items'] })
      queryClient.invalidateQueries({ queryKey: ['activity-review-summary', projectId] })
      // Auto-save composição to template
      const etapaName = fixedActivityName || parseActivityValue(selectedActivity).etapa
      if (etapaName && data.composicao) {
        levantamentoAPI.ensureTemplate({
          nomeCustom: data.composicao.descricao || `Composição ${data.composicao.codigo}`,
          etapa: etapaName,
          sinapiCodigo: data.composicao.codigo,
        }).catch(() => {}) // best-effort
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Ref to keep insumo+etapa for ensureTemplate after add
  const pendingTemplateRef = { current: null as { nome: string; etapa: string; sinapiCodigo?: string } | null }

  const addInsumoMutation = useMutation({
    mutationFn: (data: any) => levantamentoAPI.addItem(projectId, levantamentoId, data),
    onSuccess: () => {
      toast.success('Insumo adicionado ao levantamento')
      queryClient.invalidateQueries({ queryKey: ['levantamento-project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['workflow-check', 'levantamento-items'] })
      queryClient.invalidateQueries({ queryKey: ['activity-review-summary', projectId] })
      // Auto-save to template if linked to an activity
      if (pendingTemplateRef.current) {
        const tpl = pendingTemplateRef.current
        levantamentoAPI.ensureTemplate({
          nomeCustom: tpl.nome,
          etapa: tpl.etapa,
          sinapiCodigo: tpl.sinapiCodigo,
        }).catch(() => {}) // silent — template enrichment is best-effort
        pendingTemplateRef.current = null
      }
      setSelectedInsumo(null)
      setInsumoQtd('1')
      setInsumoPreco('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleSelectInsumo = (insumo: any) => {
    setSelectedInsumo(insumo)
    setInsumoQtd('1')
    setInsumoPreco('')
  }

  const handleAddInsumo = () => {
    if (!selectedInsumo) return
    const qtd = parseFloat(insumoQtd)
    const preco = parseFloat(insumoPreco)
    if (isNaN(qtd) || qtd <= 0) {
      toast.error('Informe uma quantidade válida')
      return
    }
    if (isNaN(preco) || preco < 0) {
      toast.error('Informe um preço válido')
      return
    }
    if (fixedActivityId) {
      if (fixedActivityName) {
        pendingTemplateRef.current = {
          nome: selectedInsumo.descricao,
          etapa: fixedActivityName,
          sinapiCodigo: selectedInsumo.codigo,
        }
      }
      addInsumoMutation.mutate({
        nome: selectedInsumo.descricao,
        unidade: selectedInsumo.unidade || 'UN',
        quantidade: qtd,
        precoUnitario: preco,
        sinapiInsumoId: selectedInsumo.id,
        ambienteId: ambienteId || undefined,
        projectActivityId: fixedActivityId,
        etapa: fixedActivityName || undefined,
      })
    } else {
      const parsed = parseActivityValue(selectedActivity)
      // Save info for template enrichment after successful add
      if (parsed.etapa) {
        pendingTemplateRef.current = {
          nome: selectedInsumo.descricao,
          etapa: parsed.etapa,
          sinapiCodigo: selectedInsumo.codigo,
        }
      }
      addInsumoMutation.mutate({
        nome: selectedInsumo.descricao,
        unidade: selectedInsumo.unidade || 'UN',
        quantidade: qtd,
        precoUnitario: preco,
        sinapiInsumoId: selectedInsumo.id,
        ambienteId: ambienteId || undefined,
        projectActivityId: parsed.projectActivityId || undefined,
        etapa: parsed.etapa || undefined,
      })
    }
  }

  const handleSelectComposicao = (composicao: any) => {
    setSelectedComposicaoId(composicao.id)
    setDetailOpen(true)
  }

  const handleImportComposicao = (data: any) => {
    if (fixedActivityId) {
      importComposicaoMutation.mutate({
        ...data,
        ambienteId: ambienteId || undefined,
        projectActivityId: fixedActivityId,
        etapa: data.etapa || fixedActivityName || undefined,
        baseQuantity: baseQuantity && baseQuantity > 0 ? baseQuantity : undefined,
      })
    } else {
      const parsed = parseActivityValue(selectedActivity)
      importComposicaoMutation.mutate({
        ...data,
        ambienteId: ambienteId || undefined,
        projectActivityId: parsed.projectActivityId || undefined,
        etapa: data.etapa || parsed.etapa || undefined,
      })
    }
  }

  return (
    <div className="space-y-4">
      <SinapiHelpText />

      {/* Activity selector — hidden when activity is pre-fixed */}
      {activityOptions.length > 0 && !fixedActivityId && (
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-neutral-400 flex-shrink-0" />
          <span className="text-sm text-neutral-600 flex-shrink-0">Vincular à atividade:</span>
          <Select value={selectedActivity} onValueChange={setSelectedActivity}>
            <SelectTrigger className="h-8 text-sm max-w-xs">
              <SelectValue placeholder="Nenhuma (sem vínculo)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Nenhuma (sem vínculo)</SelectItem>
              {activityOptions.map((opt: any) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => { setSearchMode('composicoes'); setSearchOpen(true) }}
        >
          <Database className="h-4 w-4 mr-2" />
          Buscar Composições
        </Button>
        <Button
          variant="outline"
          onClick={() => { setSearchMode('insumos'); setSearchOpen(true) }}
        >
          <Search className="h-4 w-4 mr-2" />
          Buscar Insumos
        </Button>
        {isRoot && (
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar Base SINAPI
          </Button>
        )}
        {(importComposicaoMutation.isPending || addInsumoMutation.isPending) && (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {importComposicaoMutation.isPending ? 'Importando...' : 'Adicionando...'}
          </Badge>
        )}
      </div>

      {/* Selected insumo — add form */}
      {selectedInsumo && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Package className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600 shrink-0">
                    SINAPI {selectedInsumo.codigo}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {selectedInsumo.unidade}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-neutral-800 mt-1">{selectedInsumo.descricao}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-neutral-400 hover:text-neutral-600 shrink-0"
              onClick={() => setSelectedInsumo(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-600">Quantidade</label>
              <Input
                type="number"
                className="h-8 w-28 text-sm"
                value={insumoQtd}
                onChange={(e) => setInsumoQtd(e.target.value)}
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-600">Preço Unitário (R$)</label>
              <Input
                type="number"
                className="h-8 w-32 text-sm"
                placeholder="0,00"
                value={insumoPreco}
                onChange={(e) => setInsumoPreco(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <Button
              size="sm"
              className="h-8"
              onClick={handleAddInsumo}
              disabled={addInsumoMutation.isPending}
            >
              {addInsumoMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              Adicionar
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedInsumo && (
        <div className="rounded-lg border bg-neutral-50 p-8 text-center">
          <Database className="h-10 w-10 text-neutral-300 mx-auto" />
          <h3 className="mt-3 text-sm font-medium text-neutral-700">
            Calculadora SINAPI
          </h3>
          <p className="mt-1 text-xs text-neutral-500 max-w-md mx-auto">
            Busque composições de serviços da base SINAPI e importe automaticamente os insumos
            com coeficientes e preços de referência para o seu levantamento.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => { setSearchMode('composicoes'); setSearchOpen(true) }}
          >
            <Search className="h-3.5 w-3.5 mr-1" />
            Iniciar Busca
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <SinapiSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        mode={searchMode}
        onSelectInsumo={handleSelectInsumo}
        onSelectComposicao={handleSelectComposicao}
      />

      {detailOpen && selectedComposicaoId && (
        <ComposicaoDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          composicaoId={selectedComposicaoId}
          onImport={handleImportComposicao}
        />
      )}

      {isRoot && (
        <SinapiImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
        />
      )}
    </div>
  )
}
