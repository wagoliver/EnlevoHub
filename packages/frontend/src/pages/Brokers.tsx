import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { brokersAPI } from '@/lib/api-client'
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
import { BrokerFormDialog } from './brokers/BrokerFormDialog'
import {
  Plus,
  Search,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserX,
  Percent,
  ShoppingBag,
} from 'lucide-react'

export function Brokers() {
  const navigate = useNavigate()
  const canCreate = usePermission('brokers:create')

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['brokers', { page, search, isActive: statusFilter }],
    queryFn: () =>
      brokersAPI.list({
        page,
        limit: 9,
        search: search || undefined,
        isActive: statusFilter === '' ? undefined : statusFilter === 'true',
      }),
  })

  const brokers = data?.data || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Corretores</h1>
          <p className="mt-1 text-neutral-600">
            Gerencie os corretores cadastrados
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Corretor
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Buscar por nome ou CPF..."
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
          value={statusFilter}
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
      ) : brokers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-16">
          <UserX className="h-16 w-16 text-neutral-300" />
          <h3 className="mt-4 text-xl font-medium text-neutral-900">
            {search || statusFilter
              ? 'Nenhum corretor encontrado'
              : 'Nenhum corretor cadastrado'}
          </h3>
          <p className="mt-2 text-neutral-500">
            {search || statusFilter
              ? 'Tente ajustar os filtros de busca.'
              : 'Comece cadastrando seu primeiro corretor.'}
          </p>
          {canCreate && !search && !statusFilter && (
            <Button className="mt-6" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Primeiro Corretor
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Broker Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {brokers.map((broker: any) => (
              <Card
                key={broker.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(`/brokers/${broker.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base line-clamp-1">
                        {broker.name}
                      </CardTitle>
                    </div>
                    <Badge variant={broker.isActive ? 'default' : 'secondary'}>
                      {broker.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-neutral-500">
                    CPF: {broker.document}
                  </p>

                  {broker.creci && (
                    <p className="text-sm text-neutral-500">
                      CRECI: {broker.creci}
                    </p>
                  )}

                  {/* Commission Rate */}
                  <div className="flex items-center gap-1 text-sm text-neutral-600">
                    <Percent className="h-3.5 w-3.5" />
                    <span>Comissão: {broker.commissionRate}%</span>
                  </div>

                  {/* Sales count */}
                  <div className="flex items-center gap-1 text-sm text-neutral-500">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>{broker._count?.sales || 0} venda(s)</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                Mostrando {brokers.length} de {pagination.total} corretores
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
                  Pr&#243;ximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Dialog */}
      <BrokerFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  )
}
