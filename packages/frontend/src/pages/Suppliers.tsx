import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { suppliersAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SupplierFormDialog } from './suppliers/SupplierFormDialog'
import {
  Plus,
  Search,
  Truck,
  Star,
  ShoppingCart,
  Package,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserX,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import { WorkflowStepper } from '@/components/WorkflowStepper'

const TYPE_LABELS: Record<string, string> = {
  MATERIALS: 'Materiais',
  SERVICES: 'Serviços',
  BOTH: 'Ambos',
}

const TYPE_COLORS: Record<string, string> = {
  MATERIALS: 'bg-blue-100 text-blue-700',
  SERVICES: 'bg-purple-100 text-purple-700',
  BOTH: 'bg-teal-100 text-teal-700',
}

function renderStars(rating: number) {
  const stars = []
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i <= rating
            ? 'fill-amber-400 text-amber-400'
            : 'text-neutral-300'
        }`}
      />
    )
  }
  return stars
}

export function Suppliers() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const phaseParam = searchParams.get('phase')
  const canCreate = usePermission('suppliers:create')

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: [
      'suppliers',
      { page, search, type: typeFilter, isActive: statusFilter },
    ],
    queryFn: () =>
      suppliersAPI.list({
        page,
        limit: 9,
        search: search || undefined,
        type: typeFilter || undefined,
        isActive:
          statusFilter === ''
            ? undefined
            : statusFilter === 'true',
      }),
  })

  const suppliers = data?.data || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }

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
          <h1 className="text-2xl font-bold text-neutral-900">Fornecedores</h1>
          <p className="mt-1 text-neutral-600">
            Gerencie os fornecedores cadastrados
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Fornecedor
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Buscar por nome ou CNPJ..."
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
          value={typeFilter || 'ALL'}
          onValueChange={(value) => {
            setTypeFilter(value === 'ALL' ? '' : value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os tipos</SelectItem>
            <SelectItem value="MATERIALS">Materiais</SelectItem>
            <SelectItem value="SERVICES">Serviços</SelectItem>
            <SelectItem value="BOTH">Ambos</SelectItem>
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
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="true">Ativo</SelectItem>
            <SelectItem value="false">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-16">
          <UserX className="h-16 w-16 text-neutral-300" />
          <h3 className="mt-4 text-xl font-medium text-neutral-900">
            {search || typeFilter || statusFilter
              ? 'Nenhum fornecedor encontrado'
              : 'Nenhum fornecedor cadastrado'}
          </h3>
          <p className="mt-2 text-neutral-500">
            {search || typeFilter || statusFilter
              ? 'Tente ajustar os filtros de busca.'
              : 'Comece cadastrando seu primeiro fornecedor.'}
          </p>
          {canCreate && !search && !typeFilter && !statusFilter && (
            <Button className="mt-6" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Primeiro Fornecedor
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Supplier Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((supplier: any) => (
              <Card
                key={supplier.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(`/suppliers/${supplier.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base line-clamp-1">
                        {supplier.name}
                      </CardTitle>
                    </div>
                    <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
                      {supplier.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-neutral-500">
                    {supplier.document}
                  </p>

                  {/* Type badge */}
                  <Badge variant="outline" className={TYPE_COLORS[supplier.type]}>
                    {TYPE_LABELS[supplier.type]}
                  </Badge>

                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    {renderStars(supplier.rating || 0)}
                    <span className="ml-1 text-sm text-neutral-500">
                      ({supplier.rating || 0}/5)
                    </span>
                  </div>

                  {/* Counts */}
                  <div className="flex items-center gap-4 text-sm text-neutral-500">
                    <div className="flex items-center gap-1">
                      <ShoppingCart className="h-3.5 w-3.5" />
                      <span>{supplier._count?.purchaseOrders || 0} pedidos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" />
                      <span>{supplier._count?.materials || 0} materiais</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                Mostrando {suppliers.length} de {pagination.total} fornecedores
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
      <SupplierFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  )
}
