import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { projectsAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MeasurementFormDialog } from './MeasurementFormDialog'
import {
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Ruler,
  Check,
  X,
} from 'lucide-react'

const statusVariant: Record<string, any> = {
  PENDING: 'reserved',
  APPROVED: 'completed',
  REJECTED: 'destructive',
}

const statusLabel: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
}

interface MeasurementsTabProps {
  projectId: string
}

export function MeasurementsTab({ projectId }: MeasurementsTabProps) {
  const queryClient = useQueryClient()
  const canReview = usePermission('measurements:approve')

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean
    measurementId: string | null
  }>({ open: false, measurementId: null })
  const [rejectNotes, setRejectNotes] = useState('')
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean
    measurementId: string | null
  }>({ open: false, measurementId: null })

  const { data, isLoading } = useQuery({
    queryKey: [
      'project-measurements',
      projectId,
      { page, status: statusFilter },
    ],
    queryFn: () =>
      projectsAPI.listMeasurements(projectId, {
        page,
        limit: 10,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      }),
  })

  const measurements = data?.data || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }

  const approveMutation = useMutation({
    mutationFn: (measurementId: string) =>
      projectsAPI.reviewMeasurement(projectId, measurementId, {
        status: 'APPROVED',
      }),
    onSuccess: () => {
      toast.success('Medição aprovada!')
      queryClient.invalidateQueries({ queryKey: ['project-measurements', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-stats', projectId] })
      setApproveDialog({ open: false, measurementId: null })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao aprovar medição')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({
      measurementId,
      reviewNotes,
    }: {
      measurementId: string
      reviewNotes?: string
    }) =>
      projectsAPI.reviewMeasurement(projectId, measurementId, {
        status: 'REJECTED',
        reviewNotes: reviewNotes || undefined,
      }),
    onSuccess: () => {
      toast.success('Medição rejeitada.')
      queryClient.invalidateQueries({ queryKey: ['project-measurements', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-stats', projectId] })
      setRejectDialog({ open: false, measurementId: null })
      setRejectNotes('')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao rejeitar medição')
    },
  })

  const handleApprove = (measurementId: string) => {
    setApproveDialog({ open: true, measurementId })
  }

  const confirmApprove = () => {
    if (approveDialog.measurementId) {
      approveMutation.mutate(approveDialog.measurementId)
    }
  }

  const handleReject = (measurementId: string) => {
    setRejectDialog({ open: true, measurementId })
    setRejectNotes('')
  }

  const confirmReject = () => {
    if (rejectDialog.measurementId) {
      rejectMutation.mutate({
        measurementId: rejectDialog.measurementId,
        reviewNotes: rejectNotes,
      })
    }
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-neutral-900">Medições</h3>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="APPROVED">Aprovada</SelectItem>
              <SelectItem value="REJECTED">Rejeitada</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Medição
          </Button>
        </div>
      </div>

      {/* Measurements Table */}
      {measurements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-12">
          <Ruler className="h-12 w-12 text-neutral-300" />
          <h3 className="mt-4 text-lg font-medium text-neutral-900">
            Nenhuma medição encontrada
          </h3>
          <p className="mt-2 text-sm text-neutral-500">
            {statusFilter !== 'ALL'
              ? 'Nenhuma medição com este filtro. Tente outro status.'
              : 'Registre medições através da aba de atividades ou clique em "Nova Medição".'}
          </p>
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atividade</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Empreiteiro</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    {canReview && <TableHead>Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {measurements.map((measurement: any) => (
                    <TableRow key={measurement.id}>
                      <TableCell className="font-medium">
                        {measurement.activity?.name ||
                          measurement.unitActivity?.activity?.name ||
                          '-'}
                      </TableCell>
                      <TableCell>
                        {measurement.unitActivity?.unit?.code || 'Geral'}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {measurement.previousProgress != null
                            ? `${measurement.previousProgress}%`
                            : '0%'}
                          <span className="mx-1 text-neutral-400">&rarr;</span>
                          <span className="font-medium">
                            {measurement.progress}%
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {measurement.contractor?.name || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {measurement.reporter?.name ||
                          measurement.user?.name ||
                          '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[measurement.status]}>
                          {statusLabel[measurement.status] || measurement.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-neutral-500">
                        {measurement.createdAt
                          ? format(
                              new Date(measurement.createdAt),
                              'dd/MM/yyyy'
                            )
                          : '-'}
                      </TableCell>
                      {canReview && (
                        <TableCell>
                          {measurement.status === 'PENDING' && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleApprove(measurement.id)}
                                title="Aprovar"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleReject(measurement.id)}
                                title="Rejeitar"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
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
                Mostrando {measurements.length} de {pagination.total} medições
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

      {/* Create Measurement Dialog */}
      <MeasurementFormDialog
        projectId={projectId}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Approve Confirmation Dialog */}
      <Dialog
        open={approveDialog.open}
        onOpenChange={(open) =>
          setApproveDialog({ open, measurementId: open ? approveDialog.measurementId : null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Medição</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            Tem certeza que deseja aprovar esta medição? O progresso da atividade
            será atualizado.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setApproveDialog({ open: false, measurementId: null })
              }
            >
              Cancelar
            </Button>
            <Button
              disabled={approveMutation.isPending}
              onClick={confirmApprove}
            >
              {approveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => {
          setRejectDialog({
            open,
            measurementId: open ? rejectDialog.measurementId : null,
          })
          if (!open) setRejectNotes('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Medição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Descreva o motivo da rejeição (opcional):
            </p>
            <div>
              <Label htmlFor="reject-notes">Observações</Label>
              <Textarea
                id="reject-notes"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Motivo da rejeição..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog({ open: false, measurementId: null })
                setRejectNotes('')
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={confirmReject}
            >
              {rejectMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
