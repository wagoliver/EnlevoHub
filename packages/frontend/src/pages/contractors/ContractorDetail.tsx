import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { contractorsAPI } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { ContractorFormDialog } from './ContractorFormDialog'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Star,
  Users,
  Phone,
  Mail,
  MapPin,
  FileText,
  HardHat,
  Plus,
  Unlink,
  Loader2,
  FolderOpen,
} from 'lucide-react'

function renderStars(rating: number) {
  const stars = []
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        className={`h-4 w-4 ${
          i <= rating
            ? 'fill-amber-400 text-amber-400'
            : 'text-neutral-300'
        }`}
      />
    )
  }
  return stars
}

export function ContractorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const canDelete = user?.role === 'ADMIN'

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [assignProjectId, setAssignProjectId] = useState('')
  const [assignRole, setAssignRole] = useState('')
  const [assignStartDate, setAssignStartDate] = useState('')
  const [assignEndDate, setAssignEndDate] = useState('')

  const { data: contractor, isLoading } = useQuery({
    queryKey: ['contractor', id],
    queryFn: () => contractorsAPI.getById(id!),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () => contractorsAPI.delete(id!),
    onSuccess: () => {
      toast.success('Empreiteiro excluído!')
      queryClient.invalidateQueries({ queryKey: ['contractors'] })
      navigate('/contractors')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const assignMutation = useMutation({
    mutationFn: (data: {
      projectId: string
      role?: string
      startDate?: string
      endDate?: string
    }) =>
      contractorsAPI.assignToProject(id!, data.projectId, {
        role: data.role || undefined,
        startDate: data.startDate
          ? new Date(data.startDate).toISOString()
          : undefined,
        endDate: data.endDate
          ? new Date(data.endDate).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      toast.success('Empreiteiro vinculado ao projeto!')
      queryClient.invalidateQueries({ queryKey: ['contractor', id] })
      setShowAssignDialog(false)
      setAssignProjectId('')
      setAssignRole('')
      setAssignStartDate('')
      setAssignEndDate('')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const unassignMutation = useMutation({
    mutationFn: (projectId: string) =>
      contractorsAPI.unassignFromProject(id!, projectId),
    onSuccess: () => {
      toast.success('Empreiteiro desvinculado do projeto!')
      queryClient.invalidateQueries({ queryKey: ['contractor', id] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!contractor) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h2 className="text-xl font-bold">Empreiteiro não encontrado</h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/contractors')}
        >
          Voltar para Empreiteiros
        </Button>
      </div>
    )
  }

  const projects = contractor.projects || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/contractors')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-900">
                {contractor.name}
              </h1>
              <Badge variant={contractor.isActive ? 'default' : 'secondary'}>
                {contractor.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="mt-1 text-neutral-600">{contractor.document}</p>
          </div>
        </div>

        {(canEdit || canDelete) && (
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (
                    confirm(
                      'Tem certeza que deseja excluir este empreiteiro?'
                    )
                  ) {
                    deleteMutation.mutate()
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Contractor Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Informações do Empreiteiro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <HardHat className="mt-0.5 h-4 w-4 text-neutral-500" />
              <div>
                <p className="text-sm font-medium">Especialidades</p>
                {contractor.specialties &&
                contractor.specialties.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {contractor.specialties.map(
                      (spec: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {spec}
                        </Badge>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">
                    Nenhuma especialidade cadastrada
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <Star className="mt-0.5 h-4 w-4 text-neutral-500" />
              <div>
                <p className="text-sm font-medium">Avaliação</p>
                <div className="mt-1 flex items-center gap-1">
                  {renderStars(contractor.rating || 0)}
                  <span className="ml-1 text-sm text-neutral-500">
                    ({contractor.rating || 0}/5)
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-4 w-4 text-neutral-500" />
              <div>
                <p className="text-sm font-medium">Tamanho da Equipe</p>
                <p className="text-sm text-neutral-600">
                  {contractor.teamSize != null
                    ? `${contractor.teamSize} pessoa(s)`
                    : 'Não informado'}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 text-neutral-500" />
              <div>
                <p className="text-sm font-medium">Documento</p>
                <p className="text-sm text-neutral-600">
                  {contractor.document}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 text-neutral-500" />
              <div>
                <p className="text-sm font-medium">Telefone</p>
                <p className="text-sm text-neutral-600">
                  {contractor.contacts?.phone || 'Não informado'}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-neutral-500" />
              <div>
                <p className="text-sm font-medium">E-mail</p>
                <p className="text-sm text-neutral-600">
                  {contractor.contacts?.email || 'Não informado'}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-neutral-500" />
              <div>
                <p className="text-sm font-medium">Endereço</p>
                <p className="text-sm text-neutral-600">
                  {contractor.contacts?.address || 'Não informado'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Projects */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Projetos Vinculados</CardTitle>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => setShowAssignDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Vincular a Projeto
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead>Data Fim</TableHead>
                  {canEdit && <TableHead className="w-[100px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((assignment: any) => (
                  <TableRow key={assignment.projectId || assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.project?.name || assignment.projectId}
                    </TableCell>
                    <TableCell>{assignment.role || '-'}</TableCell>
                    <TableCell>
                      {assignment.startDate
                        ? new Date(assignment.startDate).toLocaleDateString(
                            'pt-BR'
                          )
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {assignment.endDate
                        ? new Date(assignment.endDate).toLocaleDateString(
                            'pt-BR'
                          )
                        : '-'}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (
                              confirm(
                                'Tem certeza que deseja desvincular este empreiteiro do projeto?'
                              )
                            ) {
                              unassignMutation.mutate(
                                assignment.projectId || assignment.project?.id
                              )
                            }
                          }}
                        >
                          <Unlink className="mr-1 h-4 w-4" />
                          Desvincular
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-12">
              <FolderOpen className="h-12 w-12 text-neutral-300" />
              <h3 className="mt-4 text-lg font-medium text-neutral-900">
                Nenhum projeto vinculado
              </h3>
              <p className="mt-2 text-sm text-neutral-500">
                Este empreiteiro ainda não está vinculado a nenhum projeto.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {showEditDialog && (
        <ContractorFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          contractor={contractor}
        />
      )}

      {/* Assign to Project Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular a Projeto</DialogTitle>
            <DialogDescription>
              Informe o ID do projeto e os dados de vínculo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="assignProjectId">ID do Projeto *</Label>
              <Input
                id="assignProjectId"
                value={assignProjectId}
                onChange={(e) => setAssignProjectId(e.target.value)}
                placeholder="ID do projeto"
              />
            </div>

            <div>
              <Label htmlFor="assignRole">Função</Label>
              <Input
                id="assignRole"
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value)}
                placeholder="Ex: Pedreiro, Eletricista"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="assignStartDate">Data Início</Label>
                <Input
                  id="assignStartDate"
                  type="date"
                  value={assignStartDate}
                  onChange={(e) => setAssignStartDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="assignEndDate">Data Fim</Label>
                <Input
                  id="assignEndDate"
                  type="date"
                  value={assignEndDate}
                  onChange={(e) => setAssignEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAssignDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={!assignProjectId || assignMutation.isPending}
              onClick={() =>
                assignMutation.mutate({
                  projectId: assignProjectId,
                  role: assignRole,
                  startDate: assignStartDate,
                  endDate: assignEndDate,
                })
              }
            >
              {assignMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
