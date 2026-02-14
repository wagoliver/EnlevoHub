import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { levantamentoAPI } from '@/lib/api-client'
import { useRole } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Database, Upload, Loader2 } from 'lucide-react'
import { SinapiSearchDialog } from './SinapiSearchDialog'
import { ComposicaoDetailDialog } from './ComposicaoDetailDialog'
import { SinapiImportDialog } from './SinapiImportDialog'
import { SinapiHelpText } from './SinapiHelpText'

interface SinapiCalculatorProps {
  projectId: string
  levantamentoId: string
  ambienteId?: string
}

export function SinapiCalculator({ projectId, levantamentoId, ambienteId }: SinapiCalculatorProps) {
  const role = useRole()
  const queryClient = useQueryClient()
  const isRoot = role === 'ROOT'

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchMode, setSearchMode] = useState<'insumos' | 'composicoes'>('composicoes')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedComposicaoId, setSelectedComposicaoId] = useState<string>('')
  const [importOpen, setImportOpen] = useState(false)

  const importComposicaoMutation = useMutation({
    mutationFn: (data: any) => levantamentoAPI.addFromComposicao(projectId, levantamentoId, data),
    onSuccess: (data) => {
      toast.success(`${data.addedCount} itens importados da composição ${data.composicao.codigo}`)
      queryClient.invalidateQueries({ queryKey: ['levantamento', projectId, levantamentoId] })
      queryClient.invalidateQueries({ queryKey: ['levantamento-resumo', projectId, levantamentoId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleSelectInsumo = (insumo: any) => {
    toast.info(`Insumo ${insumo.codigo} selecionado. Use o modo Manual para adicionar com preço personalizado.`)
  }

  const handleSelectComposicao = (composicao: any) => {
    setSelectedComposicaoId(composicao.id)
    setDetailOpen(true)
  }

  const handleImportComposicao = (data: any) => {
    importComposicaoMutation.mutate({ ...data, ambienteId: ambienteId || undefined })
  }

  return (
    <div className="space-y-4">
      <SinapiHelpText />

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
        {importComposicaoMutation.isPending && (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Importando...
          </Badge>
        )}
      </div>

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
