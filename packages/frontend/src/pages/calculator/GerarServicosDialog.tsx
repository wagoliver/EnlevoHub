import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { levantamentoAPI, sinapiAPI } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, Wand2, Search, Link2, X, RefreshCw, ChevronDown, ChevronRight, Plus, PenLine, Trash2 } from 'lucide-react'
import { SinapiSearchDialog } from './SinapiSearchDialog'
import { ComposicaoTree } from './ComposicaoTree'
import { calcularAreas, getQuantidadePorArea, AREA_LABELS, templateAplicaAoAmbiente, type AreaTipo } from './servicosCatalogo'

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

const AREA_TIPO_OPTIONS: { value: AreaTipo; label: string }[] = [
  { value: 'PISO', label: 'Piso (m²)' },
  { value: 'PAREDE_LIQ', label: 'Parede líq. (m²)' },
  { value: 'PAREDE_BRUTA', label: 'Parede bruta (m²)' },
  { value: 'TETO', label: 'Teto (m²)' },
  { value: 'PERIMETRO', label: 'Perímetro (m)' },
  { value: 'MANUAL', label: 'Manual' },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface ActivityGroup {
  activity: { id: string; name: string; parentName: string | null; color: string | null }
  templates: any[]
}

interface GerarServicosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ambiente: any
  projectId: string
  levantamentoId: string
  activityGroups?: { activityGroups: ActivityGroup[]; unlinkedTemplates: any[] }
}

interface TemplateData {
  id: string
  nome: string
  sinapiCodigo: string | null
  nomeCustom: string | null
  unidade: string
  areaTipo: AreaTipo
  tags: string[]
  padrao: boolean
  etapa: string
  order: number
  sinapiDescricao: string | null
}

interface ServicoRow {
  template: TemplateData
  checked: boolean
  quantidade: number
  sugerido: boolean
  precoUnitario: number
  precoManual?: boolean       // true = user edited the price, skip recalc
  sinapiComposicaoId?: string
  sinapiCodigo?: string
  sinapiDescricao?: string
  loadingPreco?: boolean
  projectActivityId?: string
}

interface ManualFormState {
  etapa: string
  nome: string
  unidade: string
  areaTipo: AreaTipo
  padrao: boolean
}

