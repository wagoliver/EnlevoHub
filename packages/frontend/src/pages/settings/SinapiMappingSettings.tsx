import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { sinapiAPI } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Copy,
  Info,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { SinapiMappingDialog } from './SinapiMappingDialog'

interface Mapping {
  id: string
  tenantId: string | null
  fase: string
  etapa: string
  atividade: string
  sinapiCodigo: string | null
  unidade: string | null
  grupoSinapi: string | null
  order: number
}

export function SinapiMappingSettings() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [faseFilter, setFaseFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<Mapping | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: mappingsData, isLoading } = useQuery({
    queryKey: ['sinapi-mappings', faseFilter, search, page],
    queryFn: () => sinapiAPI.listMappings({
      fase: faseFilter || undefined,
      search: search || undefined,
      page,
      limit: 50,
    }),
  })

  const { data: fases } = useQuery({
    queryKey: ['sinapi-mapping-fases'],
    queryFn: () => sinapiAPI.listMappingFases(),
  })

  const copyMutation = useMutation({
    mutationFn: () => sinapiAPI.copySystemMappings(),
    onSuccess: (data: any) => {
      toast.success(`${data.copied} mapeamentos copiados com sucesso`)
      queryClient.invalidateQueries({ queryKey: ['sinapi-mappings'] })
      queryClient.invalidateQueries({ queryKey: ['sinapi-mapping-fases'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sinapiAPI.deleteMapping(id),
    onSuccess: () => {
      toast.success('Mapeamento removido')
      queryClient.invalidateQueries({ queryKey: ['sinapi-mappings'] })
      queryClient.invalidateQueries({ queryKey: ['sinapi-mapping-fases'] })
      setDeleteConfirm(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const mappings: Mapping[] = mappingsData?.data || []
  const isSystem = mappingsData?.isSystem || false
  const pagination = mappingsData?.pagination || { page: 1, totalPages: 1, total: 0 }

  const handleCreate = () => {
    setEditingMapping(null)
    setDialogOpen(true)
  }

  const handleEdit = (mapping: Mapping) => {
    setEditingMapping(mapping)
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingMapping(null)
  }

  const handleDialogSave = () => {
    queryClient.invalidateQueries({ queryKey: ['sinapi-mappings'] })
    queryClient.invalidateQueries({ queryKey: ['sinapi-mapping-fases'] })
    handleDialogClose()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapeamento Etapa &rarr; SINAPI</CardTitle>
        <CardDescription>
          Configure a correspondencia entre fases/etapas do projeto e composicoes SINAPI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Banner de estado */}
        {isSystem && mappings.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">
                Usando mapeamentos padrao do sistema
              </p>
              <p className="text-xs text-blue-600">
                Personalize para adaptar os mapeamentos ao seu projeto
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyMutation.mutate()}
              disabled={copyMutation.isPending}
            >
              {copyMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Personalizar
            </Button>
          </div>
        )}

        {!isSystem && mappings.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
            <Info className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-800">
              Mapeamentos personalizados ({pagination.total} registros)
            </p>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Buscar por fase, etapa, atividade..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-10"
            />
          </div>

          <Select value={faseFilter} onValueChange={(v) => { setFaseFilter(v === '_all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as fases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas as fases</SelectItem>
              {(fases || []).map((f: string) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleCreate} disabled={isSystem}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>

        {/* Tabela */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : mappings.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <p>Nenhum mapeamento encontrado</p>
            <p className="text-xs mt-1">Importe os dados SINAPI e execute o seed de mapeamentos</p>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Fase</TableHead>
                    <TableHead className="w-[160px]">Etapa</TableHead>
                    <TableHead>Atividade</TableHead>
                    <TableHead className="w-[120px]">Cod. SINAPI</TableHead>
                    <TableHead className="w-[70px]">Unid.</TableHead>
                    <TableHead className="w-[180px]">Grupo SINAPI</TableHead>
                    {!isSystem && <TableHead className="w-[80px]">Acoes</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {m.fase}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{m.etapa}</TableCell>
                      <TableCell className="text-sm">{m.atividade}</TableCell>
                      <TableCell>
                        {m.sinapiCodigo ? (
                          <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">
                            {m.sinapiCodigo}
                          </code>
                        ) : (
                          <span className="text-neutral-400 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-neutral-500">{m.unidade || '-'}</TableCell>
                      <TableCell className="text-xs text-neutral-500 truncate max-w-[180px]">
                        {m.grupoSinapi || '-'}
                      </TableCell>
                      {!isSystem && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(m)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700"
                              onClick={() => setDeleteConfirm(m.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginacao */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-500">
                  {pagination.total} registros
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-neutral-600">
                    {page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Dialog de criar/editar */}
      {dialogOpen && (
        <SinapiMappingDialog
          open={dialogOpen}
          mapping={editingMapping}
          onClose={handleDialogClose}
          onSave={handleDialogSave}
        />
      )}

      {/* Dialog de confirmacao de exclusao */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusao</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este mapeamento? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
