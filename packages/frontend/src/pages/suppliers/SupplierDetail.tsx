import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { suppliersAPI, financialAPI } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { SupplierFormDialog } from './SupplierFormDialog'
import { MaterialFormDialog } from './MaterialFormDialog'
import { LinkMaterialDialog } from './LinkMaterialDialog'
import { PurchaseOrderFormDialog } from './PurchaseOrderFormDialog'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Star,
  Phone,
  Mail,
  MapPin,
  User,
  Truck,
  Package,
  ShoppingCart,
  Loader2,
  Plus,
  Unlink,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  Clock,
} from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  MATERIALS: 'Materiais',
  SERVICES: 'Serviços',
  BOTH: 'Ambos',
}

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

const NEXT_STATUS: Record<string, string | null> = {
  PENDING: 'APPROVED',
  APPROVED: 'ORDERED',
  ORDERED: 'DELIVERED',
  DELIVERED: null,
  CANCELLED: null,
}

const NEXT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Aprovar',
  APPROVED: 'Marcar como Pedido',
  ORDERED: 'Marcar como Entregue',
}

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

export function SupplierDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canEdit = usePermission('suppliers:edit')
  const canDelete = usePermission('suppliers:delete')
  const canCreatePO = usePermission('purchases:create')
  const canEditPO = usePermission('purchases:edit')

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showMaterialDialog, setShowMaterialDialog] = useState(false)
  const [showLinkMaterialDialog, setShowLinkMaterialDialog] = useState(false)
  const [showPODialog, setShowPODialog] = useState(false)
  const [expandedPO, setExpandedPO] = useState<string | null>(null)
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    orderId: string
    newStatus: string
    orderNumber: string
  } | null>(null)
  const [createExpense, setCreateExpense] = useState(true)
  const [bankAccountId, setBankAccountId] = useState('')

  // Queries
  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => suppliersAPI.getById(id!),
    enabled: !!id,
  })

  const { data: supplierMaterials } = useQuery({
    queryKey: ['supplier-materials', id],
    queryFn: () => suppliersAPI.listSupplierMaterials(id!),
    enabled: !!id,
  })

  const { data: purchaseOrdersData } = useQuery({
    queryKey: ['supplier-purchase-orders', id],
    queryFn: () => suppliersAPI.listPurchaseOrders({ supplierId: id, limit: 50 }),
    enabled: !!id,
  })

  const { data: financialSummary } = useQuery({
    queryKey: ['supplier-financial', id],
    queryFn: () => suppliersAPI.getFinancialSummary(id!),
    enabled: !!id,
  })

  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => financialAPI.listAccounts(),
    enabled: !!statusChangeDialog && statusChangeDialog.newStatus === 'DELIVERED',
  })

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: () => suppliersAPI.delete(id!),
    onSuccess: (data: any) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      navigate('/suppliers')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const unlinkMaterialMutation = useMutation({
    mutationFn: (materialId: string) => suppliersAPI.unlinkMaterial(id!, materialId),
    onSuccess: () => {
      toast.success('Material desvinculado!')
      queryClient.invalidateQueries({ queryKey: ['supplier-materials', id] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status, createExp, bankAccId }: {
      orderId: string
      status: string
      createExp?: boolean
      bankAccId?: string
    }) =>
      suppliersAPI.updatePurchaseOrderStatus(orderId, {
        status,
        createExpense: createExp,
        bankAccountId: bankAccId || undefined,
      }),
    onSuccess: () => {
      toast.success('Status do pedido atualizado!')
      queryClient.invalidateQueries({ queryKey: ['supplier-purchase-orders', id] })
      queryClient.invalidateQueries({ queryKey: ['supplier-financial', id] })
      setStatusChangeDialog(null)
      setCreateExpense(true)
      setBankAccountId('')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const cancelPOMutation = useMutation({
    mutationFn: (orderId: string) =>
      suppliersAPI.updatePurchaseOrderStatus(orderId, { status: 'CANCELLED' }),
    onSuccess: () => {
      toast.success('Pedido cancelado!')
      queryClient.invalidateQueries({ queryKey: ['supplier-purchase-orders', id] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deletePOMutation = useMutation({
    mutationFn: (orderId: string) => suppliersAPI.deletePurchaseOrder(orderId),
    onSuccess: () => {
      toast.success('Pedido excluído!')
      queryClient.invalidateQueries({ queryKey: ['supplier-purchase-orders', id] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="text-center py-24">
        <p className="text-neutral-500">Fornecedor não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/suppliers')}>
          Voltar
        </Button>
      </div>
    )
  }

  const purchaseOrders = purchaseOrdersData?.data || []
  const materials = supplierMaterials || []

  const handleStatusChange = (orderId: string, newStatus: string, orderNumber: string) => {
    if (newStatus === 'DELIVERED') {
      setStatusChangeDialog({ orderId, newStatus, orderNumber })
    } else {
      statusMutation.mutate({ orderId, status: newStatus })
    }
  }

  const confirmStatusChange = () => {
    if (!statusChangeDialog) return
    statusMutation.mutate({
      orderId: statusChangeDialog.orderId,
      status: statusChangeDialog.newStatus,
      createExp: createExpense,
      bankAccId: bankAccountId,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/suppliers')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-neutral-900">{supplier.name}</h1>
              <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
                {supplier.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="mt-1 text-neutral-500">{supplier.document}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" onClick={() => setShowEditDialog(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              className="text-destructive border-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm('Tem certeza que deseja excluir/desativar este fornecedor?')) {
                  deleteMutation.mutate()
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="materials">Materiais</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
        </TabsList>

        {/* ==================== TAB: Informações ==================== */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic info card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados Básicos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Truck className="h-4 w-4 text-neutral-400" />
                  <div>
                    <p className="text-sm text-neutral-500">Tipo</p>
                    <p className="font-medium">{TYPE_LABELS[supplier.type]}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Star className="h-4 w-4 text-neutral-400" />
                  <div>
                    <p className="text-sm text-neutral-500">Avaliação</p>
                    <div className="flex items-center gap-1">
                      {renderStars(supplier.rating || 0)}
                      <span className="ml-1 text-sm">({supplier.rating || 0}/5)</span>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-4 w-4 text-neutral-400" />
                  <div>
                    <p className="text-sm text-neutral-500">Pedidos de Compra</p>
                    <p className="font-medium">{supplier._count?.purchaseOrders || 0}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-neutral-400" />
                  <div>
                    <p className="text-sm text-neutral-500">Materiais Vinculados</p>
                    <p className="font-medium">{supplier._count?.materials || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contacts card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {supplier.contacts?.contactPerson && (
                  <>
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-neutral-400" />
                      <div>
                        <p className="text-sm text-neutral-500">Pessoa de Contato</p>
                        <p className="font-medium">{supplier.contacts.contactPerson}</p>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}
                {supplier.contacts?.phone && (
                  <>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-neutral-400" />
                      <div>
                        <p className="text-sm text-neutral-500">Telefone</p>
                        <p className="font-medium">{supplier.contacts.phone}</p>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}
                {supplier.contacts?.email && (
                  <>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-neutral-400" />
                      <div>
                        <p className="text-sm text-neutral-500">E-mail</p>
                        <p className="font-medium">{supplier.contacts.email}</p>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}
                {supplier.contacts?.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">Endereço</p>
                      <p className="font-medium">{supplier.contacts.address}</p>
                    </div>
                  </div>
                )}
                {!supplier.contacts?.phone && !supplier.contacts?.email && !supplier.contacts?.address && !supplier.contacts?.contactPerson && (
                  <p className="text-sm text-neutral-400">Nenhum contato informado</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== TAB: Materiais ==================== */}
        <TabsContent value="materials" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Materiais do Fornecedor</h3>
            {canEdit && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowMaterialDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Material
                </Button>
                <Button onClick={() => setShowLinkMaterialDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Vincular Material
                </Button>
              </div>
            )}
          </div>

          {materials.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-neutral-50">
              <Package className="mx-auto h-12 w-12 text-neutral-300" />
              <p className="mt-4 text-neutral-500">Nenhum material vinculado</p>
              {canEdit && (
                <Button className="mt-4" variant="outline" onClick={() => setShowLinkMaterialDialog(true)}>
                  Vincular Primeiro Material
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Preço Fornecedor</TableHead>
                  <TableHead className="text-right">Preço Catálogo</TableHead>
                  {canEdit && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((link: any) => {
                  const diff = link.price - link.material.currentPrice
                  const diffPercent = link.material.currentPrice > 0
                    ? ((diff / link.material.currentPrice) * 100).toFixed(1)
                    : '0'
                  return (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium">{link.material.name}</TableCell>
                      <TableCell>{link.material.category}</TableCell>
                      <TableCell>{link.material.unit}</TableCell>
                      <TableCell className="text-right">R$ {link.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        R$ {link.material.currentPrice.toFixed(2)}
                        {diff !== 0 && (
                          <span className={`ml-1 text-xs ${diff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            ({diff > 0 ? '+' : ''}{diffPercent}%)
                          </span>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => {
                              if (confirm('Desvincular este material?')) {
                                unlinkMaterialMutation.mutate(link.material.id)
                              }
                            }}
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* ==================== TAB: Pedidos ==================== */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Pedidos de Compra</h3>
            {canCreatePO && (
              <Button onClick={() => setShowPODialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Pedido
              </Button>
            )}
          </div>

          {purchaseOrders.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-neutral-50">
              <ShoppingCart className="mx-auto h-12 w-12 text-neutral-300" />
              <p className="mt-4 text-neutral-500">Nenhum pedido de compra</p>
              {canCreatePO && (
                <Button className="mt-4" variant="outline" onClick={() => setShowPODialog(true)}>
                  Criar Primeiro Pedido
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {purchaseOrders.map((order: any) => (
                <Card key={order.id}>
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => setExpandedPO(expandedPO === order.id ? null : order.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-neutral-500">{order.project?.name}</p>
                      </div>
                      <Badge variant="outline" className={STATUS_COLORS[order.status]}>
                        {STATUS_LABELS[order.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">R$ {order.totalAmount.toFixed(2)}</p>
                        <p className="text-xs text-neutral-500">
                          {new Date(order.orderDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      {expandedPO === order.id ? (
                        <ChevronUp className="h-4 w-4 text-neutral-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-neutral-400" />
                      )}
                    </div>
                  </div>

                  {expandedPO === order.id && (
                    <div className="border-t px-4 pb-4 pt-3 space-y-3">
                      {/* Load full order details */}
                      <PurchaseOrderDetails
                        orderId={order.id}
                        status={order.status}
                        orderNumber={order.orderNumber}
                        canEdit={canEditPO}
                        onStatusChange={handleStatusChange}
                        onCancel={(orderId) => {
                          if (confirm('Cancelar este pedido?')) {
                            cancelPOMutation.mutate(orderId)
                          }
                        }}
                        onDelete={(orderId) => {
                          if (confirm('Excluir este pedido?')) {
                            deletePOMutation.mutate(orderId)
                          }
                        }}
                      />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ==================== TAB: Financeiro ==================== */}
        <TabsContent value="financial" className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-red-100 p-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Total Gasto</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      R$ {(financialSummary?.totalGasto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-100 p-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Pedidos Pendentes</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      R$ {(financialSummary?.pedidosPendentes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transações Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {!financialSummary?.transacoesRecentes?.length ? (
                <p className="text-sm text-neutral-400 py-4 text-center">
                  Nenhuma transação vinculada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialSummary.transacoesRecentes.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell>{tx.project?.name || '-'}</TableCell>
                        <TableCell>
                          {new Date(tx.date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showEditDialog && (
        <SupplierFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          supplier={supplier}
        />
      )}

      <MaterialFormDialog
        open={showMaterialDialog}
        onOpenChange={setShowMaterialDialog}
      />

      {id && (
        <LinkMaterialDialog
          open={showLinkMaterialDialog}
          onOpenChange={setShowLinkMaterialDialog}
          supplierId={id}
        />
      )}

      {id && (
        <PurchaseOrderFormDialog
          open={showPODialog}
          onOpenChange={setShowPODialog}
          supplierId={id}
        />
      )}

      {/* Status change confirmation dialog (for DELIVERED) */}
      <Dialog
        open={!!statusChangeDialog}
        onOpenChange={() => {
          setStatusChangeDialog(null)
          setCreateExpense(true)
          setBankAccountId('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Entrega</DialogTitle>
            <DialogDescription>
              Marcar o pedido {statusChangeDialog?.orderNumber} como entregue?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createExpense"
                checked={createExpense}
                onChange={(e) => setCreateExpense(e.target.checked)}
              />
              <label htmlFor="createExpense" className="text-sm font-medium cursor-pointer">
                Criar despesa no financeiro
              </label>
            </div>
            {createExpense && (
              <div>
                <label className="text-sm text-neutral-600">Conta bancária (opcional)</label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {(bankAccounts || []).map((acc: any) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} - {acc.bankName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusChangeDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmStatusChange} disabled={statusMutation.isPending}>
              {statusMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Sub-component: Purchase order expanded details
function PurchaseOrderDetails({
  orderId,
  status,
  orderNumber,
  canEdit,
  onStatusChange,
  onCancel,
  onDelete,
}: {
  orderId: string
  status: string
  orderNumber: string
  canEdit: boolean
  onStatusChange: (orderId: string, newStatus: string, orderNumber: string) => void
  onCancel: (orderId: string) => void
  onDelete: (orderId: string) => void
}) {
  const { data: orderDetail } = useQuery({
    queryKey: ['purchase-order', orderId],
    queryFn: () => suppliersAPI.getPurchaseOrder(orderId),
  })

  if (!orderDetail) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    )
  }

  const nextStatus = NEXT_STATUS[status]
  const isFinal = status === 'DELIVERED' || status === 'CANCELLED'

  return (
    <div className="space-y-3">
      {orderDetail.notes && (
        <p className="text-sm text-neutral-600">
          <span className="font-medium">Obs:</span> {orderDetail.notes}
        </p>
      )}

      {orderDetail.deliveryDate && (
        <p className="text-sm text-neutral-600">
          <span className="font-medium">Previsão de entrega:</span>{' '}
          {new Date(orderDetail.deliveryDate).toLocaleDateString('pt-BR')}
        </p>
      )}

      {/* Items table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Material</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Preço Unit.</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orderDetail.items?.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell>{item.material?.name}</TableCell>
              <TableCell>{item.material?.category}</TableCell>
              <TableCell className="text-right">{item.quantity} {item.material?.unit}</TableCell>
              <TableCell className="text-right">R$ {item.unitPrice.toFixed(2)}</TableCell>
              <TableCell className="text-right font-medium">R$ {item.totalPrice.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Actions */}
      {canEdit && !isFinal && (
        <div className="flex gap-2 justify-end pt-2">
          {nextStatus && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onStatusChange(orderId, nextStatus, orderNumber)
              }}
            >
              {NEXT_STATUS_LABEL[status]}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation()
              onCancel(orderId)
            }}
          >
            Cancelar Pedido
          </Button>
          {status === 'PENDING' && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(orderId)
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
