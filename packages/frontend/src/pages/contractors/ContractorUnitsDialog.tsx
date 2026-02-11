import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { contractorsAPI, projectsAPI } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface ContractorUnitsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractorId: string
  projectId: string
  projectName: string
}

export function ContractorUnitsDialog({
  open,
  onOpenChange,
  contractorId,
  projectId,
  projectName,
}: ContractorUnitsDialogProps) {
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Fetch all units for this project
  const { data: allUnitsData, isLoading: loadingUnits } = useQuery({
    queryKey: ['project-units-all', projectId],
    queryFn: () => projectsAPI.listUnits(projectId, { limit: 1000 }),
    enabled: open,
  })

  // Fetch blocks for grouping
  const { data: blocksData = [] } = useQuery({
    queryKey: ['project-blocks', projectId],
    queryFn: () => projectsAPI.listBlocks(projectId),
    enabled: open,
  })

  // Fetch currently assigned units
  const { data: assignedUnits, isLoading: loadingAssigned } = useQuery({
    queryKey: ['contractor-units', contractorId, projectId],
    queryFn: () => contractorsAPI.listUnitsByProject(contractorId, projectId),
    enabled: open,
  })

  // Initialize selected IDs from assigned units
  useEffect(() => {
    if (assignedUnits) {
      const ids = new Set(
        (assignedUnits as any[]).map((u: any) => u.unitId || u.id)
      )
      setSelectedIds(ids)
    }
  }, [assignedUnits])

  const allUnits: any[] = allUnitsData?.data || []

  // Group units by block
  const { grouped, hasBlocks } = useMemo(() => {
    if (!allUnits.length) return { grouped: [], hasBlocks: false }

    const blocks = blocksData as any[]
    const blockMap = new Map<string, string>()
    blocks.forEach((b: any) => blockMap.set(b.id, b.name))

    const withBlock = allUnits.filter((u: any) => u.blockId)
    const withoutBlock = allUnits.filter((u: any) => !u.blockId)

    if (withBlock.length === 0) {
      return {
        grouped: [{ blockName: null, blockId: null, units: allUnits }],
        hasBlocks: false,
      }
    }

    const groups: { blockName: string | null; blockId: string | null; units: any[] }[] = []

    // Group by blockId
    const byBlock = new Map<string, any[]>()
    for (const unit of withBlock) {
      const arr = byBlock.get(unit.blockId) || []
      arr.push(unit)
      byBlock.set(unit.blockId, arr)
    }

    for (const [blockId, units] of byBlock) {
      groups.push({
        blockName: blockMap.get(blockId) || blockId,
        blockId,
        units: units.sort((a: any, b: any) => a.code.localeCompare(b.code)),
      })
    }

    groups.sort((a, b) => (a.blockName || '').localeCompare(b.blockName || ''))

    if (withoutBlock.length > 0) {
      groups.push({
        blockName: 'Sem Bloco',
        blockId: null,
        units: withoutBlock.sort((a: any, b: any) => a.code.localeCompare(b.code)),
      })
    }

    return { grouped: groups, hasBlocks: true }
  }, [allUnits, blocksData])

  const toggleUnit = (unitId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(unitId)) {
        next.delete(unitId)
      } else {
        next.add(unitId)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(allUnits.map((u: any) => u.id)))
  }

  const selectNone = () => {
    setSelectedIds(new Set())
  }

  const syncMutation = useMutation({
    mutationFn: (unitIds: string[]) =>
      contractorsAPI.syncUnits(contractorId, projectId, unitIds),
    onSuccess: () => {
      toast.success('Unidades atualizadas com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['contractor-units', contractorId, projectId] })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSave = () => {
    syncMutation.mutate(Array.from(selectedIds))
  }

  const isLoading = loadingUnits || loadingAssigned

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Unidades do Empreiteiro</DialogTitle>
          <DialogDescription>
            Selecione as unidades atribuídas ao empreiteiro no projeto{' '}
            <strong>{projectName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : allUnits.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500">
            Nenhuma unidade encontrada neste projeto.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <span className="text-xs text-neutral-500">
                {selectedIds.size} de {allUnits.length} selecionadas
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
                  Selecionar todas
                </Button>
                <Button variant="ghost" size="sm" onClick={selectNone} className="text-xs h-7">
                  Limpar
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 max-h-[400px] -mx-2 px-2">
              {grouped.map((group, gi) => (
                <div key={group.blockId || `group-${gi}`}>
                  {hasBlocks && (
                    <div className="flex items-center gap-2 px-3 py-2 mt-1">
                      <span className="text-sm font-semibold text-neutral-700">
                        {group.blockName}
                      </span>
                      <span className="text-xs text-neutral-400">
                        ({group.units.filter((u: any) => selectedIds.has(u.id)).length}/{group.units.length})
                      </span>
                    </div>
                  )}
                  {group.units.map((unit: any) => (
                    <label
                      key={unit.id}
                      className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-neutral-50 cursor-pointer"
                      style={hasBlocks ? { paddingLeft: '36px' } : undefined}
                    >
                      <Checkbox
                        checked={selectedIds.has(unit.id)}
                        onChange={() => toggleUnit(unit.id)}
                      />
                      <span className="text-sm">
                        {unit.code}
                        <span className="text-neutral-400 ml-2 text-xs">
                          {unit.type === 'APARTMENT' ? 'Apt' :
                           unit.type === 'HOUSE' ? 'Casa' :
                           unit.type === 'COMMERCIAL' ? 'Com' : 'Ter'}
                          {unit.floor != null ? ` · ${unit.floor}º andar` : ''}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            disabled={syncMutation.isPending || isLoading}
            onClick={handleSave}
          >
            {syncMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
