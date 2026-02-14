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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Loader2 } from 'lucide-react'

interface SinapiSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'insumos' | 'composicoes'
  onSelectInsumo?: (insumo: any) => void
  onSelectComposicao?: (composicao: any) => void
}

const tipoLabels: Record<string, string> = {
  MATERIAL: 'Material',
  MAO_DE_OBRA: 'Mão de Obra',
  EQUIPAMENTO: 'Equipamento',
  SERVICO: 'Serviço',
}

export function SinapiSearchDialog({
  open,
  onOpenChange,
  mode,
  onSelectInsumo,
  onSelectComposicao,
}: SinapiSearchDialogProps) {
  const [search, setSearch] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [tipo, setTipo] = useState<string>('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: [mode === 'insumos' ? 'sinapi-insumos' : 'sinapi-composicoes', searchTerm, tipo, page],
    queryFn: () =>
      mode === 'insumos'
        ? sinapiAPI.searchInsumos({ search: searchTerm, tipo: tipo || undefined, page, limit: 15 })
        : sinapiAPI.searchComposicoes({ search: searchTerm, page, limit: 15 }),
    enabled: open,
  })

  const handleSearch = () => {
    setSearchTerm(search)
    setPage(1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Buscar {mode === 'insumos' ? 'Insumos' : 'Composições'} SINAPI
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder={`Buscar por código ou descrição...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          {mode === 'insumos' && (
            <Select value={tipo} onValueChange={(v) => { setTipo(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="MATERIAL">Material</SelectItem>
                <SelectItem value="MAO_DE_OBRA">Mão de Obra</SelectItem>
                <SelectItem value="EQUIPAMENTO">Equipamento</SelectItem>
                <SelectItem value="SERVICO">Serviço</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 mt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 text-sm">
              {searchTerm ? 'Nenhum resultado encontrado' : 'Digite para buscar'}
            </div>
          ) : (
            data?.data?.map((item: any) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left p-3 rounded-lg border hover:bg-neutral-50 transition-colors"
                onClick={() => {
                  if (mode === 'insumos') onSelectInsumo?.(item)
                  else onSelectComposicao?.(item)
                  onOpenChange(false)
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-neutral-500">
                        {item.codigo}
                      </span>
                      {item.tipo && (
                        <Badge variant="secondary" className="text-[10px]">
                          {tipoLabels[item.tipo] || item.tipo}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm mt-0.5 line-clamp-2">{item.descricao}</p>
                  </div>
                  <span className="text-xs text-neutral-400 flex-shrink-0">{item.unidade}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-neutral-400">
              {data.pagination.total} resultado(s) - Página {page} de {data.pagination.totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