export function GerarServicosDialog({
  open,
  onOpenChange,
  ambiente,
  projectId,
  levantamentoId,
  activityGroups: activityGroupsProp,
}: GerarServicosDialogProps) {
  const queryClient = useQueryClient()

  // SINAPI params
  const [uf, setUf] = useState('SP')
  const [mesReferencia, setMesReferencia] = useState('')
  const [desonerado, setDesonerado] = useState(false)

  // SINAPI search (manual override for existing row)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTargetIdx, setSearchTargetIdx] = useState<number | null>(null)

  // SINAPI search for adding new template
  const [addSearchOpen, setAddSearchOpen] = useState(false)
  const [addingEtapa, setAddingEtapa] = useState<string | null>(null)

  // State
  const [rows, setRows] = useState<ServicoRow[]>([])
  const [pricesLoaded, setPricesLoaded] = useState(false)

  // Tree expand state
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [treeData, setTreeData] = useState<any>(null)
  const [treeLoading, setTreeLoading] = useState(false)

  // Inline editing state
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  // Manual creation form
  const [manualForm, setManualForm] = useState<ManualFormState | null>(null)

  const areas = useMemo(() => calcularAreas(ambiente), [ambiente])

  // Fetch templates from DB
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['servico-templates'],
    queryFn: () => levantamentoAPI.listTemplates(),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  })

  // Fetch available SINAPI months
  const { data: mesesDisponiveis } = useQuery({
    queryKey: ['sinapi-meses-referencia'],
    queryFn: () => sinapiAPI.getMesesReferencia(),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  })

  // Auto-select most recent month
  useEffect(() => {
    if (mesesDisponiveis && mesesDisponiveis.length > 0 && !mesReferencia) {
      setMesReferencia(mesesDisponiveis[0])
    }
  }, [mesesDisponiveis, mesReferencia])

  // Build a map of template id -> activity id from activityGroups
  const templateActivityMap = useMemo(() => {
    const map = new Map<string, string>()
    if (activityGroupsProp?.activityGroups) {
      for (const group of activityGroupsProp.activityGroups) {
        for (const t of group.templates) {
          map.set(t.id, group.activity.id)
        }
      }
    }
    return map
  }, [activityGroupsProp])

  const hasActivityGroups = activityGroupsProp?.activityGroups && activityGroupsProp.activityGroups.length > 0

  // Build rows from templates when they load or ambiente changes
  useEffect(() => {
    if (!open || !templates || !Array.isArray(templates)) return

    const activeTemplates = templates.filter((t: any) => t.ativo !== false)
    const ambienteTags: string[] = ambiente.tags || []
    const newRows: ServicoRow[] = activeTemplates.map((t: any) => {
      const sugerido = templateAplicaAoAmbiente(t.tags || [], ambienteTags)
      return {
        template: t,
        checked: sugerido && t.padrao,
        quantidade: Math.round(getQuantidadePorArea(t.areaTipo, areas) * 100) / 100,
        sugerido,
        precoUnitario: 0,
        sinapiCodigo: t.sinapiCodigo || undefined,
        projectActivityId: templateActivityMap.get(t.id),
      }
    })
    setRows(newRows)
    setPricesLoaded(false)
    setExpandedIdx(null)
    setTreeData(null)
    setEditingIdx(null)
    setManualForm(null)
  }, [open, templates, ambiente.id, ambiente.tags, templateActivityMap])

  // Auto-resolve SINAPI prices when rows are built and month is available
  const resolveAllPrices = useCallback(async (currentRows: ServicoRow[], mes: string) => {
    if (!mes) return

    const rowsWithCodigo = currentRows
      .map((r, i) => ({ row: r, idx: i }))
      .filter((x) => x.row.sinapiCodigo && !x.row.precoManual)

    if (rowsWithCodigo.length === 0) {
      setPricesLoaded(true)
      return
    }

    // Mark only non-manual rows as loading
    setRows((prev) => prev.map((r) => (r.sinapiCodigo && !r.precoManual) ? { ...r, loadingPreco: true } : r))

    try {
      const codes = rowsWithCodigo.map((x) => x.row.sinapiCodigo!)
      const resolved = await sinapiAPI.batchResolve({
        codes,
        uf,
        mesReferencia: mes,
        desonerado,
      })

      setRows((prev) => prev.map((r) => {
        if (!r.sinapiCodigo || r.precoManual) return r
        const match = resolved[r.sinapiCodigo]
        if (!match) return { ...r, loadingPreco: false }
        return {
          ...r,
          sinapiComposicaoId: match.id,
          sinapiDescricao: match.descricao,
          precoUnitario: match.custoUnitarioTotal,
          loadingPreco: false,
        }
      }))
    } catch {
      setRows((prev) => prev.map((r) => ({ ...r, loadingPreco: false })))
    }

    setPricesLoaded(true)
  }, [uf, desonerado])

  // Trigger auto-resolve when rows are built and month is ready
  useEffect(() => {
    if (rows.length > 0 && mesReferencia && !pricesLoaded) {
      resolveAllPrices(rows, mesReferencia)
    }
  }, [rows.length, mesReferencia, pricesLoaded])

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingIdx !== null && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingIdx])

  const batchMutation = useMutation({
    mutationFn: (itens: any[]) =>
      levantamentoAPI.batchCreateItems(projectId, levantamentoId, itens),
    onSuccess: (data) => {
      toast.success(`${data.addedCount} servicos gerados para "${ambiente.nome}"`)
      // Invalidate all levantamento queries for this project (parent uses 'levantamento-fp')
      queryClient.invalidateQueries({ queryKey: ['levantamento-fp', projectId] })
      queryClient.invalidateQueries({ queryKey: ['workflow-check', 'levantamento-items'] })
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const selectedCount = rows.filter((r) => r.checked).length
  const loadingCount = rows.filter((r) => r.loadingPreco).length

  const handleToggle = (idx: number) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, checked: !r.checked } : r))
  }

  const handleQuantidadeChange = (idx: number, value: string) => {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) return
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, quantidade: num } : r))
  }

  const handlePrecoChange = (idx: number, value: string) => {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) return
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, precoUnitario: num, precoManual: true } : r))
  }

  const handleSelectAll = () => {
    const allChecked = rows.every((r) => r.checked)
    setRows((prev) => prev.map((r) => ({ ...r, checked: !allChecked })))
  }

  // ---- Inline name editing ----

  const handleStartEditing = (idx: number) => {
    const row = rows[idx]
    setEditingIdx(idx)
    setEditingName(row.template.nomeCustom || row.template.nome || '')
  }

  const handleSaveEditing = async () => {
    if (editingIdx === null) return
    const row = rows[editingIdx]
    const newName = editingName.trim()

    if (!newName) {
      setEditingIdx(null)
      return
    }

    // Update locally immediately
    setRows((prev) => prev.map((r, i) => i === editingIdx ? {
      ...r,
      template: { ...r.template, nome: newName, nomeCustom: newName },
    } : r))
    setEditingIdx(null)

    // Persist to backend
    try {
      await levantamentoAPI.updateTemplate(row.template.id, { nomeCustom: newName })
      queryClient.invalidateQueries({ queryKey: ['servico-templates'] })
    } catch {
      toast.error('Erro ao salvar nome')
    }
  }

  const handleCancelEditing = () => {
    setEditingIdx(null)
    setEditingName('')
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveEditing()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEditing()
    }
  }

  // ---- SINAPI search for existing row (override) ----

  const handleOpenSinapiSearch = (idx: number) => {
    setSearchTargetIdx(idx)
    setSearchOpen(true)
  }

  const handleSelectComposicao = async (composicao: any) => {
    if (searchTargetIdx === null) return
    const idx = searchTargetIdx

    setRows((prev) => prev.map((r, i) => i === idx ? {
      ...r,
      sinapiComposicaoId: composicao.id,
      sinapiCodigo: composicao.codigo,
      sinapiDescricao: composicao.descricao,
      loadingPreco: true,
    } : r))

    if (mesReferencia) {
      try {
        const calculo = await sinapiAPI.calculateComposicao(composicao.id, {
          uf,
          mesReferencia,
          quantidade: 1,
          desonerado,
        })
        setRows((prev) => prev.map((r, i) => i === idx ? {
          ...r,
          precoUnitario: Math.round(calculo.custoUnitarioTotal * 100) / 100,
          loadingPreco: false,
        } : r))
        if (calculo.itensSemPreco > 0) {
          toast.warning(`${calculo.itensSemPreco} insumo(s) sem preco para ${uf}/${mesReferencia}`)
        }
      } catch {
        setRows((prev) => prev.map((r, i) => i === idx ? { ...r, loadingPreco: false } : r))
        toast.error('Erro ao calcular preco SINAPI')
      }
    } else {
      setRows((prev) => prev.map((r, i) => i === idx ? { ...r, loadingPreco: false } : r))
    }
  }

  // ---- Add new template from SINAPI search ----

  const handleOpenAddSinapi = (etapa: string) => {
    setAddingEtapa(etapa)
    setAddSearchOpen(true)
  }

  const handleAddFromSinapi = async (composicao: any) => {
    if (!addingEtapa) return

    try {
      // Create template in DB
      const template = await levantamentoAPI.createTemplate({
        sinapiCodigo: composicao.codigo,
        nomeCustom: null,
        areaTipo: 'MANUAL',
        tags: [],
        padrao: false,
        etapa: addingEtapa,
        order: 99,
      })

      // Add to local rows
      const newRow: ServicoRow = {
        template: {
          ...template,
          nome: composicao.descricao,
          sinapiDescricao: composicao.descricao,
          unidade: composicao.unidade || 'UN',
        },
        checked: true,
        quantidade: 0,
        sugerido: false,
        precoUnitario: 0,
        sinapiCodigo: composicao.codigo,
        sinapiComposicaoId: composicao.id,
        sinapiDescricao: composicao.descricao,
        loadingPreco: true,
      }

      setRows((prev) => [...prev, newRow])
      const newIdx = rows.length

      // Resolve price
      if (mesReferencia) {
        try {
          const calculo = await sinapiAPI.calculateComposicao(composicao.id, {
            uf,
            mesReferencia,
            quantidade: 1,
            desonerado,
          })
          setRows((prev) => prev.map((r, i) => i === newIdx ? {
            ...r,
            precoUnitario: Math.round(calculo.custoUnitarioTotal * 100) / 100,
            loadingPreco: false,
          } : r))
        } catch {
          setRows((prev) => prev.map((r, i) => i === newIdx ? { ...r, loadingPreco: false } : r))
        }
      }

      queryClient.invalidateQueries({ queryKey: ['servico-templates'] })
      toast.success(`Servico "${composicao.descricao.substring(0, 40)}..." adicionado`)
    } catch (err: any) {
      toast.error('Erro ao criar template: ' + (err.message || ''))
    }
  }

  // ---- Manual creation ----

  const handleOpenManualForm = (etapa: string) => {
    setManualForm({ etapa, nome: '', unidade: 'UN', areaTipo: 'MANUAL', padrao: true })
  }

  const handleSaveManual = async () => {
    if (!manualForm || !manualForm.nome.trim()) {
      toast.error('Informe o nome do servico')
      return
    }
    if (!manualForm.etapa.trim()) {
      toast.error('Informe a etapa')
      return
    }

    try {
      const template = await levantamentoAPI.createTemplate({
        nomeCustom: manualForm.nome.trim(),
        areaTipo: manualForm.areaTipo,
        tags: [],
        padrao: manualForm.padrao,
        etapa: manualForm.etapa.trim(),
        order: 99,
      })

      const qty = getQuantidadePorArea(manualForm.areaTipo as AreaTipo, areas)

      const newRow: ServicoRow = {
        template: {
          ...template,
          nome: manualForm.nome.trim(),
          sinapiDescricao: null,
          unidade: manualForm.unidade,
        },
        checked: true,
        quantidade: Math.round(qty * 100) / 100,
        sugerido: false,
        precoUnitario: 0,
      }

      setRows((prev) => [...prev, newRow])
      setManualForm(null)
      queryClient.invalidateQueries({ queryKey: ['servico-templates'] })
      toast.success(`Servico "${manualForm.nome.trim()}" criado`)
    } catch (err: any) {
      toast.error('Erro ao criar template: ' + (err.message || ''))
    }
  }

  // Unlink SINAPI from a row
  const handleUnlinkSinapi = (idx: number) => {
    setRows((prev) => prev.map((r, i) => i === idx ? {
      ...r,
      sinapiComposicaoId: undefined,
      sinapiCodigo: rows[idx].template.sinapiCodigo || undefined,
      sinapiDescricao: undefined,
      precoUnitario: 0,
    } : r))
    if (expandedIdx === idx) {
      setExpandedIdx(null)
      setTreeData(null)
    }
  }

  // Remove a row from the dialog (and delete template if user-created)
  const handleRemoveRow = async (idx: number) => {
    const row = rows[idx]

    // Close expanded tree if it's this row
    if (expandedIdx === idx) {
      setExpandedIdx(null)
      setTreeData(null)
    } else if (expandedIdx !== null && expandedIdx > idx) {
      setExpandedIdx(expandedIdx - 1)
    }

    // Remove from local state
    setRows((prev) => prev.filter((_, i) => i !== idx))

    // If it's a user-created template (not default), delete from DB
    if (!row.template.padrao && row.template.order >= 99) {
      try {
        await levantamentoAPI.deleteTemplate(row.template.id)
        queryClient.invalidateQueries({ queryKey: ['servico-templates'] })
      } catch {
        // Ignore — template stays in DB but row is removed from dialog
      }
    }
  }

  // Recalculate all linked prices
  const handleRecalculateAll = async () => {
    if (!mesReferencia) {
      toast.warning('Selecione o mes de referencia')
      return
    }
    setPricesLoaded(false)
    setExpandedIdx(null)
    setTreeData(null)
    setRows((prev) => prev.map((r) => r.precoManual ? r : ({
      ...r,
      sinapiComposicaoId: undefined,
      sinapiDescricao: undefined,
      precoUnitario: 0,
      loadingPreco: false,
    })))
  }

  // Toggle tree expand for a row
  const handleToggleTree = async (idx: number) => {
    if (expandedIdx === idx) {
      setExpandedIdx(null)
      setTreeData(null)
      return
    }

    const row = rows[idx]
    if (!row.sinapiComposicaoId || !mesReferencia) return

    setExpandedIdx(idx)
    setTreeData(null)
    setTreeLoading(true)

    try {
      const tree = await sinapiAPI.getComposicaoTree(row.sinapiComposicaoId, {
        uf,
        mesReferencia,
        desonerado,
      })
      setTreeData(tree)
    } catch {
      toast.error('Erro ao carregar arvore de composicao')
      setExpandedIdx(null)
    } finally {
      setTreeLoading(false)
    }
  }

  const handleSubmit = () => {
    const selected = rows.filter((r) => r.checked && r.quantidade > 0)
    if (selected.length === 0) {
      toast.error('Selecione pelo menos um servico')
      return
    }

    const itens = selected.map((r) => ({
      nome: r.template.nomeCustom || r.sinapiDescricao || r.template.nome || '(sem nome)',
      unidade: r.template.unidade || 'UN',
      quantidade: Math.round(r.quantidade * 100) / 100,
      precoUnitario: Math.round(r.precoUnitario * 100) / 100,
      etapa: r.template.etapa,
      ambienteId: ambiente.id,
      sinapiComposicaoId: r.sinapiComposicaoId || undefined,
      projectActivityId: r.projectActivityId || undefined,
    }))

    batchMutation.mutate(itens)
  }

  // Totals
  const totalCost = rows
    .filter((r) => r.checked)
    .reduce((sum, r) => sum + r.quantidade * r.precoUnitario, 0)

  // Group by activity (if available) or by etapa (fallback)
  const groupedRows = useMemo(() => {
    if (hasActivityGroups && activityGroupsProp) {
      // Group by activity
      const groups: { key: string; label: string; color: string | null; activityId: string | null; indices: number[] }[] = []
      const activityMap = new Map<string, number>() // activityId -> group index
      const unlinkedIndices: number[] = []

      // Create groups for each activity (preserving order from activityGroups)
      for (const ag of activityGroupsProp.activityGroups) {
        const label = ag.activity.parentName
          ? `${ag.activity.parentName} > ${ag.activity.name}`
          : ag.activity.name
        activityMap.set(ag.activity.id, groups.length)
        groups.push({ key: ag.activity.id, label, color: ag.activity.color, activityId: ag.activity.id, indices: [] })
      }

      // Distribute rows into groups
      rows.forEach((r, i) => {
        if (r.projectActivityId && activityMap.has(r.projectActivityId)) {
          groups[activityMap.get(r.projectActivityId)!].indices.push(i)
        } else {
          unlinkedIndices.push(i)
        }
      })

      // Add "Nao Vinculados" group if there are unlinked templates
      if (unlinkedIndices.length > 0) {
        groups.push({ key: '__unlinked__', label: 'Nao Vinculados', color: null, activityId: null, indices: unlinkedIndices })
      }

      return groups.filter((g) => g.indices.length > 0)
    }

    // Fallback: group by etapa string
    const map = new Map<string, number[]>()
    rows.forEach((r, i) => {
      const key = r.template.etapa
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(i)
    })
    return Array.from(map.entries()).map(([etapa, indices]) => ({
      key: etapa,
      label: etapa,
      color: null,
      activityId: null,
      indices,
    }))
  }, [rows, hasActivityGroups, activityGroupsProp])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Gerar Servicos — {ambiente.nome}
            </DialogTitle>
            <DialogDescription>
              Servicos pre-configurados com composicoes SINAPI. Clique 2x no nome para editar.
              Quantidades baseadas nas dimensoes ({Number(ambiente.comprimento).toFixed(2)} x {Number(ambiente.largura).toFixed(2)} m).
            </DialogDescription>
          </DialogHeader>

          {/* SINAPI params bar */}
          <div className="flex flex-wrap items-end gap-3 pb-3 border-b">
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">UF</Label>
              <Select value={uf} onValueChange={setUf}>
                <SelectTrigger className="h-8 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UFS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">Mes Ref.</Label>
              <Select value={mesReferencia} onValueChange={setMesReferencia}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {(mesesDisponiveis || []).map((mes: string) => {
                    const [ano, m] = mes.split('-')
                    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
                    const label = `${meses[parseInt(m, 10) - 1]}/${ano}`
                    return <SelectItem key={mes} value={mes}>{label}</SelectItem>
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">Regime</Label>
              <Select value={desonerado ? 'true' : 'false'} onValueChange={(v) => setDesonerado(v === 'true')}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Nao Desonerado</SelectItem>
                  <SelectItem value="true">Desonerado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleRecalculateAll}
              disabled={loadingCount > 0}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingCount > 0 ? 'animate-spin' : ''}`} />
              Recalcular
            </Button>
          </div>

          {/* Areas summary */}
          <div className="flex flex-wrap gap-2 pb-2 border-b">
            <Badge variant="outline" className="text-xs">
              Piso: {areas.areaPiso.toFixed(2)} m2
            </Badge>
            <Badge variant="outline" className="text-xs">
              Parede liq.: {areas.areaParedeLiquida.toFixed(2)} m2
            </Badge>
            <Badge variant="outline" className="text-xs">
              Teto: {areas.areaTeto.toFixed(2)} m2
            </Badge>
            <Badge variant="outline" className="text-xs">
              Perimetro: {areas.perimetro.toFixed(2)} m
            </Badge>
          </div>

          {/* Service list */}
          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-2">
              {groupedRows.map((group) => (
                <div key={group.key}>
                  <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={group.color ? { color: group.color } : { color: 'rgb(115, 115, 115)' }}>
                    {group.label}
                  </h4>
                  <div className="space-y-1">
                    {group.indices.map((idx) => {
                      const row = rows[idx]
                      const isExpanded = expandedIdx === idx
                      const canExpand = !!row.sinapiComposicaoId && !!mesReferencia
                      const isEditing = editingIdx === idx

                      return (
                        <div
                          key={row.template.id}
                          className={`rounded-md border transition-colors ${
                            row.checked ? 'bg-primary/5 border-primary/20' : 'bg-neutral-50 border-transparent'
                          }`}
                        >
                          {/* Main row */}
                          <div className="flex items-center gap-2 px-3 py-2">
                            <Checkbox
                              checked={row.checked}
                              onChange={() => handleToggle(idx)}
                            />
                            {/* Tree expand button */}
                            {canExpand ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 shrink-0"
                                onClick={() => handleToggleTree(idx)}
                                title="Ver composicao detalhada"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-orange-500" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
                                )}
                              </Button>
                            ) : (
                              <div className="w-6 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <Input
                                  ref={editInputRef}
                                  className="h-7 text-sm"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={handleEditKeyDown}
                                  onBlur={handleSaveEditing}
                                />
                              ) : (
                                <div
                                  className="flex items-center gap-1.5 cursor-pointer group"
                                  onDoubleClick={() => handleStartEditing(idx)}
                                  title="Clique 2x para editar o nome"
                                >
                                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                                    {row.template.nome}
                                  </span>
                                  <PenLine className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  {!row.sugerido && (
                                    <Badge variant="outline" className="text-[9px] text-neutral-400 border-neutral-200">
                                      opcional
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {AREA_LABELS[row.template.areaTipo]}
                            </Badge>
                            <div className="flex items-center gap-1 shrink-0">
                              <Input
                                className="h-7 w-16 text-xs text-right"
                                type="number"
                                step="0.01"
                                value={row.quantidade}
                                onChange={(e) => handleQuantidadeChange(idx, e.target.value)}
                                disabled={!row.checked}
                              />
                              <span className="text-xs text-neutral-400 w-6">{row.template.unidade}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {row.loadingPreco ? (
                                <div className="w-20 flex justify-center">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
                                </div>
                              ) : (
                                <Input
                                  className={`h-7 w-20 text-xs text-right ${row.precoManual ? 'border-amber-400 bg-amber-50' : ''}`}
                                  type="number"
                                  step="0.01"
                                  placeholder="R$ 0,00"
                                  value={row.precoUnitario || ''}
                                  onChange={(e) => handlePrecoChange(idx, e.target.value)}
                                  disabled={!row.checked}
                                  title={row.precoManual ? 'Preco editado manualmente' : ''}
                                />
                              )}
                              {row.precoManual && row.sinapiCodigo && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-amber-500 hover:text-blue-600 shrink-0"
                                  onClick={() => {
                                    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, precoManual: false, precoUnitario: 0 } : r))
                                    setPricesLoaded(false)
                                  }}
                                  title="Restaurar preco SINAPI"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            {row.checked && !row.sinapiComposicaoId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 shrink-0"
                                onClick={() => handleOpenSinapiSearch(idx)}
                                title="Buscar composicao SINAPI"
                              >
                                <Search className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {row.sinapiComposicaoId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-400 hover:text-red-600 shrink-0"
                                onClick={() => handleUnlinkSinapi(idx)}
                                title="Desvincular SINAPI"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-neutral-300 hover:text-red-500 shrink-0"
                              onClick={() => handleRemoveRow(idx)}
                              title="Remover servico"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          {/* SINAPI linked info */}
                          {row.sinapiComposicaoId && (
                            <div className="mt-0.5 mb-1 ml-14 mr-3 flex items-center gap-2">
                              <Link2 className="h-3 w-3 text-blue-500" />
                              <Badge variant="secondary" className="text-[10px] font-mono">
                                {row.sinapiCodigo}
                              </Badge>
                              <span className="text-[11px] text-neutral-500 truncate max-w-[300px]">
                                {row.sinapiDescricao}
                              </span>
                              <span className="text-[11px] font-medium text-green-700 ml-auto shrink-0">
                                {formatCurrency(row.precoUnitario)}/{row.template.unidade}
                              </span>
                            </div>
                          )}
                          {/* SINAPI code not found warning */}
                          {row.sinapiCodigo && !row.sinapiComposicaoId && !row.loadingPreco && pricesLoaded && (
                            <div className="mt-1 mb-1 ml-14 mr-3 flex items-center gap-1.5">
                              <span className="text-[10px] text-amber-500">
                                Codigo {row.sinapiCodigo} nao encontrado na base SINAPI
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1.5 text-[10px] text-blue-500"
                                onClick={() => handleOpenSinapiSearch(idx)}
                              >
                                Buscar
                              </Button>
                            </div>
                          )}
                          {/* Composition tree (expanded) */}
                          {isExpanded && (
                            <div className="mx-3 mb-2 mt-1">
                              {treeLoading ? (
                                <div className="flex items-center gap-2 py-4 justify-center text-xs text-neutral-500">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Carregando arvore de composicao...
                                </div>
                              ) : treeData ? (
                                <ComposicaoTree data={treeData} />
                              ) : null}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Manual form (inline creation) */}
                    {manualForm && manualForm.etapa === group.label && (
                      <div className="rounded-md border border-dashed border-blue-300 bg-blue-50/50 px-3 py-2 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Input
                            className="h-7 text-sm flex-1 min-w-[160px]"
                            placeholder="Nome do servico..."
                            value={manualForm.nome}
                            onChange={(e) => setManualForm({ ...manualForm, nome: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveManual()
                              if (e.key === 'Escape') setManualForm(null)
                            }}
                            autoFocus
                          />
                          <Input
                            className="h-7 text-xs w-28"
                            placeholder="Etapa"
                            value={manualForm.etapa}
                            onChange={(e) => setManualForm({ ...manualForm, etapa: e.target.value })}
                          />
                          <Select
                            value={manualForm.areaTipo}
                            onValueChange={(v) => setManualForm({ ...manualForm, areaTipo: v as AreaTipo })}
                          >
                            <SelectTrigger className="h-7 w-36 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AREA_TIPO_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <label className="flex items-center gap-1 text-xs text-neutral-500 cursor-pointer">
                            <Checkbox
                              checked={manualForm.padrao}
                              onChange={() => setManualForm({ ...manualForm, padrao: !manualForm.padrao })}
                            />
                            Padrao
                          </label>
                          <Button size="sm" className="h-7 text-xs" onClick={handleSaveManual}>
                            Criar
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setManualForm(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Add service buttons */}
                    {!(manualForm && manualForm.etapa === group.label) && (
                      <div className="flex gap-2 mt-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-blue-600 hover:text-blue-800"
                          onClick={() => handleOpenAddSinapi(group.label)}
                        >
                          <Search className="h-3 w-3 mr-1" />
                          Buscar no SINAPI
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-neutral-500 hover:text-neutral-700"
                          onClick={() => handleOpenManualForm(group.label)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Criar manual
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* General add (new etapa) */}
              {manualForm && !groupedRows.some((g) => g.label === manualForm.etapa) && (
                <div className="border-t pt-3">
                  <div className="rounded-md border border-dashed border-blue-300 bg-blue-50/50 px-3 py-2 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        className="h-7 text-sm flex-1 min-w-[160px]"
                        placeholder="Nome do servico..."
                        value={manualForm.nome}
                        onChange={(e) => setManualForm({ ...manualForm, nome: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveManual()
                          if (e.key === 'Escape') setManualForm(null)
                        }}
                        autoFocus
                      />
                      <Input
                        className="h-7 text-xs w-28"
                        placeholder="Etapa"
                        value={manualForm.etapa}
                        onChange={(e) => setManualForm({ ...manualForm, etapa: e.target.value })}
                      />
                      <Select
                        value={manualForm.areaTipo}
                        onValueChange={(v) => setManualForm({ ...manualForm, areaTipo: v as AreaTipo })}
                      >
                        <SelectTrigger className="h-7 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AREA_TIPO_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-1 text-xs text-neutral-500 cursor-pointer">
                        <Checkbox
                          checked={manualForm.padrao}
                          onChange={() => setManualForm({ ...manualForm, padrao: !manualForm.padrao })}
                        />
                        Padrao
                      </label>
                      <Button size="sm" className="h-7 text-xs" onClick={handleSaveManual}>
                        Criar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setManualForm(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {!manualForm && (
                <div className="border-t pt-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleOpenAddSinapi('Outros')}
                    >
                      <Search className="h-3.5 w-3.5 mr-1.5" />
                      Adicionar do SINAPI
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleOpenManualForm('')}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Criar servico manual
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              {rows.every((r) => r.checked) ? 'Desmarcar todos' : 'Selecionar todos'}
            </Button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-sm text-neutral-500">{selectedCount} selecionados</span>
                {totalCost > 0 && (
                  <span className="text-sm font-medium text-green-700 ml-2">
                    {formatCurrency(totalCost)}
                  </span>
                )}
              </div>
              <Button onClick={handleSubmit} disabled={selectedCount === 0 || batchMutation.isPending || loadingCount > 0}>
                {batchMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Gerar {selectedCount} Ite{selectedCount === 1 ? 'm' : 'ns'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SINAPI Search Dialog (for override existing row) */}
      <SinapiSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        mode="composicoes"
        onSelectComposicao={handleSelectComposicao}
      />

      {/* SINAPI Search Dialog (for adding new template) */}
      <SinapiSearchDialog
        open={addSearchOpen}
        onOpenChange={setAddSearchOpen}
        mode="composicoes"
        onSelectComposicao={handleAddFromSinapi}
      />
    </>
  )
}
