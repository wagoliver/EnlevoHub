import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { activityTemplatesAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  FileText,
  LayoutTemplate,
} from 'lucide-react'

export function ActivityTemplates() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canCreate = usePermission('activities:create')

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['activity-templates', { page, search }],
    queryFn: () =>
      activityTemplatesAPI.list({
        page,
        limit: 10,
        search: search || undefined,
      }),
  })

  const templates = data?.data || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => activityTemplatesAPI.delete(id),
    onSuccess: () => {
      toast.success('Template excluído com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] })
      setDeleteDialogOpen(false)
      setTemplateToDelete(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir template')
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleDeleteClick = (e: React.MouseEvent, template: any) => {
    e.stopPropagation()
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete.id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Templates de Atividades
          </h1>
          <p className="mt-1 text-neutral-600">
            Modelos reutilizáveis de atividades para projetos
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate('/settings/templates/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Template
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Buscar templates..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-16">
          <LayoutTemplate className="h-16 w-16 text-neutral-300" />
          <h3 className="mt-4 text-xl font-medium text-neutral-900">
            {search
              ? 'Nenhum template encontrado'
              : 'Nenhum template cadastrado'}
          </h3>
          <p className="mt-2 text-neutral-500">
            {search
              ? 'Tente ajustar os termos de busca.'
              : 'Comece criando seu primeiro template de atividades.'}
          </p>
          {canCreate && !search && (
            <Button
              className="mt-6"
              onClick={() => navigate('/settings/templates/new')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Template
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Templates Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px] text-center">
                      Itens
                    </TableHead>
                    <TableHead className="w-[140px]">Criado em</TableHead>
                    {canCreate && (
                      <TableHead className="w-[80px]">Ações</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template: any) => (
                    <TableRow
                      key={template.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate(`/settings/templates/${template.id}`)
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="font-medium">{template.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-neutral-500 line-clamp-1">
                          {template.description || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {template.items?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-neutral-500">
                        {template.createdAt
                          ? new Date(template.createdAt).toLocaleDateString(
                              'pt-BR'
                            )
                          : '-'}
                      </TableCell>
                      {canCreate && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => handleDeleteClick(e, template)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                Mostrando {templates.length} de {pagination.total} templates
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-sm text-neutral-600">
                  {page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            Tem certeza que deseja excluir o template{' '}
            <strong>{templateToDelete?.name}</strong>? Esta ação não pode ser
            desfeita.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setTemplateToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={confirmDelete}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
