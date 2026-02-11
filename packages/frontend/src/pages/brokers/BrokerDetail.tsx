import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { brokersAPI, projectsAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BrokerFormDialog } from './BrokerFormDialog'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Briefcase,
  Percent,
  Loader2,
  Building2,
} from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponível',
  RESERVED: 'Reservada',
  SOLD: 'Vendida',
  BLOCKED: 'Bloqueada',
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'default',
  RESERVED: 'secondary',
  SOLD: 'destructive',
  BLOCKED: 'outline',
}

export function BrokerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canEdit = usePermission('brokers:edit')
  const canDelete = usePermission('brokers:delete')

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [unitStatusFilter, setUnitStatusFilter] = useState<string>('')

  const { data: broker, isLoading } = useQuery({
    queryKey: ['broker', id],
    queryFn: () => brokersAPI.getById(id!),
    enabled: !!id,
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects', { limit: 100 }],
    queryFn: () => projectsAPI.list({ limit: 100 }),
  })

  const { data: unitsData } = useQuery({
    queryKey: ['broker-units', selectedProjectId, unitStatusFilter],
    queryFn: () =>
      projectsAPI.listUnits(selectedProjectId, {
        limit: 100,
        status: unitStatusFilter || undefined,
      }),
    enabled: !!selectedProjectId,
  })

  const deleteMutation = useMutation({
    mutationFn: () => brokersAPI.delete(id!),
    onSuccess: (data: any) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['brokers'] })
      navigate('/brokers')
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

  if (!broker) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h2 className="text-xl font-bold">Corretor não encontrado</h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/brokers')}
        >
          Voltar para Corretores
        </Button>
      </div>
    )
  }

  const projects = projectsData?.data || []
  const units = unitsData?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/brokers')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-900">
                {broker.name}
              </h1>
              <Badge variant={broker.isActive ? 'default' : 'secondary'}>
                {broker.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="mt-1 text-neutral-600">CPF: {broker.document}</p>
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
                    confirm('Tem certeza que deseja excluir este corretor?')
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

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="units">Unidades</TabsTrigger>
        </TabsList>

        {/* Tab: Info */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Broker Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Informações do Corretor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Briefcase className="mt-0.5 h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium">CRECI</p>
                    <p className="text-sm text-neutral-600">
                      {broker.creci || 'Não informado'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <Percent className="mt-0.5 h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium">Taxa de Comissão</p>
                    <p className="text-sm text-neutral-600">
                      {broker.commissionRate}%
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium">CPF</p>
                    <p className="text-sm text-neutral-600">
                      {broker.document}
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
                      {broker.contacts?.phone || 'Não informado'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium">E-mail</p>
                    <p className="text-sm text-neutral-600">
                      {broker.contacts?.email || 'Não informado'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium">Endereço</p>
                    <p className="text-sm text-neutral-600">
                      {broker.contacts?.address || 'Não informado'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Units */}
        <TabsContent value="units" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Selecione um projeto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={unitStatusFilter}
              onValueChange={(value) =>
                setUnitStatusFilter(value === 'ALL' ? '' : value)
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status da unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="AVAILABLE">Disponível</SelectItem>
                <SelectItem value="RESERVED">Reservada</SelectItem>
                <SelectItem value="SOLD">Vendida</SelectItem>
                <SelectItem value="BLOCKED">Bloqueada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!selectedProjectId ? (
            <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-12">
              <Building2 className="h-12 w-12 text-neutral-300" />
              <h3 className="mt-4 text-lg font-medium text-neutral-900">
                Selecione um projeto
              </h3>
              <p className="mt-2 text-sm text-neutral-500">
                Escolha um projeto para visualizar as unidades disponíveis.
              </p>
            </div>
          ) : units.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-12">
              <Building2 className="h-12 w-12 text-neutral-300" />
              <h3 className="mt-4 text-lg font-medium text-neutral-900">
                Nenhuma unidade encontrada
              </h3>
              <p className="mt-2 text-sm text-neutral-500">
                Não há unidades neste projeto com os filtros selecionados.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Área (m²)</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit: any) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.code}</TableCell>
                    <TableCell>{unit.type}</TableCell>
                    <TableCell>{Number(unit.area).toFixed(2)}</TableCell>
                    <TableCell>
                      {Number(unit.price).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[unit.status] as any}>
                        {STATUS_LABELS[unit.status] || unit.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {showEditDialog && (
        <BrokerFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          broker={broker}
        />
      )}
    </div>
  )
}
