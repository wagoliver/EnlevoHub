import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { sinapiAPI } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Search } from 'lucide-react'

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

interface Props {
  open: boolean
  mapping: Mapping | null
  onClose: () => void
  onSave: () => void
}

export function SinapiMappingDialog({ open, mapping, onClose, onSave }: Props) {
  const isEdit = !!mapping

  const [fase, setFase] = useState(mapping?.fase || '')
  const [etapa, setEtapa] = useState(mapping?.etapa || '')
  const [atividade, setAtividade] = useState(mapping?.atividade || '')
  const [sinapiCodigo, setSinapiCodigo] = useState(mapping?.sinapiCodigo || '')
  const [unidade, setUnidade] = useState(mapping?.unidade || '')
  const [grupoSinapi, setGrupoSinapi] = useState(mapping?.grupoSinapi || '')

  // SINAPI search dialog
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchGrupo, setSearchGrupo] = useState('')

  const { data: grupos } = useQuery({
    queryKey: ['sinapi-grupos'],
    queryFn: () => sinapiAPI.listGrupos(),
  })

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['sinapi-search', searchTerm, searchGrupo],
    queryFn: () => sinapiAPI.searchComposicoes({
      search: searchTerm || undefined,
      grupo: searchGrupo || undefined,
      page: 1,
      limit: 20,
    }),
    enabled: searchOpen && (!!searchTerm || !!searchGrupo),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => sinapiAPI.createMapping(data),
    onSuccess: () => {
      toast.success('Mapeamento criado')
      onSave()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => sinapiAPI.updateMapping(mapping!.id, data),
    onSuccess: () => {
      toast.success('Mapeamento atualizado')
      onSave()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSubmit = () => {
    if (!fase.trim() || !etapa.trim() || !atividade.trim()) {
      toast.error('Preencha fase, etapa e atividade')
      return
    }

    const data = {
      fase: fase.trim(),
      etapa: etapa.trim(),
      atividade: atividade.trim(),
      sinapiCodigo: sinapiCodigo.trim() || null,
      unidade: unidade.trim() || null,
      grupoSinapi: grupoSinapi.trim() || null,
    }

    if (isEdit) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const handleSelectComposicao = (comp: any) => {
    setSinapiCodigo(comp.codigo)
    setUnidade(comp.unidade)
    if (comp.grupo) setGrupoSinapi(comp.grupo)
    setSearchOpen(false)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <Dialog open={open && !searchOpen} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar Mapeamento' : 'Novo Mapeamento'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Altere os dados do mapeamento'
                : 'Associe uma atividade do projeto a uma composicao SINAPI'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fase *</Label>
                <Input
                  placeholder="Ex: Fundacao"
                  value={fase}
                  onChange={(e) => setFase(e.target.value)}
                />
              </div>
              <div>
                <Label>Etapa *</Label>
                <Input
                  placeholder="Ex: Terraplanagem"
                  value={etapa}
                  onChange={(e) => setEtapa(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Atividade *</Label>
              <Input
                placeholder="Ex: Escavacao mecanizada de solo"
                value={atividade}
                onChange={(e) => setAtividade(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Codigo SINAPI</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: 73948/003"
                    value={sinapiCodigo}
                    onChange={(e) => setSinapiCodigo(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSearchTerm('')
                      setSearchGrupo(grupoSinapi || '')
                      setSearchOpen(true)
                    }}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Unidade</Label>
                <Input
                  placeholder="Ex: m3"
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Grupo SINAPI</Label>
              <Input
                placeholder="Ex: Escavacao de Valas"
                value={grupoSinapi}
                onChange={(e) => setGrupoSinapi(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de busca SINAPI */}
      <Dialog open={searchOpen} onOpenChange={(v) => !v && setSearchOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Buscar Composicao SINAPI</DialogTitle>
            <DialogDescription>
              Pesquise por codigo ou descricao, e filtre por grupo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  placeholder="Buscar por codigo ou descricao..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={searchGrupo} onValueChange={(v) => setSearchGrupo(v === '_all' ? '' : v)}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Filtrar por grupo" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="_all">Todos os grupos</SelectItem>
                  {(grupos || []).map((g: string) => (
                    <SelectItem key={g} value={g}>
                      <span className="truncate block max-w-[200px]">{g}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg max-h-[400px] overflow-auto">
              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                </div>
              ) : !searchResults?.data?.length ? (
                <div className="text-center py-8 text-neutral-500 text-sm">
                  {searchTerm || searchGrupo
                    ? 'Nenhuma composicao encontrada'
                    : 'Digite para buscar ou selecione um grupo'}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Codigo</th>
                      <th className="text-left p-2 font-medium">Descricao</th>
                      <th className="text-left p-2 font-medium w-[60px]">Unid.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.data.map((comp: any) => (
                      <tr
                        key={comp.id}
                        className="border-t hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => handleSelectComposicao(comp)}
                      >
                        <td className="p-2">
                          <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">
                            {comp.codigo}
                          </code>
                        </td>
                        <td className="p-2 text-xs leading-tight">{comp.descricao}</td>
                        <td className="p-2 text-xs text-neutral-500">{comp.unidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSearchOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
