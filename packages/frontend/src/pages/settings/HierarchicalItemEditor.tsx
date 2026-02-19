import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Loader2,
  Link2,
} from 'lucide-react'
import { sinapiAPI } from '@/lib/api-client'

// === Types ===

export interface TemplateActivity {
  name: string
  order: number
  weight: number
  durationDays?: number | null
  dependencies?: string[]
  sinapiCodigo?: string | null
}

export interface TemplateStage {
  name: string
  order: number
  activities: TemplateActivity[]
}

export interface TemplatePhase {
  name: string
  order: number
  percentageOfTotal: number
  color?: string | null
  stages: TemplateStage[]
}

interface HierarchicalItemEditorProps {
  phases: TemplatePhase[]
  onChange: (phases: TemplatePhase[]) => void
}

const PHASE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
]

// === Helpers ===

function getAllActivityNames(phases: TemplatePhase[]): string[] {
  const names: string[] = []
  for (const phase of phases) {
    for (const stage of phase.stages) {
      for (const act of stage.activities) {
        if (act.name.trim()) names.push(act.name.trim())
      }
    }
  }
  return names
}

// === SINAPI Autocomplete for Activity Name ===

interface ActivityNameInputProps {
  value: string
  sinapiCodigo?: string | null
  onChange: (name: string) => void
  onSelectComposition: (name: string, codigo: string) => void
  onClearComposition: () => void
}

