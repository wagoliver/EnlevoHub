import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { suppliersAPI, projectsAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { PurchaseOrderFormDialog } from './suppliers/PurchaseOrderFormDialog'
import {
  Plus,
  Search,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import { WorkflowStepper } from '@/components/WorkflowStepper'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  ORDERED: 'Pedido Feito',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  ORDERED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export function PurchaseOrders() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const phaseParam = searchParams.get('phase')
  const canCreate = usePermission('purchases:create')

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: [
      'purchase-orders',
      { page, search, status: statusFilter, projectId: projectFilter, supplierId: supplierFilter },
    ],
    queryFn: () =>
      suppliersAPI.listPurchaseOrders({
        page,
        limit: 15,
        search: search || undefined,
        status: statusFilter || undefined,
        projectId: projectFilter || undefined,
        supplierId: supplierFilter || undefined,
      }),
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects', { limit: 100 }],
    queryFn: () => projectsAPI.list({ limit: 100 }),
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', { limit: 100 }],
    queryFn: () => suppliersAPI.list({ limit: 100 }),
  })

  const orders = data?.data || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }
  const projects = projectsData?.data || []
  const suppliers = suppliersData?.data || []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Workflow Stepper */}
      {phaseParam ? (
        <WorkflowStepper phase={parseInt(phaseParam, 10)} />
      ) : (
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Compras</h1>
          <p className="mt-1 text-neutral-600">
            Gerencie todos os pedidos de compra
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row flex-wrap">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Buscar por número do pedido..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>

        <Select
          value={projectFilter || 'ALL'}
          onValueChange={(value) => {
            setProjectFilter(value === 'ALL' ? '' : value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os projetos</SelectItem>
            {projects.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={supplierFilter || 'ALL'}
          onValueChange={(value) => {
            setSupplierFilter(value === 'ALL' ? '' : value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Fornecedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os fornecedores</SelectItem>
            {suppliers.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter || 'ALL'}
          onValueChange={(value) => {
            setStatusFilter(value === 'ALL' ? '' : value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-16">
          <ShoppingCart className="h-16 w-16 text-neutral-300" />
          <h3 className="mt-4 text-xl font-medium text-neutral-900">
            {search || statusFilter || projectFilter || supplierFilter
              ? 'Nenhum pedido encontrado'
              : 'Nenhum pedido de compra'}
          </h3>
          <p className="mt-2 text-neutral-500">
            {search || statusFilter || projectFilter || supplierFilter
              ? 'Tente ajustar os filtros de busca.'
              : 'Comece criando seu primeiro pedido de compra.'}
          </p>
          {canCreate && !search && !statusFilter && !projectFilter && !supplierFilter && (
            <Button className="mt-6" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Pedido
            </Button>
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: any) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-neutral-50"
                  onClick={() => navigate(`/suppliers/${order.supplierId}`)}
                >
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.supplier?.name}</TableCell>
                  <TableCell>{order.project?.name}</TableCell>
                  <TableCell>
                    {new Date(order.orderDate).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[order.status]}>
                      {STATUS_LABELS[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {order.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                Mostrando {orders.length} de {pagination.total} pedidos
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

      {/* Concluir button */}
      {phaseParam && (
        <div className="flex items-center justify-end pt-4 pb-2">
          <Button
            size="lg"
            className="gap-2 text-white font-semibold shadow-md"
            style={{
              background: 'linear-gradient(135deg, #b8a378, #9a8a6a)',
            }}
            onClick={() => {
              const nextPhase = parseInt(phaseParam, 10) + 1
              navigate(nextPhase <= 8 ? `/?phase=${nextPhase}` : '/')
            }}
          >
            <CheckCircle2 className="h-5 w-5" />
            Concluir Etapa
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <PurchaseOrderFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  )
}
