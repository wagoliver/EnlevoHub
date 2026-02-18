import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI, sinapiAPI } from '@/lib/api-client'
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
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Plus, X } from 'lucide-react'

interface ManualActivityFormProps {
  projectId: string
  existingCount: number
  onCreated?: () => void
  onClose?: () => void
}

const LEVEL_LABELS: Record<string, string> = {
  PHASE: 'Fase',
  STAGE: 'Etapa',
  ACTIVITY: 'Atividade',
}

export function ManualActivityForm({
  projectId,
  existingCount,
  onCreated,
  onClose,
}: ManualActivityFormProps) {
  const queryClient = useQueryClient()

  // Form state
  const [level, setLevel] = useState<'PHASE' | 'STAGE' | 'ACTIVITY'>('ACTIVITY')
  const [name, setName] = useState('')
  const [weight, setWeight] = useState(1)
  const [scope, setScope] = useState('ALL_UNITS')
  const [parentId, setParentId] = useState<string>('')
  const [sinapiCodigo, setSinapiCodigo] = useState('')

  // Inline create state
  const [creatingParent, setCreatingParent] = useState(false)
  const [newParentName, setNewParentName] = useState('')
  const [newParentLevel, setNewParentLevel] = useState<'PHASE' | 'STAGE'>('PHASE')
  const [newParentParentId, setNewParentParentId] = useState('')

  // SINAPI search state
  const [sinapiSearch, setSinapiSearch] = useState('')
  const [sinapiResults, setSinapiResults] = useState<any[]>([])
  const [sinapiLoading, setSinapiLoading] = useState(false)
  const [showSinapiResults, setShowSinapiResults] = useState(false)
  const [selectedSinapi, setSelectedSinapi] = useState<any>(null)
  const sinapiTimeout = useRef<ReturnType<typeof setTimeout>>()

  // Load existing activities for parent selection
  const { data: activities } = useQuery({
    queryKey: ['project-activities', projectId],
    queryFn: () => projectsAPI.listActivities(projectId),
  })

  // Build parent options based on selected level
  const parentOptions = useMemo(() => {
    if (!activities || !Array.isArray(activities)) return []
    const opts: { id: string; label: string }[] = []

    function extract(items: any[], prefix = '') {
      for (const item of items) {
        if (level === 'STAGE' && item.level === 'PHASE') {
          opts.push({ id: item.id, label: prefix + item.name })
        }
        if (level === 'ACTIVITY' && (item.level === 'STAGE' || item.level === 'PHASE')) {
          opts.push({ id: item.id, label: prefix + item.name })
        }
        if (item.children?.length) {
          extract(item.children, prefix + item.name + ' > ')
        }
      }
    }
    extract(activities)
    return opts
  }, [activities, level])

  // Reset parentId when level changes
  useEffect(() => {
    setParentId('')
    setCreatingParent(false)
    setNewParentName('')
    setNewParentLevel('PHASE')
    setNewParentParentId('')
  }, [level])

  // SINAPI debounced search
  useEffect(() => {
    if (sinapiTimeout.current) clearTimeout(sinapiTimeout.current)
    if (!sinapiSearch || sinapiSearch.length < 3) {
      setSinapiResults([])
      setShowSinapiResults(false)
      return
    }
    setSinapiLoading(true)
    sinapiTimeout.current = setTimeout(async () => {
      try {
        const result = await sinapiAPI.searchComposicoes({ search: sinapiSearch, limit: 10 })
        setSinapiResults(result?.data || result || [])
        setShowSinapiResults(true)
      } catch {
        setSinapiResults([])
      } finally {
        setSinapiLoading(false)
      }
    }, 400)

    return () => {
      if (sinapiTimeout.current) clearTimeout(sinapiTimeout.current)
    }
  }, [sinapiSearch])

  const createMutation = useMutation({
    mutationFn: (data: any) => projectsAPI.createActivity(projectId, data),
    onSuccess: () => {
      toast.success(`${LEVEL_LABELS[level]} criada com sucesso!`)
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] })
      resetForm()
      onCreated?.()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar')
    },
  })

  // Mutation for inline parent creation
  const createParentMutation = useMutation({
    mutationFn: (data: any) => projectsAPI.createActivity(projectId, data),
    onSuccess: (newParent: any) => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] })
      setParentId(newParent.id)
      setCreatingParent(false)
      setNewParentName('')
      const createdLevel = level === 'STAGE' ? 'PHASE' : newParentLevel
      toast.success(`${LEVEL_LABELS[createdLevel]} criada!`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar')
    },
  })

  const resetForm = () => {
    setName('')
    setWeight(1)
    setScope('ALL_UNITS')
    setParentId('')
    setSinapiCodigo('')
    setSinapiSearch('')
    setSinapiResults([])
    setSelectedSinapi(null)
    setShowSinapiResults(false)
    setCreatingParent(false)
    setNewParentName('')
    setNewParentLevel('PHASE')
    setNewParentParentId('')
  }

  // Phase options for inline STAGE creation
  const phaseOptions = useMemo(() => {
    if (!activities || !Array.isArray(activities)) return []
    const opts: { id: string; label: string }[] = []
    for (const item of activities) {
      if (item.level === 'PHASE') {
        opts.push({ id: item.id, label: item.name })
      }
    }
    return opts
  }, [activities])

  const handleCreateParent = () => {
    if (!newParentName.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    const effectiveLevel = level === 'STAGE' ? 'PHASE' : newParentLevel
    const effectiveParentId = effectiveLevel === 'STAGE' ? newParentParentId || undefined : undefined

    if (effectiveLevel === 'STAGE' && !effectiveParentId) {
      toast.error('Selecione a Fase para esta Etapa')
      return
    }

    createParentMutation.mutate({
      name: newParentName.trim(),
      weight: 1,
      order: existingCount + 1,
      level: effectiveLevel,
      scope: 'ALL_UNITS',
      parentId: effectiveParentId,
    })
  }

  const handleSelectSinapi = (comp: any) => {
    setSinapiCodigo(comp.codigo)
    setSelectedSinapi(comp)
    setShowSinapiResults(false)
    setSinapiSearch('')
    if (!name.trim()) {
      setName(comp.descricao)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    if (level === 'STAGE' && !parentId) {
      toast.error('Selecione ou crie uma Fase para esta Etapa')
      return
    }

    const data: any = {
      name: name.trim(),
      weight,
      order: existingCount + 1,
      level,
      scope: level === 'ACTIVITY' ? scope : 'GENERAL',
      parentId: parentId || undefined,
      sinapiCodigo: sinapiCodigo || undefined,
    }

    createMutation.mutate(data)
  }

  const isPending = createMutation.isPending
  const needsParent = level === 'STAGE' || level === 'ACTIVITY'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Level selector */}
      <div>
        <Label>Tipo *</Label>
        <div className="grid grid-cols-3 gap-2 mt-1.5">
          {(['PHASE', 'STAGE', 'ACTIVITY'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                level === l
                  ? 'border-[#b8a378] bg-[#b8a378]/10 text-[#9a8a6a]'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
              }`}
            >
              {LEVEL_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Parent selector */}
      {needsParent && (
        <div>
          <Label>
            Pertence a {level === 'STAGE' ? '(Fase)' : '(Fase ou Etapa)'} {level === 'STAGE' && '*'}
          </Label>
          {!creatingParent ? (
            <div className="flex gap-2 mt-1.5">
              <Select value={parentId || '_none'} onValueChange={(v) => setParentId(v === '_none' ? '' : v)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {level === 'ACTIVITY' && (
                    <SelectItem value="_none">Nenhum (raiz)</SelectItem>
                  )}
                  {parentOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="flex-shrink-0"
                onClick={() => setCreatingParent(true)}
                title={`Criar nova ${level === 'STAGE' ? 'Fase' : 'Etapa/Fase'}`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2 mt-1.5 p-3 rounded-lg border border-dashed bg-neutral-50">
              {level === 'ACTIVITY' && (
                <div className="grid grid-cols-2 gap-1.5">
                  {(['PHASE', 'STAGE'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => { setNewParentLevel(l); setNewParentParentId('') }}
                      className={`px-2 py-1.5 rounded border text-xs font-medium transition-all ${
                        newParentLevel === l
                          ? 'border-[#b8a378] bg-[#b8a378]/10 text-[#9a8a6a]'
                          : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                      }`}
                    >
                      Criar {LEVEL_LABELS[l]}
                    </button>
                  ))}
                </div>
              )}

              {((level === 'ACTIVITY' && newParentLevel === 'STAGE') ? true : false) && (
                <Select value={newParentParentId || '_none'} onValueChange={(v) => setNewParentParentId(v === '_none' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione a Fase..." />
                  </SelectTrigger>
                  <SelectContent>
                    {phaseOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex gap-2">
                <Input
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  placeholder={`Nome da nova ${level === 'STAGE' ? 'Fase' : LEVEL_LABELS[newParentLevel]}`}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateParent())}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  className="flex-shrink-0 h-8"
                  onClick={handleCreateParent}
                  disabled={createParentMutation.isPending}
                >
                  {createParentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Criar'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 h-8 w-8"
                  onClick={() => { setCreatingParent(false); setNewParentName(''); setNewParentParentId('') }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Name */}
      <div>
        <Label htmlFor="manual-activity-name">Nome *</Label>
        <Input
          id="manual-activity-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={
            level === 'PHASE' ? 'Ex: Infraestrutura, Superestrutura...'
            : level === 'STAGE' ? 'Ex: Fundação, Alvenaria...'
            : 'Ex: Concreto armado, Pintura interna...'
          }
        />
      </div>

      {/* SINAPI search (for ACTIVITY level) */}
      {level === 'ACTIVITY' && (
        <div className="relative">
          <Label>Código SINAPI</Label>
          {selectedSinapi ? (
            <div className="flex items-center gap-2 mt-1.5 p-2.5 rounded-lg border bg-blue-50/50 border-blue-200">
              <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600 flex-shrink-0">
                {selectedSinapi.codigo}
              </Badge>
              <span className="text-xs text-neutral-700 truncate flex-1" title={selectedSinapi.descricao}>
                {selectedSinapi.descricao}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 flex-shrink-0"
                onClick={() => { setSelectedSinapi(null); setSinapiCodigo('') }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <div className="relative mt-1.5">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <Input
                  value={sinapiSearch}
                  onChange={(e) => setSinapiSearch(e.target.value)}
                  placeholder="Pesquisar composição SINAPI..."
                  className="pl-8"
                  onFocus={() => sinapiResults.length > 0 && setShowSinapiResults(true)}
                />
                {sinapiLoading && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-neutral-400" />
                )}
              </div>

              {showSinapiResults && sinapiResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {sinapiResults.map((comp: any) => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => handleSelectSinapi(comp)}
                      className="flex items-start gap-2 w-full px-3 py-2 text-left hover:bg-neutral-50 border-b last:border-b-0"
                    >
                      <Badge variant="outline" className="text-[9px] mt-0.5 border-orange-300 text-orange-600 flex-shrink-0">
                        {comp.codigo}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-xs text-neutral-800 line-clamp-2">{comp.descricao}</p>
                        {comp.unidade && (
                          <span className="text-[10px] text-neutral-400">{comp.unidade}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showSinapiResults && sinapiResults.length === 0 && sinapiSearch.length >= 3 && !sinapiLoading && (
                <p className="text-xs text-neutral-400 mt-1">Nenhuma composição encontrada.</p>
              )}
            </>
          )}
          <p className="mt-1 text-xs text-neutral-400">
            Opcional. Vincule um código SINAPI para rastreabilidade.
          </p>
        </div>
      )}

      {/* Weight + Scope */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="manual-activity-weight">Peso</Label>
          <Input
            id="manual-activity-weight"
            type="number"
            min="1"
            step="1"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
          />
          <p className="mt-1 text-xs text-neutral-500">
            Peso relativo para cálculo de progresso
          </p>
        </div>

        {level === 'ACTIVITY' && (
          <div>
            <Label htmlFor="manual-activity-scope">Escopo</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_UNITS">Todas as Unidades</SelectItem>
                <SelectItem value="SPECIFIC_UNITS">Unidades Específicas</SelectItem>
                <SelectItem value="GENERAL">Geral (sem unidade)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          Fechar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Criar {LEVEL_LABELS[level]}
        </Button>
      </div>
    </form>
  )
}