function ActivityNameInput({ value, sinapiCodigo, onChange, onSelectComposition, onClearComposition }: ActivityNameInputProps) {
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const searchSinapi = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([])
      setShowResults(false)
      return
    }
    setLoading(true)
    try {
      const res = await sinapiAPI.searchComposicoes({ search: term, limit: 10 })
      const data = (res as any).data ?? (res as any).composicoes ?? res
      setResults(Array.isArray(data) ? data : [])
      setShowResults(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (text: string) => {
    onChange(text)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => searchSinapi(text), 400)
  }

  const handleSelect = (comp: any) => {
    onSelectComposition(comp.descricao, comp.codigo)
    setShowResults(false)
    setResults([])
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative min-w-0">
      <div className="flex items-center gap-1 min-w-0">
        <Input
          placeholder="Nome da atividade (digite para buscar SINAPI)"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className="h-7 text-sm min-w-0"
          title={value}
        />
        {loading && <Loader2 className="h-3 w-3 animate-spin text-neutral-400 absolute right-2 top-1/2 -translate-y-1/2" />}
        {sinapiCodigo && (
          <Badge
            variant="outline"
            className="text-[9px] border-orange-300 text-orange-600 shrink-0 cursor-pointer gap-0.5 pr-0.5"
            title={`SINAPI: ${sinapiCodigo} (clique para remover)`}
            onClick={onClearComposition}
          >
            <Link2 className="h-2.5 w-2.5" />
            {sinapiCodigo}
            <X className="h-2.5 w-2.5 ml-0.5" />
          </Badge>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-0.5 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((comp: any) => (
            <button
              key={comp.id}
              type="button"
              onClick={() => handleSelect(comp)}
              className="flex items-start gap-2 w-full px-2.5 py-1.5 text-left hover:bg-neutral-50 border-b last:border-b-0"
            >
              <Badge variant="outline" className="text-[9px] mt-0.5 border-orange-300 text-orange-600 shrink-0">
                {comp.codigo}
              </Badge>
              <div className="min-w-0">
                <p className="text-[11px] text-neutral-800 line-clamp-2">{comp.descricao}</p>
                {comp.unidade && (
                  <span className="text-[10px] text-neutral-400">{comp.unidade}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// === Component ===

export function HierarchicalItemEditor({ phases, onChange }: HierarchicalItemEditorProps) {
  const [openPhases, setOpenPhases] = useState<Set<number>>(new Set([0]))

  const totalPercentage = phases.reduce((sum, p) => sum + (p.percentageOfTotal || 0), 0)
  const percentageValid = Math.abs(totalPercentage - 100) < 0.1
  const allActivityNames = getAllActivityNames(phases)

  // === Phase operations ===
  const addPhase = () => {
    const newOrder = phases.length
    const newPhase: TemplatePhase = {
      name: '',
      order: newOrder,
      percentageOfTotal: 0,
      color: PHASE_COLORS[newOrder % PHASE_COLORS.length],
      stages: [{ name: 'Etapa 1', order: 0, activities: [{ name: '', order: 0, weight: 1 }] }],
    }
    const updated = [...phases, newPhase]
    onChange(updated)
    setOpenPhases(prev => new Set([...prev, newOrder]))
  }

  const removePhase = (phaseIdx: number) => {
    const updated = phases.filter((_, i) => i !== phaseIdx).map((p, i) => ({ ...p, order: i }))
    onChange(updated)
  }

  const updatePhase = (phaseIdx: number, field: keyof TemplatePhase, value: any) => {
    const updated = [...phases]
    updated[phaseIdx] = { ...updated[phaseIdx], [field]: value }
    onChange(updated)
  }

  const movePhase = (phaseIdx: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && phaseIdx === 0) || (direction === 'down' && phaseIdx === phases.length - 1)) return
    const updated = [...phases]
    const targetIdx = direction === 'up' ? phaseIdx - 1 : phaseIdx + 1
    const temp = updated[phaseIdx]
    updated[phaseIdx] = updated[targetIdx]
    updated[targetIdx] = temp
    onChange(updated.map((p, i) => ({ ...p, order: i })))
  }

  // === Stage operations ===
  const addStage = (phaseIdx: number) => {
    const updated = [...phases]
    const phase = { ...updated[phaseIdx] }
    phase.stages = [...phase.stages, { name: '', order: phase.stages.length, activities: [{ name: '', order: 0, weight: 1 }] }]
    updated[phaseIdx] = phase
    onChange(updated)
  }

  const removeStage = (phaseIdx: number, stageIdx: number) => {
    const updated = [...phases]
    const phase = { ...updated[phaseIdx] }
    phase.stages = phase.stages.filter((_, i) => i !== stageIdx).map((s, i) => ({ ...s, order: i }))
    updated[phaseIdx] = phase
    onChange(updated)
  }

  const updateStage = (phaseIdx: number, stageIdx: number, field: keyof TemplateStage, value: any) => {
    const updated = [...phases]
    const phase = { ...updated[phaseIdx] }
    const stages = [...phase.stages]
    stages[stageIdx] = { ...stages[stageIdx], [field]: value }
    phase.stages = stages
    updated[phaseIdx] = phase
    onChange(updated)
  }

  const moveStage = (phaseIdx: number, stageIdx: number, direction: 'up' | 'down') => {
    const phase = phases[phaseIdx]
    if ((direction === 'up' && stageIdx === 0) || (direction === 'down' && stageIdx === phase.stages.length - 1)) return
    const updated = [...phases]
    const p = { ...updated[phaseIdx] }
    const stages = [...p.stages]
    const targetIdx = direction === 'up' ? stageIdx - 1 : stageIdx + 1
    const temp = stages[stageIdx]
    stages[stageIdx] = stages[targetIdx]
    stages[targetIdx] = temp
    p.stages = stages.map((s, i) => ({ ...s, order: i }))
    updated[phaseIdx] = p
    onChange(updated)
  }

  // === Activity operations ===
  const addActivity = (phaseIdx: number, stageIdx: number) => {
    const updated = [...phases]
    const phase = { ...updated[phaseIdx] }
    const stages = [...phase.stages]
    const stage = { ...stages[stageIdx] }
    stage.activities = [...stage.activities, { name: '', order: stage.activities.length, weight: 1 }]
    stages[stageIdx] = stage
    phase.stages = stages
    updated[phaseIdx] = phase
    onChange(updated)
  }

  const removeActivity = (phaseIdx: number, stageIdx: number, actIdx: number) => {
    const updated = [...phases]
    const phase = { ...updated[phaseIdx] }
    const stages = [...phase.stages]
    const stage = { ...stages[stageIdx] }
    stage.activities = stage.activities.filter((_, i) => i !== actIdx).map((a, i) => ({ ...a, order: i }))
    stages[stageIdx] = stage
    phase.stages = stages
    updated[phaseIdx] = phase
    onChange(updated)
  }

  const updateActivity = (phaseIdx: number, stageIdx: number, actIdx: number, field: keyof TemplateActivity, value: any) => {
    updateActivityFields(phaseIdx, stageIdx, actIdx, { [field]: value })
  }

  const updateActivityFields = (phaseIdx: number, stageIdx: number, actIdx: number, fields: Partial<TemplateActivity>) => {
    const updated = [...phases]
    const phase = { ...updated[phaseIdx] }
    const stages = [...phase.stages]
    const stage = { ...stages[stageIdx] }
    const activities = [...stage.activities]
    activities[actIdx] = { ...activities[actIdx], ...fields }
    stage.activities = activities
    stages[stageIdx] = stage
    phase.stages = stages
    updated[phaseIdx] = phase
    onChange(updated)
  }

  const moveActivity = (phaseIdx: number, stageIdx: number, actIdx: number, direction: 'up' | 'down') => {
    const stage = phases[phaseIdx].stages[stageIdx]
    if ((direction === 'up' && actIdx === 0) || (direction === 'down' && actIdx === stage.activities.length - 1)) return
    const updated = [...phases]
    const p = { ...updated[phaseIdx] }
    const stages = [...p.stages]
    const s = { ...stages[stageIdx] }
    const acts = [...s.activities]
    const targetIdx = direction === 'up' ? actIdx - 1 : actIdx + 1
    const temp = acts[actIdx]
    acts[actIdx] = acts[targetIdx]
    acts[targetIdx] = temp
    s.activities = acts.map((a, i) => ({ ...a, order: i }))
    stages[stageIdx] = s
    p.stages = stages
    updated[phaseIdx] = p
    onChange(updated)
  }

  const toggleDep = (phaseIdx: number, stageIdx: number, actIdx: number, depName: string) => {
    const act = phases[phaseIdx].stages[stageIdx].activities[actIdx]
    const deps = act.dependencies || []
    const newDeps = deps.includes(depName)
      ? deps.filter(d => d !== depName)
      : [...deps, depName]
    updateActivity(phaseIdx, stageIdx, actIdx, 'dependencies', newDeps.length > 0 ? newDeps : undefined)
  }

  const togglePhase = (idx: number) => {
    setOpenPhases(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Phases */}
      {phases.map((phase, phaseIdx) => (
        <Collapsible
          key={phaseIdx}
          open={openPhases.has(phaseIdx)}
          onOpenChange={() => togglePhase(phaseIdx)}
        >
          <div
            className="rounded-lg border"
            style={{ borderLeftColor: phase.color || '#3B82F6', borderLeftWidth: 4 }}
          >
            {/* Phase Header */}
            <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-t-lg">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                  {openPhases.has(phaseIdx) ? (
                    <ChevronsUpDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <Badge variant="outline" className="shrink-0 text-xs">
                Fase {phaseIdx + 1}
              </Badge>

              <Input
                placeholder="Nome da fase"
                value={phase.name}
                onChange={(e) => updatePhase(phaseIdx, 'name', e.target.value)}
                className="h-8 flex-1"
              />

              <div className="flex items-center gap-1 shrink-0">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={phase.percentageOfTotal}
                  onChange={(e) => updatePhase(phaseIdx, 'percentageOfTotal', parseFloat(e.target.value) || 0)}
                  className="h-8 w-20 text-center"
                />
                <span className="text-xs text-neutral-500">%</span>
              </div>

              <input
                type="color"
                value={phase.color || '#3B82F6'}
                onChange={(e) => updatePhase(phaseIdx, 'color', e.target.value)}
                className="h-7 w-7 cursor-pointer rounded border-0 p-0"
                title="Cor da fase"
              />

              <div className="flex items-center gap-0.5 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={phaseIdx === 0} onClick={() => movePhase(phaseIdx, 'up')}>
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={phaseIdx === phases.length - 1} onClick={() => movePhase(phaseIdx, 'down')}>
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removePhase(phaseIdx)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Phase Content */}
            <CollapsibleContent>
              <div className="p-3 space-y-3">
                {/* Stages */}
                {phase.stages.map((stage, stageIdx) => (
                  <div key={stageIdx} className="rounded-md border bg-white">
                    {/* Stage Header */}
                    <div className="flex items-center gap-2 p-2 bg-neutral-50/50 border-b">
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        Etapa {stageIdx + 1}
                      </Badge>
                      <Input
                        placeholder="Nome da etapa"
                        value={stage.name}
                        onChange={(e) => updateStage(phaseIdx, stageIdx, 'name', e.target.value)}
                        className="h-7 flex-1 text-sm"
                      />
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={stageIdx === 0} onClick={() => moveStage(phaseIdx, stageIdx, 'up')}>
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={stageIdx === phase.stages.length - 1} onClick={() => moveStage(phaseIdx, stageIdx, 'down')}>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" disabled={phase.stages.length <= 1} onClick={() => removeStage(phaseIdx, stageIdx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Activities */}
                    <div className="p-2 space-y-1.5">
                      {/* Activity Header */}
                      <div className="grid grid-cols-[minmax(0,1fr)_70px_70px_120px_60px] gap-2 px-1 text-xs text-neutral-500 font-medium">
                        <span>Atividade</span>
                        <span className="text-center">Peso</span>
                        <span className="text-center">Dias</span>
                        <span>Dependências</span>
                        <span className="text-center">Ações</span>
                      </div>

                      {stage.activities.map((act, actIdx) => (
                        <div key={actIdx} className="grid grid-cols-[minmax(0,1fr)_70px_70px_120px_60px] gap-2 items-center">
                          <ActivityNameInput
                            value={act.name}
                            sinapiCodigo={act.sinapiCodigo}
                            onChange={(name) => updateActivity(phaseIdx, stageIdx, actIdx, 'name', name)}
                            onSelectComposition={(name, codigo) => updateActivityFields(phaseIdx, stageIdx, actIdx, { name, sinapiCodigo: codigo })}
                            onClearComposition={() => updateActivity(phaseIdx, stageIdx, actIdx, 'sinapiCodigo', null)}
                          />
                          <Input
                            type="number"
                            min={0.01}
                            step={0.1}
                            value={act.weight}
                            onChange={(e) => updateActivity(phaseIdx, stageIdx, actIdx, 'weight', parseFloat(e.target.value) || 1)}
                            className="h-7 text-sm text-center"
                          />
                          <Input
                            type="number"
                            min={1}
                            placeholder="-"
                            value={act.durationDays ?? ''}
                            onChange={(e) => {
                              const v = e.target.value ? parseInt(e.target.value) : null
                              updateActivity(phaseIdx, stageIdx, actIdx, 'durationDays', v)
                            }}
                            className="h-7 text-sm text-center"
                          />
                          <div className="flex flex-wrap gap-0.5">
                            {allActivityNames
                              .filter(n => n !== act.name)
                              .slice(0, 5)
                              .map(depName => {
                                const isSelected = act.dependencies?.includes(depName)
                                return (
                                  <Badge
                                    key={depName}
                                    variant={isSelected ? 'default' : 'outline'}
                                    className="text-[10px] cursor-pointer px-1 py-0"
                                    onClick={() => toggleDep(phaseIdx, stageIdx, actIdx, depName)}
                                  >
                                    {depName.length > 8 ? depName.slice(0, 8) + '…' : depName}
                                  </Badge>
                                )
                              })}
                          </div>
                          <div className="flex items-center justify-center gap-0.5">
                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={actIdx === 0} onClick={() => moveActivity(phaseIdx, stageIdx, actIdx, 'up')}>
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={actIdx === stage.activities.length - 1} onClick={() => moveActivity(phaseIdx, stageIdx, actIdx, 'down')}>
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" disabled={stage.activities.length <= 1} onClick={() => removeActivity(phaseIdx, stageIdx, actIdx)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs w-full"
                        onClick={() => addActivity(phaseIdx, stageIdx)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Atividade
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addStage(phaseIdx)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Etapa
                </Button>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}

      {/* Add Phase Button */}
      <Button variant="outline" onClick={addPhase} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Adicionar Fase
      </Button>

      {/* Summary Bar */}
      <Separator />
      <div className="flex items-center justify-between px-2 text-sm">
        <span className="text-neutral-500">
          {phases.length} {phases.length === 1 ? 'fase' : 'fases'}
        </span>
        <span className={percentageValid ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
          Total: {totalPercentage.toFixed(1)}%
          {!percentageValid && ' (deve ser 100%)'}
        </span>
      </div>
    </div>
  )
}
