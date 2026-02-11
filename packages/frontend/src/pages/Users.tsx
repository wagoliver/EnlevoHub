import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  UserPlus,
  Check,
  X,
  Shield,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usersAPI } from '@/lib/api-client'
import { Role } from '@/stores/auth.store'
import { usePermission } from '@/hooks/usePermission'

const ROLE_LABELS: Record<Role, string> = {
  ROOT: 'Root',
  MASTER: 'Gestor',
  ENGINEER: 'Engenheiro',
  ADMIN_STAFF: 'Administrativo',
  CONTRACTOR: 'Empreiteiro',
  VIEWER: 'Visualizador',
}

const ROLE_COLORS: Record<Role, string> = {
  ROOT: 'bg-red-100 text-red-700',
  MASTER: 'bg-purple-100 text-purple-700',
  ENGINEER: 'bg-blue-100 text-blue-700',
  ADMIN_STAFF: 'bg-amber-100 text-amber-700',
  CONTRACTOR: 'bg-green-100 text-green-700',
  VIEWER: 'bg-neutral-100 text-neutral-700',
}

interface UserData {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
  isApproved: boolean
  contractorId?: string | null
  createdAt: string
  contractor?: {
    id: string
    name: string
    document: string
    specialty: string[]
  } | null
}

export function Users() {
  const queryClient = useQueryClient()
  const canManageUsers = usePermission('users:create')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'VIEWER' as 'ROOT' | 'MASTER' | 'ENGINEER' | 'ADMIN_STAFF' | 'VIEWER',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.list() as Promise<{ data: UserData[] }>,
  })

  const approveMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.approve(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuário aprovado com sucesso')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const rejectMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.reject(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuário rejeitado')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof createForm) => usersAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuário criado com sucesso')
      setShowCreateDialog(false)
      setCreateForm({ name: '', email: '', password: '', role: 'VIEWER' })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const users = data?.data || []
  const pendingUsers = users.filter(u => !u.isApproved)
  const activeUsers = users.filter(u => u.isApproved)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(createForm)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Usuários</h1>
          <p className="text-sm text-neutral-500">
            Gerencie os usuários do sistema
          </p>
        </div>
        {canManageUsers && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        )}
      </div>

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-lg font-semibold text-amber-800 mb-3">
            Pendentes de Aprovação ({pendingUsers.length})
          </h2>
          <div className="space-y-3">
            {pendingUsers.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium text-neutral-900">{user.name}</p>
                  <p className="text-sm text-neutral-500">{user.email}</p>
                  {user.contractor && (
                    <p className="text-xs text-neutral-400 mt-1">
                      CPF/CNPJ: {user.contractor.document} | Especialidades: {user.contractor.specialty.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                    Pendente
                  </span>
                  {canManageUsers && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() => approveMutation.mutate(user.id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => rejectMutation.mutate(user.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Rejeitar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Users Table */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600">Nome</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600">Papel</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {activeUsers.map(user => (
                <tr key={user.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.role === 'ROOT' && <Shield className="h-4 w-4 text-red-500" />}
                      <span className="text-sm font-medium text-neutral-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      user.isActive ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nome completo"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input
                type="password"
                value={createForm.password}
                onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 caracteres"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Papel</Label>
              <Select
                value={createForm.role}
                onValueChange={(val) => setCreateForm(f => ({ ...f, role: val as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROOT">Root (Admin Total)</SelectItem>
                  <SelectItem value="MASTER">Gestor</SelectItem>
                  <SelectItem value="ENGINEER">Engenheiro</SelectItem>
                  <SelectItem value="ADMIN_STAFF">Administrativo</SelectItem>
                  <SelectItem value="VIEWER">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Criar Usuário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
